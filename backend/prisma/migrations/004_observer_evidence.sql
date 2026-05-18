-- =============================================================================
-- NEHS — National Election Handling System
-- SQL Migration 004 — Observer Evidence
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE TABLE IF NOT EXISTS `observer_evidence` (
  `id`            VARCHAR(36)  NOT NULL,
  `report_id`     VARCHAR(36)  NULL,
  `uploaded_by`   VARCHAR(36)  NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_name`     VARCHAR(255) NOT NULL,
  `mime_type`     VARCHAR(100) NOT NULL,
  `file_size`     INT          NOT NULL,
  `storage_path`  VARCHAR(500) NOT NULL,
  `public_url`    VARCHAR(500) NOT NULL,
  `checksum`      VARCHAR(64)  NULL,
  `caption`       VARCHAR(255) NULL,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at`    DATETIME(3)  NULL,
  PRIMARY KEY (`id`),
  KEY `idx_observer_evidence_report_id` (`report_id`),
  KEY `idx_observer_evidence_uploaded_by` (`uploaded_by`),
  KEY `idx_observer_evidence_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_observer_evidence_report`
    FOREIGN KEY (`report_id`) REFERENCES `observer_reports` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_observer_evidence_uploader`
    FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;