-- =============================================================================
-- NEHS — National Election Handling System
-- SQL Migration 003 — Password Reset Tokens
-- Engine: MySQL 8.0+  |  UUID PKs  |  Token expiry and single-use lifecycle
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`                    VARCHAR(36)  NOT NULL,
  `user_id`               VARCHAR(36)  NOT NULL,
  `token_hash`            VARCHAR(255) NOT NULL,
  `expires_at`            DATETIME(3)  NOT NULL,
  `used_at`               DATETIME(3)  NULL,
  `revoked_at`            DATETIME(3)  NULL,
  `requested_ip`          VARCHAR(45)  NULL,
  `requested_user_agent`  VARCHAR(255) NULL,
  `created_at`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_reset_tokens_user_id` (`user_id`),
  KEY `idx_password_reset_tokens_expires_at` (`expires_at`),
  KEY `idx_password_reset_tokens_used_at` (`used_at`),
  CONSTRAINT `fk_password_reset_tokens_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;