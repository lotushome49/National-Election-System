import { v4 as uuidv4 } from "uuid";
import { electionRepository } from "./election.repository";
import { NotFoundError, BadRequestError } from "../../errors/AppError";
import { buildPaginationMeta } from "../../utils/response";
import { auditService } from "../audit/audit.service";
import { socketEmit } from "../../configs/socket";
import type {
  CreateElectionDto,
  UpdateElectionDto,
  TransitionDto,
  ElectionQuery,
} from "./election.schema";

// Valid state machine transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["NOMINATION_OPEN", "CANCELLED"],
  NOMINATION_OPEN: ["NOMINATION_CLOSED", "CANCELLED"],
  NOMINATION_CLOSED: ["CAMPAIGN", "CANCELLED"],
  CAMPAIGN: ["VOTING_OPEN", "CANCELLED"],
  VOTING_OPEN: ["VOTING_CLOSED", "DISPUTED", "CANCELLED"],
  VOTING_CLOSED: ["COUNTING", "DISPUTED"],
  COUNTING: ["RESULTS_DECLARED", "DISPUTED"],
  RESULTS_DECLARED: [],
  DISPUTED: ["COUNTING", "CANCELLED"],
  CANCELLED: [],
};

export const electionService = {
  async list(q: ElectionQuery) {
    const { data, total } = await electionRepository.findAll(q);
    return { data, meta: buildPaginationMeta(total, q.page, q.limit) };
  },

  async getById(id: string) {
    const election = await electionRepository.findById(id);
    if (!election) throw new NotFoundError("Election");
    return election;
  },

  async getCurrentOpen() {
    const election = await electionRepository.findCurrentVotingOpen();
    if (!election) throw new NotFoundError("Election");
    return election;
  },

  async create(dto: CreateElectionDto, actorId: string, ip: string) {
    const election = await electionRepository.create({
      id: uuidv4(),
      ...dto,
      status: "DRAFT",
      createdBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "CREATE",
      entity: "Election",
      entityId: election.id,
      newValues: { title: dto.title, type: dto.type },
      ipAddress: ip,
    });

    return election;
  },

  async update(
    id: string,
    dto: UpdateElectionDto,
    actorId: string,
    ip: string,
  ) {
    const existing = await electionRepository.findById(id);
    if (!existing) throw new NotFoundError("Election");

    if (
      ["VOTING_OPEN", "VOTING_CLOSED", "COUNTING", "RESULTS_DECLARED"].includes(
        existing.status,
      )
    ) {
      throw new BadRequestError(
        "Cannot edit an election that is in progress or completed",
      );
    }

    const updated = await electionRepository.update(id, {
      ...dto,
      updatedBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "Election",
      entityId: id,
      oldValues: existing,
      newValues: dto,
      ipAddress: ip,
    });

    return updated;
  },

  async transition(
    id: string,
    dto: TransitionDto,
    actorId: string,
    ip: string,
  ) {
    const election = await electionRepository.findById(id);
    if (!election) throw new NotFoundError("Election");

    const allowed = VALID_TRANSITIONS[election.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestError(
        `Cannot transition from '${election.status}' to '${dto.status}'. ` +
          `Allowed: ${allowed.join(", ") || "none"}`,
      );
    }

    if (dto.status === "VOTING_OPEN") {
      const approvedCandidates =
        await electionRepository.countApprovedCandidates(id);
      if (approvedCandidates === 0) {
        throw new BadRequestError(
          "Cannot open voting until this election has at least one approved candidate",
        );
      }
      await electionRepository.closeOtherOpenElections(id, actorId);
    }

    const updated = await electionRepository.update(id, {
      status: dto.status,
      updatedBy: actorId,
    });

    // Broadcast state change via Socket.IO
    socketEmit.electionState(id, dto.status);

    await auditService.log({
      userId: actorId,
      action: "ELECTION_STATE_CHANGE",
      entity: "Election",
      entityId: id,
      oldValues: { status: election.status },
      newValues: { status: dto.status },
      description: dto.reason,
      ipAddress: ip,
    });

    return updated;
  },

  async remove(id: string, actorId: string, ip: string) {
    const existing = await electionRepository.findById(id);
    if (!existing) throw new NotFoundError("Election");

    if (existing.status !== "DRAFT" && existing.status !== "CANCELLED") {
      throw new BadRequestError(
        "Only DRAFT or CANCELLED elections can be deleted",
      );
    }

    await electionRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId,
      action: "DELETE",
      entity: "Election",
      entityId: id,
      description: "Election soft-deleted",
      ipAddress: ip,
    });
  },
};
