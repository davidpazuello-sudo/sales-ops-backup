export const domainEntities = {
  users: {
    table: "users",
    primaryKey: "id",
    fields: ["id", "email", "full_name", "role_id", "hubspot_owner_id", "status", "created_at", "updated_at"],
  },
  roles: {
    table: "roles",
    primaryKey: "id",
    fields: ["id", "slug", "label", "scope", "created_at", "updated_at"],
  },
  sellers: {
    table: "sellers",
    primaryKey: "id",
    fields: ["id", "user_id", "hubspot_owner_id", "team_name", "status", "created_at", "updated_at"],
  },
  deals: {
    table: "deals",
    primaryKey: "id",
    fields: ["id", "hubspot_deal_id", "seller_id", "stage_id", "name", "amount", "close_date", "last_activity_at", "status", "created_at", "updated_at"],
  },
  stages: {
    table: "stages",
    primaryKey: "id",
    fields: ["id", "pipeline_id", "hubspot_stage_id", "label", "position", "is_closed", "created_at", "updated_at"],
  },
  notifications: {
    table: "notifications",
    primaryKey: "id",
    fields: ["id", "user_id", "title", "body", "read_at", "trash_at", "source", "created_at"],
  },
  meetings: {
    table: "meetings",
    primaryKey: "id",
    fields: ["id", "seller_id", "deal_id", "title", "type", "meeting_at", "recording_url", "source", "created_at", "updated_at"],
  },
  tasks: {
    table: "tasks",
    primaryKey: "id",
    fields: ["id", "deal_id", "owner_user_id", "title", "status", "due_at", "completed_at", "source", "created_at", "updated_at"],
  },
  audit_logs: {
    table: "audit_logs",
    primaryKey: "id",
    fields: ["id", "actor_user_id", "entity_type", "entity_id", "action", "payload", "created_at"],
  },
};

export function getDomainEntityNames() {
  return Object.keys(domainEntities);
}
