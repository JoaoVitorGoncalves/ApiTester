CREATE TABLE IF NOT EXISTS collections (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workspace_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_collections_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
  INDEX idx_collections_workspace_created (workspace_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  collection_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  spec JSON NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_saved_requests_collection
    FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE,
  INDEX idx_saved_requests_collection (collection_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
