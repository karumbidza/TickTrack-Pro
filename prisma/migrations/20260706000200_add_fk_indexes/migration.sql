-- Add missing indexes on foreign-key columns (Postgres does not auto-index FKs).
-- Speeds up per-ticket chat/attachment/history lookups and asset history queries.
CREATE INDEX "messages_ticketId_idx" ON "messages"("ticketId");
CREATE INDEX "messages_userId_idx" ON "messages"("userId");
CREATE INDEX "attachments_ticketId_idx" ON "attachments"("ticketId");
CREATE INDEX "attachments_messageId_idx" ON "attachments"("messageId");
CREATE INDEX "attachments_uploadedById_idx" ON "attachments"("uploadedById");
CREATE INDEX "status_history_ticketId_idx" ON "status_history"("ticketId");
CREATE INDEX "asset_history_assetId_idx" ON "asset_history"("assetId");
CREATE INDEX "maintenance_history_assetId_idx" ON "maintenance_history"("assetId");
CREATE INDEX "maintenance_history_ticketId_idx" ON "maintenance_history"("ticketId");
