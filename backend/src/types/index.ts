import { Request } from 'express';

// ─── JWT Payload ─────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;          // user id
  role: string;
  regionId?: string;
  districtId?: string;
  type: 'access' | 'refresh';
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
  sortOrder?: 'asc' | 'desc';
}

// ─── Role / Permission constants ──────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN:    'SUPER_ADMIN',
  ADMIN:          'ADMIN',
  REGIONAL_ADMIN: 'REGIONAL_ADMIN',
  DISTRICT_ADMIN: 'DISTRICT_ADMIN',
  STAFF:          'STAFF',
  OBSERVER:       'OBSERVER',
  VOTER:          'VOTER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  MANAGE_USERS:             'MANAGE_USERS',
  MANAGE_ELECTIONS:         'MANAGE_ELECTIONS',
  MANAGE_CANDIDATES:        'MANAGE_CANDIDATES',
  MANAGE_VOTERS:            'MANAGE_VOTERS',
  CAST_VOTE:                'CAST_VOTE',
  VIEW_RESULTS:             'VIEW_RESULTS',
  MANAGE_REGIONS:           'MANAGE_REGIONS',
  MANAGE_DISTRICTS:         'MANAGE_DISTRICTS',
  MANAGE_POLLING_STATIONS:  'MANAGE_POLLING_STATIONS',
  VIEW_AUDIT_LOGS:          'VIEW_AUDIT_LOGS',
  MANAGE_OBSERVERS:         'MANAGE_OBSERVERS',
  GENERATE_REPORTS:         'GENERATE_REPORTS',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Audit action types ───────────────────────────────────────────────────────
export type AuditAction =
  | 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  | 'LOGIN'  | 'LOGOUT'
  | 'VOTE_CAST' | 'TOKEN_ISSUED' | 'TOKEN_USED' | 'TOKEN_REVOKED'
  | 'ELECTION_STATE_CHANGE' | 'RESULT_PUBLISHED'
  | 'OBSERVER_REPORT_SUBMITTED' | 'SYSTEM_EVENT';

// ─── Socket events ────────────────────────────────────────────────────────────
export interface SocketEvents {
  'results:update': (data: unknown) => void;
  'election:state': (data: { electionId: string; status: string }) => void;
  'notification:new': (data: unknown) => void;
}
