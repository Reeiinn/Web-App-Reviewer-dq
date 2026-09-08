/**
 * The facts the Privacy Policy and the Terms both have to state, kept in one
 * place so the two documents can never disagree about when they last changed
 * or where to write to.
 *
 * `LEGAL_LAST_UPDATED` is the date the wording last changed, not a build
 * stamp: a reader comparing it against the version they agreed to needs it to
 * stay put until someone actually edits the prose. Update it by hand when you
 * do.
 */
export const LEGAL_LAST_UPDATED = "9 September 2026";

/** Same address the Help page publishes, and the one both documents point to. */
export const LEGAL_CONTACT_EMAIL = "insureph26@gmail.com";

/**
 * What the documents call the service. There is no registered entity behind
 * INSURE to name, so they name the service and stop there rather than imply a
 * company that does not exist.
 */
export const LEGAL_SERVICE_NAME = "INSURE";
