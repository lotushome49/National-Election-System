-- =============================================================================
-- NEHS — National Election Handling System
-- SQL Migration 002 — User Sessions
-- Engine: MySQL 8.0+  |  UUID PKs  |  Session tracking  |  Refresh token rotation
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ---------------------------------------------------------------------------
-- USER SESSIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id`           VARCHAR(36)   NOT NULL,
  `user_id`      VARCHAR(36)   NOT NULL,
  `status`       ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `ip_address`   VARCHAR(45)   NULL,
  `user_agent`   VARCHAR(255)  NULL,
  `last_seen_at`  DATETIME(3)   NULL,
  `expires_at`    DATETIME(3)   NOT NULL,
  `revoked_at`    DATETIME(3)   NULL,
  `created_at`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_user_sessions_user_id` (`user_id`),
  KEY `idx_user_sessions_status` (`status`),
  KEY `idx_user_sessions_expires_at` (`expires_at`),
  CONSTRAINT `fk_user_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- REFRESH TOKENS (session scoped)
-- ---------------------------------------------------------------------------
ALTER TABLE `refresh_tokens`
  DROP FOREIGN KEY `refresh_tokens_ibfk_1`;

ALTER TABLE `refresh_tokens`
  DROP COLUMN `user_id`,
  ADD COLUMN `session_id` VARCHAR(36) NOT NULL AFTER `id`,
  ADD UNIQUE KEY `uq_refresh_tokens_session_id` (`session_id`),
  ADD CONSTRAINT `fk_refresh_tokens_session`
    FOREIGN KEY (`session_id`) REFERENCES `user_sessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;