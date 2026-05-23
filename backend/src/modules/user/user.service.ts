import bcrypt from "bcryptjs";
import { userRepository } from "./user.repository";
import { ConflictError, NotFoundError } from "../../errors/AppError";
import { buildPaginationMeta } from "../../utils/response";
import { auditService } from "../audit/audit.service";
import { applyUserScope } from "../../utils/scope";
import type { CreateUserDto, UpdateUserDto, UserQuery } from "./user.schema";
import type { JwtPayload } from "../../types";

const SALT_ROUNDS = 12;

export const userService = {
  async list(q: UserQuery, requester?: JwtPayload) {
    const scopedQuery = applyUserScope(q, requester);
    const { data, total } = await userRepository.findAll(scopedQuery);
    return {
      data,
      meta: buildPaginationMeta(total, scopedQuery.page, scopedQuery.limit),
    };
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("User");
    return user;
  },

  async create(dto: CreateUserDto, actorId: string, ip: string) {
    const existing = await userRepository.findByUsername(dto.username);
    if (existing) throw new ConflictError("Username already taken");

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await userRepository.create({
      ...dto,
      passwordHash,
      createdBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      newValues: { username: dto.username, role: dto.roleId },
      ipAddress: ip,
    });

    return user;
  },

  async update(id: string, dto: UpdateUserDto, actorId: string, ip: string) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new NotFoundError("User");

    const updated = await userRepository.update(id, {
      ...dto,
      updatedBy: actorId,
    });

    await auditService.log({
      userId: actorId,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      oldValues: existing,
      newValues: dto,
      ipAddress: ip,
    });

    return updated;
  },

  async remove(id: string, actorId: string, ip: string) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new NotFoundError("User");

    await userRepository.softDelete(id, actorId);

    await auditService.log({
      userId: actorId,
      action: "DELETE",
      entity: "User",
      entityId: id,
      description: "User soft-deleted",
      ipAddress: ip,
    });
  },
};
