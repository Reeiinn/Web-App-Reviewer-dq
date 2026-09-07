import pool from "@/lib/db";

/**
 * Records that a staff account just loaded a screen.
 *
 * The roster query is what an admin or a field manager hits by simply opening
 * /admin, so stamping from the routes the console already calls answers "did
 * they open the app" without the browser having to ping anything. What it
 * marks is arrival, not presence: a console left open all morning still reads
 * as the single visit that loaded it.
 *
 * Callers pass the signed-in account and nothing else, so this can only ever
 * stamp whoever made the request.
 */
export async function touchLastSeen(userId: string): Promise<void> {
  try {
    await pool.query(`UPDATE users SET last_seen_at = now() WHERE id = $1`, [
      userId,
    ]);
  } catch (error) {
    // Presence is a nicety on somebody else's screen. Losing a stamp must not
    // cost the caller the roster they actually asked for.
    console.error("Error recording last seen:", error);
  }
}
