/**
 * NEHS — National Election Handling System
 * Drizzle ORM Schema  |  MySQL  |  UUID PKs  |  3NF  |  RBAC  |  Soft Delete
 *
 * This file replaces the original schema and aligns with the full Prisma/SQL design.
 * All tables use VARCHAR(36) UUIDs as primary keys (generated in application layer via uuid()).
 */

import {
  mysqlTable,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  date,
  decimal,
  json,
  mysqlEnum,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// ENUMS
// ---------------------------------------------------------------------------

export const userStatusEnum = ['ACTIVE', 'SUSPENDED', 'LOCKED'] as const;
export type UserStatus = (typeof userStatusEnum)[number];

export const roleCodeEnum = [
  'SUPER_ADMIN', 'ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN', 'STAFF', 'OBSERVER', 'VOTER',
] as const;
export type RoleCode = (typeof roleCodeEnum)[number];

export const permissionEnum = [
  'MANAGE_USERS', 'MANAGE_ELECTIONS', 'MANAGE_CANDIDATES', 'MANAGE_VOTERS',
  'CAST_VOTE', 'VIEW_RESULTS', 'MANAGE_REGIONS', 'MANAGE_DISTRICTS',
  'MANAGE_POLLING_STATIONS', 'VIEW_AUDIT_LOGS', 'MANAGE_OBSERVERS', 'GENERATE_REPORTS',
] as const;
export type Permission = (typeof permissionEnum)[number];

export const electionTypeEnum = [
  'PRESIDENTIAL', 'PARLIAMENTARY', 'LOCAL', 'BY_ELECTION', 'REFERENDUM',
] as const;
export type ElectionType = (typeof electionTypeEnum)[number];

export const electionStatusEnum = [
  'DRAFT', 'SCHEDULED', 'NOMINATION_OPEN', 'NOMINATION_CLOSED', 'CAMPAIGN',
  'VOTING_OPEN', 'VOTING_CLOSED', 'COUNTING', 'RESULTS_DECLARED', 'DISPUTED', 'CANCELLED',
] as const;
export type ElectionStatus = (typeof electionStatusEnum)[number];

export const candidateStatusEnum = [
  'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'DISQUALIFIED',
] as const;
export type CandidateStatus = (typeof candidateStatusEnum)[number];

export const tokenStatusEnum = ['UNUSED', 'USED', 'EXPIRED', 'REVOKED'] as const;
export type TokenStatus = (typeof tokenStatusEnum)[number];

export const auditActionEnum = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VOTE_CAST',
  'TOKEN_ISSUED', 'TOKEN_USED', 'TOKEN_REVOKED', 'ELECTION_STATE_CHANGE',
  'RESULT_PUBLISHED', 'OBSERVER_REPORT_SUBMITTED', 'SYSTEM_EVENT',
] as const;
export type AuditAction = (typeof auditActionEnum)[number];

export const notificationTypeEnum = ['EMAIL', 'SMS', 'IN_APP', 'PUSH'] as const;
export type NotificationType = (typeof notificationTypeEnum)[number];

export const notificationStatusEnum = ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ'] as const;
export type NotificationStatus = (typeof notificationStatusEnum)[number];

export const observerReportTypeEnum = [
  'INCIDENT', 'IRREGULARITY', 'COMPLAINT', 'GENERAL_OBSERVATION',
] as const;
export type ObserverReportType = (typeof observerReportTypeEnum)[number];

export const observerReportStatusEnum = [
  'SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED',
] as const;
export type ObserverReportStatus = (typeof observerReportStatusEnum)[number];

// ---------------------------------------------------------------------------
// REGIONS
// ---------------------------------------------------------------------------

