/**
 * Outbound email, over Resend's HTTP API.
 *
 * Called through fetch rather than the SDK: one POST with a JSON body is the
 * whole contract, and a dependency for that would be a dependency to keep
 * current for nothing.
 *
 * A missing key is not an error. The app has run without a mailer since it was
 * built — password reset already falls back to handing the link straight back
 * — so a caller gets "not sent" and decides what to do about it, and nothing
 * about the surrounding flow breaks when the key is absent.
 */

export type MailResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "failed"; detail?: string };

export const mailerConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<MailResult> {
  if (!mailerConfigured()) return { sent: false, reason: "not-configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [to],
        subject,
        text,
        ...(html ? { html } : {}),
      }),
    });

    if (!response.ok) {
      // The body carries Resend's own reason — a domain that is not verified,
      // a rejected address — which is what the caller needs to see.
      const detail = await response.text().catch(() => "");
      console.error("Mail send failed:", response.status, detail);
      return { sent: false, reason: "failed", detail };
    }

    return { sent: true };
  } catch (error) {
    console.error("Mail send failed:", error);
    return { sent: false, reason: "failed" };
  }
}
