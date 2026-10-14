ALTER TABLE users
ADD COLUMN manager_id UUID REFERENCES users(id);
CREATE INDEX idx_users_manager_id ON users(manager_id);