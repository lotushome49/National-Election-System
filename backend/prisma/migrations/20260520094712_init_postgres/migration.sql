-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED');

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'REGIONAL_ADMIN', 'DISTRICT_ADMIN', 'STAFF', 'OBSERVER', 'VOTER');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('MANAGE_USERS', 'MANAGE_ELECTIONS', 'MANAGE_CANDIDATES', 'MANAGE_VOTERS', 'CAST_VOTE', 'VIEW_RESULTS', 'MANAGE_REGIONS', 'MANAGE_DISTRICTS', 'MANAGE_POLLING_STATIONS', 'VIEW_AUDIT_LOGS', 'MANAGE_OBSERVERS', 'GENERATE_REPORTS');

-- CreateEnum
CREATE TYPE "ElectionType" AS ENUM ('PRESIDENTIAL', 'PARLIAMENTARY', 'LOCAL', 'BY_ELECTION', 'REFERENDUM');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'NOMINATION_OPEN', 'NOMINATION_CLOSED', 'CAMPAIGN', 'VOTING_OPEN', 'VOTING_CLOSED', 'COUNTING', 'RESULTS_DECLARED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('UNUSED', 'USED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VOTE_CAST', 'TOKEN_ISSUED', 'TOKEN_USED', 'TOKEN_REVOKED', 'ELECTION_STATE_CHANGE', 'RESULT_PUBLISHED', 'OBSERVER_REPORT_SUBMITTED', 'SYSTEM_EVENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "ObserverReportType" AS ENUM ('INCIDENT', 'IRREGULARITY', 'COMPLAINT', 'GENERAL_OBSERVATION');

-- CreateEnum
CREATE TYPE "ObserverReportStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "regions" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(36),
    "updated_by" VARCHAR(36),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" VARCHAR(36) NOT NULL,
    "region_id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(36),
    "updated_by" VARCHAR(36),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polling_stations" (
    "id" VARCHAR(36) NOT NULL,
    "district_id" VARCHAR(36) NOT NULL,
    "region_id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(36),
    "updated_by" VARCHAR(36),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "polling_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" VARCHAR(36) NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" VARCHAR(36) NOT NULL,
    "role_id" VARCHAR(36) NOT NULL,
    "permission" "Permission" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(36),

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(36) NOT NULL,
    "role_id" VARCHAR(36) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_region_id" VARCHAR(36),
    "assigned_district_id" VARCHAR(36),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "lock_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(45),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(36),
    "updated_by" VARCHAR(36),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" VARCHAR(36) NOT NULL,
    "session_id" VARCHAR(36) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "last_seen_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "requested_ip" VARCHAR(45),
    "requested_user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voters" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36),
    "voter_id" VARCHAR(50) NOT NULL,
    "national_id" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" VARCHAR(20),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "region_id" VARCHAR(36),
    "district_id" VARCHAR(36),
    "polling_station_id" VARCHAR(36),
    "biometric_template" TEXT,
    "biometric_hash" VARCHAR(255) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(36),
    "updated_by" VARCHAR(36),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "voters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elections" (
    "id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "ElectionType" NOT NULL,
    "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "nomination_start" TIMESTAMP(3),
    "nomination_end" TIMESTAMP(3),
    "campaign_start" TIMESTAMP(3),
    "campaign_end" TIMESTAMP(3),
    "voting_start" TIMESTAMP(3),
    "voting_end" TIMESTAMP(3),
    "results_at" TIMESTAMP(3),
    "is_national" BOOLEAN NOT NULL DEFAULT true,
    "max_votes_per_voter" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(36),
    "updated_by" VARCHAR(36),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" VARCHAR(36) NOT NULL,
    "election_id" VARCHAR(36) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "party" VARCHAR(255) NOT NULL,
    "party_code" VARCHAR(20),
    "bio" TEXT,
    "manifesto" TEXT,
    "symbol" VARCHAR(10),
    "photo_url" TEXT,
    "ballot_order" INTEGER,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "region_id" VARCHAR(36),
    "district_id" VARCHAR(36),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(36),
    "updated_by" VARCHAR(36),
    "deleted_at" TIMESTAMP(3),
    "documents_json" TEXT,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_tokens" (
    "id" VARCHAR(36) NOT NULL,
    "election_id" VARCHAR(36) NOT NULL,
    "voter_id" VARCHAR(36) NOT NULL,
    "issued_to_user" VARCHAR(36),
    "token_hash" VARCHAR(255) NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'UNUSED',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voting_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ballots" (
    "id" VARCHAR(36) NOT NULL,
    "election_id" VARCHAR(36) NOT NULL,
    "candidate_id" VARCHAR(36) NOT NULL,
    "voting_token_id" VARCHAR(36) NOT NULL,
    "voter_id" VARCHAR(36) NOT NULL,
    "region_id" VARCHAR(36) NOT NULL,
    "district_id" VARCHAR(36),
    "polling_station_id" VARCHAR(36),
    "cast_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "receipt_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ballots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" VARCHAR(36) NOT NULL,
    "election_id" VARCHAR(36) NOT NULL,
    "candidate_id" VARCHAR(36) NOT NULL,
    "region_id" VARCHAR(36),
    "district_id" VARCHAR(36),
    "polling_station_id" VARCHAR(36),
    "total_votes" INTEGER NOT NULL DEFAULT 0,
    "valid_votes" INTEGER NOT NULL DEFAULT 0,
    "rejected_votes" INTEGER NOT NULL DEFAULT 0,
    "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_winner" BOOLEAN NOT NULL DEFAULT false,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" VARCHAR(36),

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36),
    "election_id" VARCHAR(36),
    "action" "AuditAction" NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(36),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observer_reports" (
    "id" VARCHAR(36) NOT NULL,
    "election_id" VARCHAR(36) NOT NULL,
    "observer_id" VARCHAR(36) NOT NULL,
    "polling_station_id" VARCHAR(36),
    "type" "ObserverReportType" NOT NULL,
    "status" "ObserverReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "resolved_by" VARCHAR(36),
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "observer_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observer_evidence" (
    "id" VARCHAR(36) NOT NULL,
    "report_id" VARCHAR(36),
    "uploaded_by" VARCHAR(36) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "public_url" VARCHAR(500) NOT NULL,
    "checksum" VARCHAR(64),
    "caption" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "observer_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");

