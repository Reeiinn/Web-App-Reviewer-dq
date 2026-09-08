/**
 * What a registration invite creates, and who may spend it.
 *
 * An invite used to mean one thing — a reviewee under whoever made the link.
 * Now it carries the role it grants and, when it was addressed to somebody, the
 * address that may claim it.
 */

export type InviteRole = "USER" | "MANAGER";

export const inviteRoles: readonly InviteRole[] = ["USER", "MANAGER"];

export const isInviteRole = (value: unknown): value is InviteRole =>
  typeof value === "string" && inviteRoles.includes(value as InviteRole);

/**
 * The one comparison every address in this file goes through: an invite
 * addressed to "Rene@Example.com " is claimed by "rene@example.com".
 */
export const normaliseEmail = (value: string) => value.trim().toLowerCase();

export type InviteCheck = { ok: true } | { ok: false; error: string };

/**
 * Whether the person signing up is the person the invite was addressed to.
 *
 * An invite with no address is the open link a reviewee invite has always
 * been: anyone holding it may spend it. An addressed one is bound, so a
 * forwarded link stays useless to whoever it was forwarded to.
 */
export function claimantMatches(
  inviteEmail: string | null,
  signupEmail: string,
): InviteCheck {
  if (!inviteEmail) return { ok: true };

  return normaliseEmail(inviteEmail) === normaliseEmail(signupEmail)
    ? { ok: true }
    : {
        ok: false,
        error: "This invitation was sent to a different email address.",
      };
}

/**
 * Whether this account may hand out an invite for that role.
 *
 * A Field Manager cannot mint peers: staff are appointed from above, and a
 * console that let one manager create another would put the shape of the
 * hierarchy in the hands of everyone in it.
 */
export function canInvite(
  senderRole: string | undefined,
  role: InviteRole,
): InviteCheck {
  if (senderRole !== "ADMIN" && senderRole !== "MANAGER") {
    return { ok: false, error: "Only managers can create invitations." };
  }

  if (role === "MANAGER" && senderRole !== "ADMIN") {
    return {
      ok: false,
      error: "Only the Sales Manager can invite a Field Manager.",
    };
  }

  return { ok: true };
}

/**
 * Who the new account reports to.
 *
 * A reviewee belongs to whoever recruited them — that link is the roster. A
 * Field Manager stands alone, like every other staff row, so the console reads
 * them as a peer of the Sales Manager rather than a report.
 */
export const managerForInvite = (role: InviteRole, invitedBy: string) =>
  role === "MANAGER" ? null : invitedBy;
