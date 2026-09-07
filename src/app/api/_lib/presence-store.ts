import pool from "@/lib/db";

/**
 * Records that a staff account just loaded a screen.
 *
 * The avatar lookup behind AppNav is what every screen calls on load, so
 * stamping from the routes the app already hits answers "did they open it"
 * without the browser having to ping anything. What it marks is arrival, not
 * presence: a screen left open all morning still reads as the single visit
 * that loaded it.
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
