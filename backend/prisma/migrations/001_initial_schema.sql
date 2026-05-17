-- =============================================================================
-- NEHS — National Election Handling System
-- SQL Migration 001 — Initial Schema
-- Engine: MySQL 8.0+  |  UUID PKs  |  3NF  |  RBAC  |  Soft Delete
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ---------------------------------------------------------------------------
-- REGIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `regions` (
  `id`          VARCHAR(36)   NOT NULL,
  `name`        VARCHAR(255)  NOT NULL,
  `code`        VARCHAR(20)   NOT NULL,
  `description` TEXT          NULL,
  `created_at`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by`  VARCHAR(36)   NULL,
  `updated_by`  VARCHAR(36)   NULL,
  `deleted_at`  DATETIME(3)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_regions_name`  (`name`),
  UNIQUE KEY `uq_regions_code`  (`code`),
  KEY `idx_regions_deleted_at`  (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- DISTRICTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `districts` (
  `id`          VARCHAR(36)   NOT NULL,
  `region_id`   VARCHAR(36)   NOT NULL,
  `name`        VARCHAR(255)  NOT NULL,
  `code`        VARCHAR(20)   NOT NULL,
  `description` TEXT          NULL,
  `created_at`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by`  VARCHAR(36)   NULL,
  `updated_by`  VARCHAR(36)   NULL,
  `deleted_at`  DATETIME(3)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_districts_code`            (`code`),
  UNIQUE KEY `uq_districts_region_name`     (`region_id`, `name`),
  KEY `idx_districts_region_id`             (`region_id`),
  KEY `idx_districts_deleted_at`            (`deleted_at`),
  CONSTRAINT `fk_districts_region`
    FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- POLLING STATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `polling_stations` (
  `id`          VARCHAR(36)    NOT NULL,
  `district_id` VARCHAR(36)    NOT NULL,
  `region_id`   VARCHAR(36)    NOT NULL,
  `name`        VARCHAR(255)   NOT NULL,
  `code`        VARCHAR(30)    NOT NULL,
  `address`     TEXT           NULL,
  `latitude`    DECIMAL(10,8)  NULL,
  `longitude`   DECIMAL(11,8)  NULL,
  `capacity`    INT            NOT NULL DEFAULT 0,
  `is_active`   TINYINT(1)     NOT NULL DEFAULT 1,
  `created_at`  DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by`  VARCHAR(36)    NULL,
  `updated_by`  VARCHAR(36)    NULL,
  `deleted_at`  DATETIME(3)    NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_polling_stations_code`       (`code`),
  KEY `idx_polling_stations_district_id`      (`district_id`),
  KEY `idx_polling_stations_region_id`        (`region_id`),
  KEY `idx_polling_stations_is_active`        (`is_active`),
  KEY `idx_polling_stations_deleted_at`       (`deleted_at`),
  CONSTRAINT `fk_polling_stations_district`
    FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_polling_stations_region`
    FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- ROLES  (RBAC)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id`          VARCHAR(36)   NOT NULL,
  `code`        ENUM('SUPER_ADMIN','ADMIN','REGIONAL_ADMIN','DISTRICT_ADMIN','STAFF','OBSERVER','VOTER') NOT NULL,
  `name`        VARCHAR(100)  NOT NULL,
  `description` TEXT          NULL,
  `created_at`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`  DATETIME(3)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_code`        (`code`),
  UNIQUE KEY `uq_roles_name`        (`name`),
  KEY `idx_roles_deleted_at`        (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- ROLE PERMISSIONS  (RBAC junction)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id`         VARCHAR(36)  NOT NULL,
  `role_id`    VARCHAR(36)  NOT NULL,
  `permission` ENUM(
    'MANAGE_USERS','MANAGE_ELECTIONS','MANAGE_CANDIDATES','MANAGE_VOTERS',
    'CAST_VOTE','VIEW_RESULTS','MANAGE_REGIONS','MANAGE_DISTRICTS',
    'MANAGE_POLLING_STATIONS','VIEW_AUDIT_LOGS','MANAGE_OBSERVERS','GENERATE_REPORTS'
  ) NOT NULL,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(36)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_permissions_role_perm` (`role_id`, `permission`),
  KEY `idx_role_permissions_role_id`         (`role_id`),
  CONSTRAINT `fk_role_permissions_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`                   VARCHAR(36)  NOT NULL,
  `role_id`              VARCHAR(36)  NOT NULL,
  `full_name`            VARCHAR(255) NOT NULL,
  `username`             VARCHAR(100) NOT NULL,
  `email`                VARCHAR(255) NULL,
  `password_hash`        VARCHAR(255) NOT NULL,
  `status`               ENUM('ACTIVE','SUSPENDED','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `assigned_region_id`   VARCHAR(36)  NULL,
  `assigned_district_id` VARCHAR(36)  NULL,
  `failed_attempts`      INT          NOT NULL DEFAULT 0,
  `lock_until`           DATETIME(3)  NULL,
  `last_login_at`        DATETIME(3)  NULL,
  `last_login_ip`        VARCHAR(45)  NULL,
  `mfa_enabled`          TINYINT(1)   NOT NULL DEFAULT 0,
  `mfa_secret`           VARCHAR(255) NULL,
  `created_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by`           VARCHAR(36)  NULL,
  `updated_by`           VARCHAR(36)  NULL,
  `deleted_at`           DATETIME(3)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username`              (`username`),
  UNIQUE KEY `uq_users_email`                 (`email`),
  KEY `idx_users_role_id`                     (`role_id`),
  KEY `idx_users_status`                      (`status`),
  KEY `idx_users_assigned_region_id`          (`assigned_region_id`),
  KEY `idx_users_assigned_district_id`        (`assigned_district_id`),
  KEY `idx_users_deleted_at`                  (`deleted_at`),
  CONSTRAINT `fk_users_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_users_region`
    FOREIGN KEY (`assigned_region_id`) REFERENCES `regions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_district`
    FOREIGN KEY (`assigned_district_id`) REFERENCES `districts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- VOTERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `voters` (
  `id`                  VARCHAR(36)  NOT NULL,
  `user_id`             VARCHAR(36)  NULL,
  `voter_id`            VARCHAR(50)  NOT NULL,
  `national_id`         VARCHAR(50)  NOT NULL,
  `full_name`           VARCHAR(255) NOT NULL,
  `date_of_birth`       DATE         NOT NULL,
  `gender`              VARCHAR(20)  NULL,
  `phone`               VARCHAR(20)  NULL,
  `email`               VARCHAR(255) NULL,
  `address`             TEXT         NULL,
  `region_id`           VARCHAR(36)  NULL,
  `district_id`         VARCHAR(36)  NULL,
  `polling_station_id`  VARCHAR(36)  NULL,
  `biometric_template`  TEXT         NULL  COMMENT 'AES-256 encrypted biometric data',
  `biometric_hash`      VARCHAR(255) NOT NULL COMMENT 'SHA-256 hash for deduplication',
  `is_verified`         TINYINT(1)   NOT NULL DEFAULT 0,
  `registration_date`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by`          VARCHAR(36)  NULL,
  `updated_by`          VARCHAR(36)  NULL,
  `deleted_at`          DATETIME(3)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_voters_user_id`              (`user_id`),
  UNIQUE KEY `uq_voters_voter_id`             (`voter_id`),
  UNIQUE KEY `uq_voters_national_id`          (`national_id`),
  UNIQUE KEY `uq_voters_biometric_hash`       (`biometric_hash`),
  KEY `idx_voters_region_id`                  (`region_id`),
  KEY `idx_voters_district_id`                (`district_id`),
  KEY `idx_voters_polling_station_id`         (`polling_station_id`),
  KEY `idx_voters_is_verified`                (`is_verified`),
  KEY `idx_voters_deleted_at`                 (`deleted_at`),
  CONSTRAINT `fk_voters_region`
    FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_voters_district`
    FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_voters_polling_station`
    FOREIGN KEY (`polling_station_id`) REFERENCES `polling_stations` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- ELECTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `elections` (
  `id`                  VARCHAR(36)  NOT NULL,
  `title`               VARCHAR(255) NOT NULL,
  `description`         TEXT         NULL,
  `type`                ENUM('PRESIDENTIAL','PARLIAMENTARY','LOCAL','BY_ELECTION','REFERENDUM') NOT NULL,
  `status`              ENUM('DRAFT','SCHEDULED','NOMINATION_OPEN','NOMINATION_CLOSED','CAMPAIGN',
                             'VOTING_OPEN','VOTING_CLOSED','COUNTING','RESULTS_DECLARED',
                             'DISPUTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `nomination_start`    DATETIME(3)  NULL,
  `nomination_end`      DATETIME(3)  NULL,
  `campaign_start`      DATETIME(3)  NULL,
  `campaign_end`        DATETIME(3)  NULL,
  `voting_start`        DATETIME(3)  NULL,
  `voting_end`          DATETIME(3)  NULL,
  `results_at`          DATETIME(3)  NULL,
  `is_national`         TINYINT(1)   NOT NULL DEFAULT 1,
  `max_votes_per_voter` INT          NOT NULL DEFAULT 1,
  `metadata`            JSON         NULL,
  `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by`          VARCHAR(36)  NULL,
  `updated_by`          VARCHAR(36)  NULL,
  `deleted_at`          DATETIME(3)  NULL,
  PRIMARY KEY (`id`),
  KEY `idx_elections_status`                  (`status`),
  KEY `idx_elections_type`                    (`type`),
  KEY `idx_elections_voting_window`           (`voting_start`, `voting_end`),
  KEY `idx_elections_deleted_at`              (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- CANDIDATES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `candidates` (
  `id`           VARCHAR(36)  NOT NULL,
  `election_id`  VARCHAR(36)  NOT NULL,
  `full_name`    VARCHAR(255) NOT NULL,
  `party`        VARCHAR(255) NOT NULL,
  `party_code`   VARCHAR(20)  NULL,
  `bio`          TEXT         NULL,
  `manifesto`    TEXT         NULL,
  `symbol`       VARCHAR(10)  NULL,
  `photo_url`    TEXT         NULL,
  `ballot_order` INT          NULL,
  `status`       ENUM('PENDING','APPROVED','REJECTED','WITHDRAWN','DISQUALIFIED') NOT NULL DEFAULT 'PENDING',
  `region_id`    VARCHAR(36)  NULL,
  `district_id`  VARCHAR(36)  NULL,
  `created_at`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by`   VARCHAR(36)  NULL,
  `updated_by`   VARCHAR(36)  NULL,
  `deleted_at`   DATETIME(3)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_candidates_election_party_region` (`election_id`, `party`, `region_id`),
  KEY `idx_candidates_election_id`            (`election_id`),
  KEY `idx_candidates_status`                 (`status`),
  KEY `idx_candidates_region_id`              (`region_id`),
  KEY `idx_candidates_district_id`            (`district_id`),
  KEY `idx_candidates_deleted_at`             (`deleted_at`),
  CONSTRAINT `fk_candidates_election`
    FOREIGN KEY (`election_id`) REFERENCES `elections` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- VOTING TOKENS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `voting_tokens` (
  `id`             VARCHAR(36)  NOT NULL,
  `election_id`    VARCHAR(36)  NOT NULL,
  `voter_id`       VARCHAR(36)  NOT NULL,
  `issued_to_user` VARCHAR(36)  NULL,
  `token_hash`     VARCHAR(255) NOT NULL COMMENT 'SHA-256 of the raw one-time token',
  `status`         ENUM('UNUSED','USED','EXPIRED','REVOKED') NOT NULL DEFAULT 'UNUSED',
  `issued_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `used_at`        DATETIME(3)  NULL,
  `expires_at`     DATETIME(3)  NOT NULL,
  `ip_address`     VARCHAR(45)  NULL,
  `user_agent`     TEXT         NULL,
  `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_voting_tokens_token_hash`        (`token_hash`),
  UNIQUE KEY `uq_voting_tokens_election_voter`    (`election_id`, `voter_id`),
  KEY `idx_voting_tokens_election_id`             (`election_id`),
  KEY `idx_voting_tokens_voter_id`                (`voter_id`),
  KEY `idx_voting_tokens_status`                  (`status`),
  KEY `idx_voting_tokens_expires_at`              (`expires_at`),
  CONSTRAINT `fk_voting_tokens_election`
    FOREIGN KEY (`election_id`) REFERENCES `elections` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_voting_tokens_voter`
    FOREIGN KEY (`voter_id`) REFERENCES `voters` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_voting_tokens_user`
    FOREIGN KEY (`issued_to_user`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- BALLOTS  (anonymised votes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ballots` (
  `id`                  VARCHAR(36)  NOT NULL,
  `election_id`         VARCHAR(36)  NOT NULL,
  `candidate_id`        VARCHAR(36)  NOT NULL,
  `voting_token_id`     VARCHAR(36)  NOT NULL,
  `voter_id`            VARCHAR(36)  NOT NULL,
  `region_id`           VARCHAR(36)  NOT NULL,
  `district_id`         VARCHAR(36)  NULL,
  `polling_station_id`  VARCHAR(36)  NULL,
  `cast_at`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ip_address`          VARCHAR(45)  NULL,
  `receipt_hash`        VARCHAR(255) NOT NULL COMMENT 'Allows voter to verify their vote was counted',
  `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ballots_voting_token_id`     (`voting_token_id`),
  UNIQUE KEY `uq_ballots_receipt_hash`        (`receipt_hash`),
  KEY `idx_ballots_election_id`               (`election_id`),
  KEY `idx_ballots_candidate_id`              (`candidate_id`),
  KEY `idx_ballots_region_id`                 (`region_id`),
  KEY `idx_ballots_district_id`               (`district_id`),
  KEY `idx_ballots_polling_station_id`        (`polling_station_id`),
  KEY `idx_ballots_cast_at`                   (`cast_at`),
  CONSTRAINT `fk_ballots_election`
    FOREIGN KEY (`election_id`) REFERENCES `elections` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ballots_candidate`
    FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ballots_voting_token`
    FOREIGN KEY (`voting_token_id`) REFERENCES `voting_tokens` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ballots_voter`
    FOREIGN KEY (`voter_id`) REFERENCES `voters` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ballots_region`
    FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ballots_district`
    FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ballots_polling_station`
    FOREIGN KEY (`polling_station_id`) REFERENCES `polling_stations` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- RESULTS  (aggregated tallies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `results` (
  `id`                  VARCHAR(36)    NOT NULL,
  `election_id`         VARCHAR(36)    NOT NULL,
  `candidate_id`        VARCHAR(36)    NOT NULL,
  `region_id`           VARCHAR(36)    NULL,
  `district_id`         VARCHAR(36)    NULL,
  `polling_station_id`  VARCHAR(36)    NULL,
  `total_votes`         INT            NOT NULL DEFAULT 0,
  `valid_votes`         INT            NOT NULL DEFAULT 0,
  `rejected_votes`      INT            NOT NULL DEFAULT 0,
  `percentage`          DECIMAL(5,2)   NOT NULL DEFAULT 0.00,
  `is_winner`           TINYINT(1)     NOT NULL DEFAULT 0,
  `is_final`            TINYINT(1)     NOT NULL DEFAULT 0,
  `computed_at`         DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at`          DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by`          VARCHAR(36)    NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_results_scope` (`election_id`, `candidate_id`, `region_id`, `district_id`, `polling_station_id`),
  KEY `idx_results_election_id`               (`election_id`),
  KEY `idx_results_candidate_id`              (`candidate_id`),
  KEY `idx_results_region_id`                 (`region_id`),
  KEY `idx_results_is_final`                  (`is_final`),
  CONSTRAINT `fk_results_election`
    FOREIGN KEY (`election_id`) REFERENCES `elections` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_results_candidate`
    FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_results_region`
    FOREIGN KEY (`region_id`) REFERENCES `regions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_results_district`
    FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_results_polling_station`
    FOREIGN KEY (`polling_station_id`) REFERENCES `polling_stations` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- AUDIT LOGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`          VARCHAR(36)  NOT NULL,
  `user_id`     VARCHAR(36)  NULL,
  `election_id` VARCHAR(36)  NULL,
  `action`      ENUM('CREATE','READ','UPDATE','DELETE','LOGIN','LOGOUT','VOTE_CAST',
                     'TOKEN_ISSUED','TOKEN_USED','TOKEN_REVOKED','ELECTION_STATE_CHANGE',
                     'RESULT_PUBLISHED','OBSERVER_REPORT_SUBMITTED','SYSTEM_EVENT') NOT NULL,
  `entity`      VARCHAR(100) NOT NULL,
  `entity_id`   VARCHAR(36)  NULL,
  `old_values`  JSON         NULL,
  `new_values`  JSON         NULL,
  `ip_address`  VARCHAR(45)  NULL,
  `user_agent`  TEXT         NULL,
  `description` TEXT         NULL,
  `created_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_id`                (`user_id`),
  KEY `idx_audit_logs_election_id`            (`election_id`),
  KEY `idx_audit_logs_action`                 (`action`),
  KEY `idx_audit_logs_entity`                 (`entity`, `entity_id`),
  KEY `idx_audit_logs_created_at`             (`created_at`),
  CONSTRAINT `fk_audit_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_audit_logs_election`
    FOREIGN KEY (`election_id`) REFERENCES `elections` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- OBSERVER REPORTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `observer_reports` (
  `id`                  VARCHAR(36)  NOT NULL,
  `election_id`         VARCHAR(36)  NOT NULL,
  `observer_id`         VARCHAR(36)  NOT NULL,
  `polling_station_id`  VARCHAR(36)  NULL,
  `type`                ENUM('INCIDENT','IRREGULARITY','COMPLAINT','GENERAL_OBSERVATION') NOT NULL,
  `status`              ENUM('SUBMITTED','UNDER_REVIEW','RESOLVED','DISMISSED') NOT NULL DEFAULT 'SUBMITTED',
  `title`               VARCHAR(255) NOT NULL,
  `description`         TEXT         NOT NULL,
  `evidence_urls`       JSON         NULL,
  `resolved_by`         VARCHAR(36)  NULL,
  `resolved_at`         DATETIME(3)  NULL,
  `resolution`          TEXT         NULL,
  `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`          DATETIME(3)  NULL,
  PRIMARY KEY (`id`),
  KEY `idx_observer_reports_election_id`      (`election_id`),
  KEY `idx_observer_reports_observer_id`      (`observer_id`),
  KEY `idx_observer_reports_polling_station`  (`polling_station_id`),
  KEY `idx_observer_reports_type`             (`type`),
  KEY `idx_observer_reports_status`           (`status`),
  KEY `idx_observer_reports_deleted_at`       (`deleted_at`),
  CONSTRAINT `fk_observer_reports_election`
    FOREIGN KEY (`election_id`) REFERENCES `elections` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_observer_reports_observer`
    FOREIGN KEY (`observer_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_observer_reports_polling_station`
    FOREIGN KEY (`polling_station_id`) REFERENCES `polling_stations` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         VARCHAR(36)  NOT NULL,
  `user_id`    VARCHAR(36)  NOT NULL,
  `type`       ENUM('EMAIL','SMS','IN_APP','PUSH') NOT NULL,
  `status`     ENUM('PENDING','SENT','DELIVERED','FAILED','READ') NOT NULL DEFAULT 'PENDING',
  `subject`    VARCHAR(255) NOT NULL,
  `body`       TEXT         NOT NULL,
  `metadata`   JSON         NULL,
  `sent_at`    DATETIME(3)  NULL,
  `read_at`    DATETIME(3)  NULL,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id`             (`user_id`),
  KEY `idx_notifications_status`              (`status`),
  KEY `idx_notifications_type`                (`type`),
  KEY `idx_notifications_created_at`          (`created_at`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- SEED: Default roles
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `roles` (`id`, `code`, `name`, `description`) VALUES
  (UUID(), 'SUPER_ADMIN',     'Super Administrator',  'Full system access'),
  (UUID(), 'ADMIN',           'Administrator',        'National-level admin'),
  (UUID(), 'REGIONAL_ADMIN',  'Regional Admin',       'Manages a single region'),
  (UUID(), 'DISTRICT_ADMIN',  'District Admin',       'Manages a single district'),
  (UUID(), 'STAFF',           'Election Staff',       'Polling station staff'),
  (UUID(), 'OBSERVER',        'Election Observer',    'Accredited observer'),
  (UUID(), 'VOTER',           'Voter',                'Registered voter');

SET FOREIGN_KEY_CHECKS = 1;
