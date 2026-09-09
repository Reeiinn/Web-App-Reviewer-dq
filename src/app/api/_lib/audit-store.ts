import pool from "@/lib/db";

/**
 * A record of what a staff account did to a learner's account.
 *
 * Removal used to leave nothing behind: the row was deleted, everything
 * cascaded, and the question "who removed this person, and when" had no answer
 * in the database. Actions are written here first, and the actor's and target's
 * details are copied in at the time so the record still reads years later,
 * after either account has gone.
 *
 * Writing a record must never be the reason an action fails, so a failure here
 * is logged and swallowed. It is a record, not a gate.
 */
export type AdminAction = "reviewee.removed" | "reviewee.restored";

export async function recordAdminAction(entry: {
  actor: { id: string; email: string; role: string };
  action: AdminAction;
  target: { id: string; email: string | null; name: string | null };
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO admin_actions
         (actor_id, actor_email, actor_role, action,
          target_id, target_email, target_name, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        entry.actor.id,
        entry.actor.email,
        entry.actor.role,
        entry.action,
        entry.target.id,
        entry.target.email,
        entry.target.name,
        JSON.stringify(entry.detail ?? {}),
      ],
    );
  } catch (error) {
    console.error("Failed to record admin action:", entry.action, error);
  }
}