export const regions = mysqlTable('regions', {
  id:          varchar('id', { length: 36 }).primaryKey(),
  name:        varchar('name', { length: 255 }).notNull().unique(),
  code:        varchar('code', { length: 20 }).notNull().unique(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  createdBy:   varchar('created_by', { length: 36 }),
  updatedBy:   varchar('updated_by', { length: 36 }),
  deletedAt:   timestamp('deleted_at'),
}, (t) => ({
  deletedAtIdx: index('idx_regions_deleted_at').on(t.deletedAt),
}));

// ---------------------------------------------------------------------------
// DISTRICTS
// ---------------------------------------------------------------------------

export const districts = mysqlTable('districts', {
  id:          varchar('id', { length: 36 }).primaryKey(),
  regionId:    varchar('region_id', { length: 36 }).notNull(),
  name:        varchar('name', { length: 255 }).notNull(),
  code:        varchar('code', { length: 20 }).notNull().unique(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  createdBy:   varchar('created_by', { length: 36 }),
  updatedBy:   varchar('updated_by', { length: 36 }),
  deletedAt:   timestamp('deleted_at'),
}, (t) => ({
  regionIdx:    index('idx_districts_region_id').on(t.regionId),
  deletedAtIdx: index('idx_districts_deleted_at').on(t.deletedAt),
  regionNameUq: uniqueIndex('uq_districts_region_name').on(t.regionId, t.name),
}));

// ---------------------------------------------------------------------------
// POLLING STATIONS
// ---------------------------------------------------------------------------

export const pollingStations = mysqlTable('polling_stations', {
  id:         varchar('id', { length: 36 }).primaryKey(),
  districtId: varchar('district_id', { length: 36 }).notNull(),
  regionId:   varchar('region_id', { length: 36 }).notNull(),
  name:       varchar('name', { length: 255 }).notNull(),
  code:       varchar('code', { length: 30 }).notNull().unique(),
  address:    text('address'),
  latitude:   decimal('latitude', { precision: 10, scale: 8 }),
  longitude:  decimal('longitude', { precision: 11, scale: 8 }),
  capacity:   int('capacity').default(0).notNull(),
  isActive:   boolean('is_active').default(true).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  createdBy:  varchar('created_by', { length: 36 }),
  updatedBy:  varchar('updated_by', { length: 36 }),
  deletedAt:  timestamp('deleted_at'),
}, (t) => ({
  districtIdx:  index('idx_polling_stations_district_id').on(t.districtId),
  regionIdx:    index('idx_polling_stations_region_id').on(t.regionId),
  isActiveIdx:  index('idx_polling_stations_is_active').on(t.isActive),
  deletedAtIdx: index('idx_polling_stations_deleted_at').on(t.deletedAt),
}));

// ---------------------------------------------------------------------------
// ROLES  (RBAC)
// ---------------------------------------------------------------------------

export const roles = mysqlTable('roles', {
  id:          varchar('id', { length: 36 }).primaryKey(),
  code:        mysqlEnum('code', roleCodeEnum).notNull().unique(),
  name:        varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt:   timestamp('deleted_at'),
}, (t) => ({
  deletedAtIdx: index('idx_roles_deleted_at').on(t.deletedAt),
}));

// ---------------------------------------------------------------------------
// ROLE PERMISSIONS  (RBAC junction)
// ---------------------------------------------------------------------------

export const rolePermissions = mysqlTable('role_permissions', {
  id:         varchar('id', { length: 36 }).primaryKey(),
  roleId:     varchar('role_id', { length: 36 }).notNull(),
  permission: mysqlEnum('permission', permissionEnum).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  createdBy:  varchar('created_by', { length: 36 }),
}, (t) => ({
  roleIdx:    index('idx_role_permissions_role_id').on(t.roleId),
  rolePermUq: uniqueIndex('uq_role_permissions_role_perm').on(t.roleId, t.permission),
}));

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------

export const users = mysqlTable('users', {
  id:                 varchar('id', { length: 36 }).primaryKey(),
  roleId:             varchar('role_id', { length: 36 }).notNull(),
  fullName:           varchar('full_name', { length: 255 }).notNull(),
  username:           varchar('username', { length: 100 }).notNull().unique(),
  email:              varchar('email', { length: 255 }).unique(),
  passwordHash:       varchar('password_hash', { length: 255 }).notNull(),
  status:             mysqlEnum('status', userStatusEnum).notNull().default('ACTIVE'),
  assignedRegionId:   varchar('assigned_region_id', { length: 36 }),
  assignedDistrictId: varchar('assigned_district_id', { length: 36 }),
  failedAttempts:     int('failed_attempts').default(0).notNull(),
  lockUntil:          timestamp('lock_until'),
  lastLoginAt:        timestamp('last_login_at'),
  lastLoginIp:        varchar('last_login_ip', { length: 45 }),
  mfaEnabled:         boolean('mfa_enabled').default(false).notNull(),
  mfaSecret:          varchar('mfa_secret', { length: 255 }),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  createdBy:          varchar('created_by', { length: 36 }),
  updatedBy:          varchar('updated_by', { length: 36 }),
  deletedAt:          timestamp('deleted_at'),
}, (t) => ({
  roleIdx:       index('idx_users_role_id').on(t.roleId),
  statusIdx:     index('idx_users_status').on(t.status),
  regionIdx:     index('idx_users_assigned_region_id').on(t.assignedRegionId),
  districtIdx:   index('idx_users_assigned_district_id').on(t.assignedDistrictId),
  deletedAtIdx:  index('idx_users_deleted_at').on(t.deletedAt),
}));

// ---------------------------------------------------------------------------
// VOTERS
// ---------------------------------------------------------------------------

export const voters = mysqlTable('voters', {
  id:                varchar('id', { length: 36 }).primaryKey(),
  userId:            varchar('user_id', { length: 36 }).unique(),
  voterId:           varchar('voter_id', { length: 50 }).notNull().unique(),
  nationalId:        varchar('national_id', { length: 50 }).notNull().unique(),
  fullName:          varchar('full_name', { length: 255 }).notNull(),
  dateOfBirth:       date('date_of_birth').notNull(),
  gender:            varchar('gender', { length: 20 }),
  phone:             varchar('phone', { length: 20 }),
  email:             varchar('email', { length: 255 }),
  address:           text('address'),
  regionId:          varchar('region_id', { length: 36 }),
  districtId:        varchar('district_id', { length: 36 }),
  pollingStationId:  varchar('polling_station_id', { length: 36 }),
  biometricTemplate: text('biometric_template'),   // AES-256 encrypted
  biometricHash:     varchar('biometric_hash', { length: 255 }).notNull().unique(), // SHA-256
  isVerified:        boolean('is_verified').default(false).notNull(),
  registrationDate:  timestamp('registration_date').defaultNow().notNull(),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  createdBy:         varchar('created_by', { length: 36 }),
  updatedBy:         varchar('updated_by', { length: 36 }),
  deletedAt:         timestamp('deleted_at'),
}, (t) => ({
  regionIdx:         index('idx_voters_region_id').on(t.regionId),
  districtIdx:       index('idx_voters_district_id').on(t.districtId),
  pollingStationIdx: index('idx_voters_polling_station_id').on(t.pollingStationId),
  isVerifiedIdx:     index('idx_voters_is_verified').on(t.isVerified),
  deletedAtIdx:      index('idx_voters_deleted_at').on(t.deletedAt),
}));

// ---------------------------------------------------------------------------
// ELECTIONS
// ---------------------------------------------------------------------------

export const elections = mysqlTable('elections', {
  id:                varchar('id', { length: 36 }).primaryKey(),
  title:             varchar('title', { length: 255 }).notNull(),
  description:       text('description'),
  type:              mysqlEnum('type', electionTypeEnum).notNull(),
  status:            mysqlEnum('status', electionStatusEnum).notNull().default('DRAFT'),
  nominationStart:   timestamp('nomination_start'),
  nominationEnd:     timestamp('nomination_end'),
  campaignStart:     timestamp('campaign_start'),
  campaignEnd:       timestamp('campaign_end'),
  votingStart:       timestamp('voting_start'),
  votingEnd:         timestamp('voting_end'),
  resultsAt:         timestamp('results_at'),
  isNational:        boolean('is_national').default(true).notNull(),
  maxVotesPerVoter:  int('max_votes_per_voter').default(1).notNull(),
  metadata:          json('metadata'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  createdBy:         varchar('created_by', { length: 36 }),
  updatedBy:         varchar('updated_by', { length: 36 }),
  deletedAt:         timestamp('deleted_at'),
}, (t) => ({
  statusIdx:       index('idx_elections_status').on(t.status),
  typeIdx:         index('idx_elections_type').on(t.type),
  votingWindowIdx: index('idx_elections_voting_window').on(t.votingStart, t.votingEnd),
  deletedAtIdx:    index('idx_elections_deleted_at').on(t.deletedAt),
}));

// ---------------------------------------------------------------------------
// CANDIDATES
// ---------------------------------------------------------------------------

export const candidates = mysqlTable('candidates', {
  id:          varchar('id', { length: 36 }).primaryKey(),
  electionId:  varchar('election_id', { length: 36 }).notNull(),
  fullName:    varchar('full_name', { length: 255 }).notNull(),
  party:       varchar('party', { length: 255 }).notNull(),
  partyCode:   varchar('party_code', { length: 20 }),
  bio:         text('bio'),
  manifesto:   text('manifesto'),
  symbol:      varchar('symbol', { length: 10 }),
  photoUrl:    text('photo_url'),
  ballotOrder: int('ballot_order'),
  status:      mysqlEnum('status', candidateStatusEnum).notNull().default('PENDING'),
  regionId:    varchar('region_id', { length: 36 }),
  districtId:  varchar('district_id', { length: 36 }),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  createdBy:   varchar('created_by', { length: 36 }),
  updatedBy:   varchar('updated_by', { length: 36 }),
  deletedAt:   timestamp('deleted_at'),
}, (t) => ({
  electionIdx:        index('idx_candidates_election_id').on(t.electionId),
  statusIdx:          index('idx_candidates_status').on(t.status),
  regionIdx:          index('idx_candidates_region_id').on(t.regionId),
  districtIdx:        index('idx_candidates_district_id').on(t.districtId),
  deletedAtIdx:       index('idx_candidates_deleted_at').on(t.deletedAt),
  electionPartyRegUq: uniqueIndex('uq_candidates_election_party_region').on(t.electionId, t.party, t.regionId),
}));

// ---------------------------------------------------------------------------
// VOTING TOKENS
// ---------------------------------------------------------------------------

export const votingTokens = mysqlTable('voting_tokens', {
  id:           varchar('id', { length: 36 }).primaryKey(),
  electionId:   varchar('election_id', { length: 36 }).notNull(),
  voterId:      varchar('voter_id', { length: 36 }).notNull(),
  issuedToUser: varchar('issued_to_user', { length: 36 }),
  tokenHash:    varchar('token_hash', { length: 255 }).notNull().unique(),
  status:       mysqlEnum('status', tokenStatusEnum).notNull().default('UNUSED'),
  issuedAt:     timestamp('issued_at').defaultNow().notNull(),
  usedAt:       timestamp('used_at'),
  expiresAt:    timestamp('expires_at').notNull(),
  ipAddress:    varchar('ip_address', { length: 45 }),
  userAgent:    text('user_agent'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  electionIdx:       index('idx_voting_tokens_election_id').on(t.electionId),
  voterIdx:          index('idx_voting_tokens_voter_id').on(t.voterId),
  statusIdx:         index('idx_voting_tokens_status').on(t.status),
  expiresAtIdx:      index('idx_voting_tokens_expires_at').on(t.expiresAt),
  electionVoterUq:   uniqueIndex('uq_voting_tokens_election_voter').on(t.electionId, t.voterId),
}));

// ---------------------------------------------------------------------------
// BALLOTS  (anonymised votes)
// ---------------------------------------------------------------------------

export const ballots = mysqlTable('ballots', {
  id:               varchar('id', { length: 36 }).primaryKey(),
  electionId:       varchar('election_id', { length: 36 }).notNull(),
  candidateId:      varchar('candidate_id', { length: 36 }).notNull(),
  votingTokenId:    varchar('voting_token_id', { length: 36 }).notNull().unique(),
  voterId:          varchar('voter_id', { length: 36 }).notNull(),
  regionId:         varchar('region_id', { length: 36 }).notNull(),
  districtId:       varchar('district_id', { length: 36 }),
  pollingStationId: varchar('polling_station_id', { length: 36 }),
  castAt:           timestamp('cast_at').defaultNow().notNull(),
  ipAddress:        varchar('ip_address', { length: 45 }),
  receiptHash:      varchar('receipt_hash', { length: 255 }).notNull().unique(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  electionIdx:       index('idx_ballots_election_id').on(t.electionId),
  candidateIdx:      index('idx_ballots_candidate_id').on(t.candidateId),
  regionIdx:         index('idx_ballots_region_id').on(t.regionId),
  districtIdx:       index('idx_ballots_district_id').on(t.districtId),
  pollingStationIdx: index('idx_ballots_polling_station_id').on(t.pollingStationId),
  castAtIdx:         index('idx_ballots_cast_at').on(t.castAt),
}));

// ---------------------------------------------------------------------------
// RESULTS  (aggregated tallies)
// ---------------------------------------------------------------------------

export const results = mysqlTable('results', {
  id:               varchar('id', { length: 36 }).primaryKey(),
  electionId:       varchar('election_id', { length: 36 }).notNull(),
  candidateId:      varchar('candidate_id', { length: 36 }).notNull(),
  regionId:         varchar('region_id', { length: 36 }),
  districtId:       varchar('district_id', { length: 36 }),
  pollingStationId: varchar('polling_station_id', { length: 36 }),
  totalVotes:       int('total_votes').default(0).notNull(),
  validVotes:       int('valid_votes').default(0).notNull(),
  rejectedVotes:    int('rejected_votes').default(0).notNull(),
  percentage:       decimal('percentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
  isWinner:         boolean('is_winner').default(false).notNull(),
  isFinal:          boolean('is_final').default(false).notNull(),
  computedAt:       timestamp('computed_at').defaultNow().notNull(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  createdBy:        varchar('created_by', { length: 36 }),
}, (t) => ({
  electionIdx:   index('idx_results_election_id').on(t.electionId),
  candidateIdx:  index('idx_results_candidate_id').on(t.candidateId),
  regionIdx:     index('idx_results_region_id').on(t.regionId),
  isFinalIdx:    index('idx_results_is_final').on(t.isFinal),
  scopeUq:       uniqueIndex('uq_results_scope').on(
    t.electionId, t.candidateId, t.regionId, t.districtId, t.pollingStationId
  ),
}));

// ---------------------------------------------------------------------------
// AUDIT LOGS
// ---------------------------------------------------------------------------

export const auditLogs = mysqlTable('audit_logs', {
  id:          varchar('id', { length: 36 }).primaryKey(),
  userId:      varchar('user_id', { length: 36 }),
  electionId:  varchar('election_id', { length: 36 }),
  action:      mysqlEnum('action', auditActionEnum).notNull(),
  entity:      varchar('entity', { length: 100 }).notNull(),
  entityId:    varchar('entity_id', { length: 36 }),
  oldValues:   json('old_values'),
  newValues:   json('new_values'),
  ipAddress:   varchar('ip_address', { length: 45 }),
  userAgent:   text('user_agent'),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdx:      index('idx_audit_logs_user_id').on(t.userId),
  electionIdx:  index('idx_audit_logs_election_id').on(t.electionId),
  actionIdx:    index('idx_audit_logs_action').on(t.action),
  entityIdx:    index('idx_audit_logs_entity').on(t.entity, t.entityId),
  createdAtIdx: index('idx_audit_logs_created_at').on(t.createdAt),
}));

// ---------------------------------------------------------------------------
// OBSERVER REPORTS
// ---------------------------------------------------------------------------

export const observerReports = mysqlTable('observer_reports', {
  id:               varchar('id', { length: 36 }).primaryKey(),
  electionId:       varchar('election_id', { length: 36 }).notNull(),
  observerId:       varchar('observer_id', { length: 36 }).notNull(),
  pollingStationId: varchar('polling_station_id', { length: 36 }),
  type:             mysqlEnum('type', observerReportTypeEnum).notNull(),
  status:           mysqlEnum('status', observerReportStatusEnum).notNull().default('SUBMITTED'),
  title:            varchar('title', { length: 255 }).notNull(),
  description:      text('description').notNull(),
  evidenceUrls:     json('evidence_urls'),
  resolvedBy:       varchar('resolved_by', { length: 36 }),
  resolvedAt:       timestamp('resolved_at'),
  resolution:       text('resolution'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt:        timestamp('deleted_at'),
}, (t) => ({
  electionIdx:       index('idx_observer_reports_election_id').on(t.electionId),
  observerIdx:       index('idx_observer_reports_observer_id').on(t.observerId),
  pollingStationIdx: index('idx_observer_reports_polling_station').on(t.pollingStationId),
  typeIdx:           index('idx_observer_reports_type').on(t.type),
  statusIdx:         index('idx_observer_reports_status').on(t.status),
  deletedAtIdx:      index('idx_observer_reports_deleted_at').on(t.deletedAt),
}));

// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------

export const notifications = mysqlTable('notifications', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  userId:    varchar('user_id', { length: 36 }).notNull(),
  type:      mysqlEnum('type', notificationTypeEnum).notNull(),
  status:    mysqlEnum('status', notificationStatusEnum).notNull().default('PENDING'),
  subject:   varchar('subject', { length: 255 }).notNull(),
  body:      text('body').notNull(),
  metadata:  json('metadata'),
  sentAt:    timestamp('sent_at'),
  readAt:    timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdx:      index('idx_notifications_user_id').on(t.userId),
  statusIdx:    index('idx_notifications_status').on(t.status),
  typeIdx:      index('idx_notifications_type').on(t.type),
  createdAtIdx: index('idx_notifications_created_at').on(t.createdAt),
}));
