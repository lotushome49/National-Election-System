import { Request } from "express";
import {
  PERMISSIONS,
  ROLES,
  type Permission,
  type Role,
} from "../constants/auth";

// ─── JWT Payload ─────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string; // user id
  sid?: string;
  role: string;
  regionId?: string;
  districtId?: string;
  type: "access" | "refresh" | "mfa";
  iat?: number;
  exp?: number;
}

// ─── Authenticated Request ────────────────────────────────────────────────────
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ─── API Response wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Role / Permission constants ──────────────────────────────────────────────
export { PERMISSIONS, ROLES };
export type { Permission, Role };

// ─── Audit action types ───────────────────────────────────────────────────────
export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "VOTE_CAST"
  | "TOKEN_ISSUED"
  | "TOKEN_USED"
  | "TOKEN_REVOKED"
  | "ELECTION_STATE_CHANGE"
  | "RESULT_PUBLISHED"
  | "OBSERVER_REPORT_SUBMITTED"
  | "SYSTEM_EVENT";

// ─── Socket events ────────────────────────────────────────────────────────────
export interface SocketEvents {
  "results:update": (data: unknown) => void;
  "election:state": (data: { electionId: string; status: string }) => void;
  "notification:new": (data: unknown) => void;
}
