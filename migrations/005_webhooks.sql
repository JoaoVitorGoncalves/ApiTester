CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  secret_hash VARCHAR(255) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  response_status INT NULL,
  response_body TEXT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_webhook_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  INDEX idx_webhook_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_receipts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  webhook_id CHAR(36) NOT NULL,
  workspace_id CHAR(36) NOT NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(2048) NOT NULL,
  query_json JSON NOT NULL,
  headers_json JSON NOT NULL,
  body_text MEDIUMTEXT NULL,
  body_truncated TINYINT(1) NOT NULL DEFAULT 0,
  response_status INT NOT NULL,
  client_ip VARCHAR(45) NULL,
  received_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_receipt_webhook
    FOREIGN KEY (webhook_id) REFERENCES webhook_endpoints (id) ON DELETE CASCADE,
  CONSTRAINT fk_receipt_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  INDEX idx_receipt_workspace_received (workspace_id, received_at DESC),
  INDEX idx_receipt_webhook_received (webhook_id, received_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
