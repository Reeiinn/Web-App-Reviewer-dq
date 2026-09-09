/**
 * Fetch options for a read that must come from the server.
 *
 * The API used to answer study requests with
 * "Cache-Control: public, max-age=31536000, immutable", which a browser is
 * entitled to hold for the year without ever asking again. The header is gone,
 * but a response already in a learner's cache is still immutable to them and
 * will not revalidate on its own — mastery counts stay frozen and a deleted
 * sitting keeps resuming. `cache: "no-store"` goes to the network regardless,
 * so those readers recover on their next visit rather than on the header's
 * expiry.
 *
 * Worth keeping afterwards: every one of these reads is per-learner and changes
 * as they study, so none of them wants a cached copy in the first place.
 */
export const fresh: RequestInit = { cache: "no-store" };