-- CreateIndex
CREATE INDEX "regions_deleted_at_idx" ON "regions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE INDEX "districts_region_id_idx" ON "districts"("region_id");

-- CreateIndex
CREATE INDEX "districts_deleted_at_idx" ON "districts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "districts_region_id_name_key" ON "districts"("region_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "polling_stations_code_key" ON "polling_stations"("code");

-- CreateIndex
CREATE INDEX "polling_stations_district_id_idx" ON "polling_stations"("district_id");

-- CreateIndex
CREATE INDEX "polling_stations_region_id_idx" ON "polling_stations"("region_id");

-- CreateIndex
CREATE INDEX "polling_stations_is_active_idx" ON "polling_stations"("is_active");

-- CreateIndex
CREATE INDEX "polling_stations_deleted_at_idx" ON "polling_stations"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_deleted_at_idx" ON "roles"("deleted_at");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_key" ON "role_permissions"("role_id", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_assigned_region_id_idx" ON "users"("assigned_region_id");

-- CreateIndex
CREATE INDEX "users_assigned_district_id_idx" ON "users"("assigned_district_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_session_id_key" ON "refresh_tokens"("session_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_status_idx" ON "user_sessions"("status");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_user_id_key" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "password_reset_tokens_used_at_idx" ON "password_reset_tokens"("used_at");

-- CreateIndex
CREATE UNIQUE INDEX "voters_user_id_key" ON "voters"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "voters_voter_id_key" ON "voters"("voter_id");

-- CreateIndex
CREATE UNIQUE INDEX "voters_national_id_key" ON "voters"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "voters_biometric_hash_key" ON "voters"("biometric_hash");

-- CreateIndex
CREATE INDEX "voters_region_id_idx" ON "voters"("region_id");

-- CreateIndex
CREATE INDEX "voters_district_id_idx" ON "voters"("district_id");

-- CreateIndex
CREATE INDEX "voters_polling_station_id_idx" ON "voters"("polling_station_id");

-- CreateIndex
CREATE INDEX "voters_is_verified_idx" ON "voters"("is_verified");

-- CreateIndex
CREATE INDEX "voters_deleted_at_idx" ON "voters"("deleted_at");

-- CreateIndex
CREATE INDEX "elections_status_idx" ON "elections"("status");

-- CreateIndex
CREATE INDEX "elections_type_idx" ON "elections"("type");

-- CreateIndex
CREATE INDEX "elections_voting_start_voting_end_idx" ON "elections"("voting_start", "voting_end");

-- CreateIndex
CREATE INDEX "elections_deleted_at_idx" ON "elections"("deleted_at");

-- CreateIndex
CREATE INDEX "candidates_election_id_idx" ON "candidates"("election_id");

-- CreateIndex
CREATE INDEX "candidates_status_idx" ON "candidates"("status");

-- CreateIndex
CREATE INDEX "candidates_region_id_idx" ON "candidates"("region_id");

-- CreateIndex
CREATE INDEX "candidates_district_id_idx" ON "candidates"("district_id");

-- CreateIndex
CREATE INDEX "candidates_deleted_at_idx" ON "candidates"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_election_id_party_region_id_key" ON "candidates"("election_id", "party", "region_id");

-- CreateIndex
CREATE UNIQUE INDEX "voting_tokens_token_hash_key" ON "voting_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "voting_tokens_election_id_idx" ON "voting_tokens"("election_id");

-- CreateIndex
CREATE INDEX "voting_tokens_voter_id_idx" ON "voting_tokens"("voter_id");

-- CreateIndex
CREATE INDEX "voting_tokens_status_idx" ON "voting_tokens"("status");

-- CreateIndex
CREATE INDEX "voting_tokens_expires_at_idx" ON "voting_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "voting_tokens_election_id_voter_id_key" ON "voting_tokens"("election_id", "voter_id");

-- CreateIndex
CREATE UNIQUE INDEX "ballots_voting_token_id_key" ON "ballots"("voting_token_id");

-- CreateIndex
CREATE UNIQUE INDEX "ballots_receipt_hash_key" ON "ballots"("receipt_hash");

-- CreateIndex
CREATE INDEX "ballots_election_id_idx" ON "ballots"("election_id");

-- CreateIndex
CREATE INDEX "ballots_candidate_id_idx" ON "ballots"("candidate_id");

-- CreateIndex
CREATE INDEX "ballots_region_id_idx" ON "ballots"("region_id");

-- CreateIndex
CREATE INDEX "ballots_district_id_idx" ON "ballots"("district_id");

-- CreateIndex
CREATE INDEX "ballots_polling_station_id_idx" ON "ballots"("polling_station_id");

-- CreateIndex
CREATE INDEX "ballots_cast_at_idx" ON "ballots"("cast_at");

-- CreateIndex
CREATE INDEX "results_election_id_idx" ON "results"("election_id");

-- CreateIndex
CREATE INDEX "results_candidate_id_idx" ON "results"("candidate_id");

-- CreateIndex
CREATE INDEX "results_region_id_idx" ON "results"("region_id");

-- CreateIndex
CREATE INDEX "results_is_final_idx" ON "results"("is_final");

-- CreateIndex
CREATE UNIQUE INDEX "results_election_id_candidate_id_region_id_district_id_poll_key" ON "results"("election_id", "candidate_id", "region_id", "district_id", "polling_station_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_election_id_idx" ON "audit_logs"("election_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "observer_reports_election_id_idx" ON "observer_reports"("election_id");

-- CreateIndex
CREATE INDEX "observer_reports_observer_id_idx" ON "observer_reports"("observer_id");

-- CreateIndex
CREATE INDEX "observer_reports_polling_station_id_idx" ON "observer_reports"("polling_station_id");

-- CreateIndex
CREATE INDEX "observer_reports_type_idx" ON "observer_reports"("type");

-- CreateIndex
CREATE INDEX "observer_reports_status_idx" ON "observer_reports"("status");

-- CreateIndex
CREATE INDEX "observer_reports_deleted_at_idx" ON "observer_reports"("deleted_at");

-- CreateIndex
CREATE INDEX "observer_evidence_report_id_idx" ON "observer_evidence"("report_id");

-- CreateIndex
CREATE INDEX "observer_evidence_uploaded_by_idx" ON "observer_evidence"("uploaded_by");

-- CreateIndex
CREATE INDEX "observer_evidence_deleted_at_idx" ON "observer_evidence"("deleted_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_stations" ADD CONSTRAINT "polling_stations_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_stations" ADD CONSTRAINT "polling_stations_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_region_id_fkey" FOREIGN KEY ("assigned_region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_district_id_fkey" FOREIGN KEY ("assigned_district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_polling_station_id_fkey" FOREIGN KEY ("polling_station_id") REFERENCES "polling_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_tokens" ADD CONSTRAINT "voting_tokens_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_tokens" ADD CONSTRAINT "voting_tokens_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "voters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_tokens" ADD CONSTRAINT "voting_tokens_issued_to_user_fkey" FOREIGN KEY ("issued_to_user") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_voting_token_id_fkey" FOREIGN KEY ("voting_token_id") REFERENCES "voting_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "voters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_polling_station_id_fkey" FOREIGN KEY ("polling_station_id") REFERENCES "polling_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_polling_station_id_fkey" FOREIGN KEY ("polling_station_id") REFERENCES "polling_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observer_reports" ADD CONSTRAINT "observer_reports_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observer_reports" ADD CONSTRAINT "observer_reports_observer_id_fkey" FOREIGN KEY ("observer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observer_reports" ADD CONSTRAINT "observer_reports_polling_station_id_fkey" FOREIGN KEY ("polling_station_id") REFERENCES "polling_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observer_evidence" ADD CONSTRAINT "observer_evidence_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "observer_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observer_evidence" ADD CONSTRAINT "observer_evidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
