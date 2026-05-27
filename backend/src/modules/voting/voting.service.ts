import { v4 as uuidv4 } from "uuid";
import { votingRepository } from "./voting.repository";
import { voterRepository } from "../voter/voter.repository";
import { electionRepository } from "../election/election.repository";
import { candidateRepository } from "../candidate/candidate.repository";
import { prisma } from "../../configs/database";
import { sha256, generateSecureToken, hmac } from "../../utils/crypto";
import { env } from "../../configs/env";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../../errors/AppError";
import { auditService } from "../audit/audit.service";
import { socketEmit } from "../../configs/socket";
import type { CastVoteDto, VerifyAccessDto } from "./voting.schema";

export const votingService = {
  async getActiveBallot() {
    const election = await electionRepository.findCurrentVotingOpen();
    if (!election) throw new NotFoundError("Election");

    const candidates = Array.isArray((election as any).candidates)
      ? (election as any).candidates
      : [];

    return {
      election: {
        id: election.id,
        title: election.title,
        status: election.status,
        type: election.type,
        isNational: election.isNational,
        maxVotesPerVoter: election.maxVotesPerVoter,
      },
      candidates,
    };
  },

  // ── Issue a system-generated token for a newly registered voter ───────────
  async issueSystemToken(voterId: string, ip: string) {
    const election =
      (await electionRepository.findCurrentForRegistration()) ??
      (await electionRepository.findCurrentVotingOpen());
    if (!election) return null;

    const voter = await voterRepository.findById(voterId);
    if (!voter) throw new NotFoundError("Voter");
    if (!(voter as any).isVerified)
      throw new ForbiddenError("Voter is not verified");

    const existing = await votingRepository.findToken(election.id, voterId);
    if (existing) {
      return null;
    }

    const rawToken = generateSecureToken(48);
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    await votingRepository.createToken({
      id: uuidv4(),
      electionId: election.id,
      voterId,
      tokenHash,
      expiresAt,
      ipAddress: ip,
    });

    await auditService.log({
      userId: voterId,
      action: "TOKEN_ISSUED",
      entity: "VotingToken",
      entityId: voterId,
      description: `System token issued for election ${election.id}`,
      ipAddress: ip,
    });

    return { token: rawToken, expiresAt, electionId: election.id };
  },

  // ── Current voter voting status ───────────────────────────────────────────
  async getMyStatus(voterId: string) {
    const voter =
      (await voterRepository.findByUserId(voterId)) ??
      (await voterRepository.findById(voterId));
    if (!voter) throw new NotFoundError("Voter");

    const latestBallot = await votingRepository.findLatestBallotByVoter(
      voter.id,
    );

    return {
      voterId: voter.id,
      voterRegistrationId: voter.voterId,
      isVerified: Boolean((voter as any).isVerified),
      hasVoted: Boolean((voter as any).hasVoted || latestBallot),
      electionId: latestBallot?.electionId ?? null,
      castAt: latestBallot?.castAt ?? null,
      receiptHash: latestBallot?.receiptHash ?? null,
    };
  },

  async verifyAccess(dto: VerifyAccessDto, voterId: string) {
    const voter =
      (await voterRepository.findByUserId(voterId)) ??
      (await voterRepository.findById(voterId));
    if (!voter) throw new NotFoundError("Voter");

    if (voter.voterId !== dto.uniqueVoterId.trim()) {
      throw new ForbiddenError(
        "Unique voter ID does not match the logged in voter",
      );
    }

    if (!(voter as any).isVerified) {
      throw new ForbiddenError(
        "Voter registration is awaiting verification approval.",
      );
    }

    if ((voter as any).hasVoted) {
      throw new ConflictError("You have already cast your vote");
    }

    const election = await electionRepository.findCurrentVotingOpen();
    if (!election) {
      throw new BadRequestError("Voting is not currently open");
    }

    const existingToken = await votingRepository.findToken(
      election.id,
      voter.id,
    );
    if (existingToken && existingToken.status !== "UNUSED") {
      throw new ConflictError("You have already cast your vote");
    }

    if (!existingToken) {
      await votingRepository.createToken({
        id: uuidv4(),
        electionId: election.id,
        voterId: voter.id,
        issuedToUser: voterId,
        tokenHash: sha256(generateSecureToken(48)),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        ipAddress: undefined,
      });
    }

    return {
      success: true,
      fullName: voter.fullName,
      uniqueVoterId: voter.voterId,
      electionId: election.id,
      electionTitle: election.title,
    };
  },

  // ── Issue a one-time voting token to a verified voter ──────────────────────
  async issueToken(
    electionId: string,
    voterId: string,
    actorId: string,
    ip: string,
  ) {
    const election = await electionRepository.findById(electionId);
    if (!election) throw new NotFoundError("Election");
    // Allow token issuance once the election has moved beyond setup and
    // into the active run-up phase. Voting itself is still blocked until
    // the election reaches VOTING_OPEN.
    const tokenIssuableStatuses = new Set(["CAMPAIGN", "VOTING_OPEN"]);
    if (!tokenIssuableStatuses.has(election.status)) {
      throw new BadRequestError(
        "Voting token can only be issued during CAMPAIGN or VOTING_OPEN",
      );
    }

    const voter = await voterRepository.findById(voterId);
    if (!voter) throw new NotFoundError("Voter");
    const existingToken = await votingRepository.findToken(electionId, voterId);
    if (existingToken) {
      throw new ConflictError(
        "A voting token has already been issued to this voter",
      );
    }

    // Prevent issuing a token if the voter has already cast a ballot in this election
    const priorBallot = await votingRepository.findBallotByVoterAndElection(
      voterId,
      electionId,
    );
    if (priorBallot) {
      throw new ConflictError("Voter has already voted in this election");
    }

    const rawToken = generateSecureToken(48);
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

    await votingRepository.createToken({
      id: uuidv4(),
      electionId,
      voterId,
      issuedToUser: actorId,
      tokenHash,
      expiresAt,
      ipAddress: ip,
    });

    await auditService.log({
      userId: actorId,
      action: "TOKEN_ISSUED",
      entity: "VotingToken",
      entityId: voterId,
      description: `Token issued for election ${electionId}`,
      ipAddress: ip,
    });

    // Return raw token ONCE — never stored in plaintext
    return { token: rawToken, expiresAt };
  },

  // ── Cast a vote ─────────────────────────────────────────────────────────────
  async castVote(dto: CastVoteDto, voterId: string, ip: string) {
    // 1. Validate election is open
    const election = await electionRepository.findById(dto.electionId);
    if (!election) throw new NotFoundError("Election");
    if (election.status !== "VOTING_OPEN") {
      throw new BadRequestError("Voting is not currently open");
    }

    // 2. Validate candidate belongs to this election and is approved
    const candidate = await candidateRepository.findById(dto.candidateId);
    if (!candidate || candidate.electionId !== dto.electionId) {
      throw new NotFoundError("Candidate");
    }
    if (candidate.status !== "APPROVED") {
      throw new BadRequestError("Candidate is not approved for this election");
    }

    // 5. Get voter for geographic scoping
    const voter =
      (await voterRepository.findByUserId(voterId)) ??
      (await voterRepository.findById(voterId));
    if (!voter) throw new NotFoundError("Voter");

    if (voter.voterId !== dto.uniqueVoterId.trim()) {
      throw new ForbiddenError("Unique voter ID does not belong to this voter");
    }

    if ((voter as any).hasVoted) {
      throw new ConflictError("You have already cast your vote");
    }

    const token = await votingRepository.findToken(dto.electionId, voter.id);
    if (!token) {
      throw new BadRequestError("Verify access before voting");
    }
    if (token.status !== "UNUSED") {
      throw new ConflictError("You have already cast your vote");
    }
    if (token.expiresAt < new Date()) {
      throw new BadRequestError("Voting access has expired");
    }

    // 4. Prevent double-voting (DB unique constraint is the final guard)
    // Additionally ensure the voter hasn't already cast a ballot.
    const existingVoterBallot =
      await votingRepository.findBallotByVoterAndElection(
        voter.id,
        dto.electionId,
      );
    if (existingVoterBallot) {
      throw new ConflictError("You have already cast your vote");
    }

    // 6. Generate verifiable receipt hash (HMAC so only we can verify)
    const receiptHash = hmac(
      `${token.id}:${dto.candidateId}:${Date.now()}`,
      env.ENCRYPTION_KEY,
    );

    let regionIdToUse = (voter as any).regionId;
    if (!regionIdToUse) {
      const defaultRegion = await prisma.region.findFirst();
      if (!defaultRegion) throw new BadRequestError("System configuration error: No regions found");
      regionIdToUse = defaultRegion.id;
    }

    // 7. Atomically mark token used + create ballot + mark voter as voted
    await prisma.$transaction([
      votingRepository.markTokenUsed(token.id),
      votingRepository.castBallot({
        id: uuidv4(),
        electionId: dto.electionId,
        candidateId: dto.candidateId,
        votingTokenId: token.id,
        voterId: voter.id,
        regionId: regionIdToUse,
        districtId: (voter as any).districtId ?? undefined,
        pollingStationId: (voter as any).pollingStationId ?? undefined,
        ipAddress: ip,
        receiptHash,
      }),
      candidateRepository.incrementVotes(dto.candidateId),
      votingRepository.markVoterHasVoted(voter.id),
    ]);

    // 8. Broadcast live results update with per‑candidate count
    const totalVotes = await votingRepository.countByElection(dto.electionId);
    // fetch updated candidate vote count
    const updatedCandidate = await candidateRepository.findById(
      dto.candidateId,
    );
    socketEmit.resultsUpdate({
      electionId: dto.electionId,
      totalVotes,
      regionId: (voter as any).regionId ?? undefined,
      districtId: (voter as any).districtId ?? undefined,
      pollingStationId: (voter as any).pollingStationId ?? undefined,
      candidateId: dto.candidateId,
      candidateVotes: updatedCandidate?.voteCount ?? 0,
    });

    await auditService.log({
      userId: voterId,
      action: "VOTE_CAST",
      entity: "Ballot",
      description: `Vote cast in election ${dto.electionId}`,
      ipAddress: ip,
    });

    return { receiptHash };
  },

  // ── Verify a receipt (voter self-verification) ─────────────────────────────
  async verifyReceipt(receiptHash: string) {
    const ballot = await votingRepository.findBallotByReceipt(receiptHash);
    if (!ballot)
      throw new NotFoundError(
        "Receipt not found — vote may not have been recorded",
      );
    // Return minimal info — do NOT expose candidateId to preserve anonymity
    return {
      verified: true,
      electionId: ballot.electionId,
      castAt: ballot.castAt,
    };
  },
};
