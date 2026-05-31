CREATE TABLE IF NOT EXISTS history_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  method VARCHAR(10) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  status INT NOT NULL,
  duration_ms INT UNSIGNED NOT NULL,
  spec JSON NOT NULL,
  response JSON NOT NULL,
  curl TEXT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_history_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  INDEX idx_history_workspace_created (workspace_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
