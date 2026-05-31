CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uk_users_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE workspaces
  ADD COLUMN owner_user_id CHAR(36) NULL AFTER name,
  ADD CONSTRAINT fk_workspaces_owner
    FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE;
