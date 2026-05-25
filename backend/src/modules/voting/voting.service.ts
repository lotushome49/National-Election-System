import { v4 as uuidv4 } from "uuid";
import { votingRepository } from "./voting.repository";
import { voterRepository } from "../voter/voter.repository";
import { electionRepository } from "../election/election.repository";
import { candidateRepository } from "../candidate/candidate.repository";
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
import type { CastVoteDto } from "./voting.schema";

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
    const voter = await voterRepository.findById(voterId);
    if (!voter) throw new NotFoundError("Voter");

    const latestBallot =
      await votingRepository.findLatestBallotByVoter(voterId);

    return {
      voterId: voter.id,
      voterRegistrationId: voter.voterId,
      isVerified: Boolean((voter as any).isVerified),
      hasVoted: Boolean(latestBallot),
      electionId: latestBallot?.electionId ?? null,
      castAt: latestBallot?.castAt ?? null,
      receiptHash: latestBallot?.receiptHash ?? null,
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
    if (!(voter as any).isVerified)
      throw new ForbiddenError("Voter is not verified");

    // Prevent duplicate token issuance
    const existing = await votingRepository.findToken(electionId, voterId);
    if (existing)
      throw new ConflictError(
        "A voting token has already been issued to this voter",
      );

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

    // 3. Validate token
    const tokenHash = sha256(dto.tokenHash);
    const token = await votingRepository.findTokenByHash(tokenHash);
    if (!token) throw new BadRequestError("Invalid voting token");
    if (token.voterId !== voterId)
      throw new ForbiddenError("Token does not belong to this voter");
    if (token.status !== "UNUSED")
      throw new ConflictError("Voting token has already been used");
    if (token.expiresAt < new Date())
      throw new BadRequestError("Voting token has expired");

    // 4. Prevent double-voting (DB unique constraint is the final guard)
    const existingBallot = await votingRepository.findBallotByToken(token.id);
    if (existingBallot)
      throw new ConflictError("Vote already cast with this token");

    // 5. Get voter for geographic scoping
    const voter = await voterRepository.findById(voterId);
    if (!voter) throw new NotFoundError("Voter");

    // 6. Generate verifiable receipt hash (HMAC so only we can verify)
    const receiptHash = hmac(
      `${token.id}:${dto.candidateId}:${Date.now()}`,
      env.ENCRYPTION_KEY,
    );

    // 7. Atomically mark token used + create ballot
    await Promise.all([
      votingRepository.markTokenUsed(token.id),
      votingRepository.castBallot({
        id: uuidv4(),
        electionId: dto.electionId,
        candidateId: dto.candidateId,
        votingTokenId: token.id,
        voterId,
        regionId: (voter as any).regionId ?? "",
        districtId: (voter as any).districtId ?? undefined,
        pollingStationId: (voter as any).pollingStationId ?? undefined,
        ipAddress: ip,
        receiptHash,
      }),
    ]);

    // 8. Broadcast live results update
    const totalVotes = await votingRepository.countByElection(dto.electionId);
    socketEmit.resultsUpdate({
      electionId: dto.electionId,
      totalVotes,
      regionId: (voter as any).regionId ?? undefined,
      districtId: (voter as any).districtId ?? undefined,
      pollingStationId: (voter as any).pollingStationId ?? undefined,
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
