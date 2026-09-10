"use client";

import { AuthShell } from "@/components/ui/auth-shell";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setDevLink("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(formData.get("email") ?? "") }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setMessage(data.message);
      if (data.resetUrl) setDevLink(data.resetUrl);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter the email you signed up with and we'll send you a link to reset your password."
      footer={
        <span className="text-[#5B6472]">
          Remembered it?{" "}
          <Link href="/" className="font-bold text-[#0B2340] hover:underline">
            Back to sign in
          </Link>
        </span>
      }
    >
      <form className="space-y-[18px]" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-semibold text-[#10151F]"
          >
            Email address
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-4 text-[#A9A092]"
              aria-hidden="true"
            />
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              className="block w-full border border-[#E4DCC8] bg-white py-3 pl-10 pr-3 text-base text-[#10151F] outline-none transition placeholder:text-[#A9A092] focus:border-[#0B2340] focus:ring-4 focus:ring-[#0B2340]/10"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {message && (
          <div
            className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            <p>{message}</p>

            {devLink && (
              <p className="mt-2 break-all">
                <span className="font-semibold">
                  No email went out — the mailer is not configured here. Use
                  this link:
                </span>
                <br />
                <Link
                  href={devLink}
                  className="font-semibold text-[#0B2340] underline"
                >
                  {devLink}
                </Link>
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          aria-busy={isSubmitting}
          disabled={isSubmitting}
          className="mt-1.5 flex w-full items-center justify-center gap-2 bg-[#FDB913] px-4 py-3.5 text-base font-semibold text-[#0B2340] shadow-sm transition-colors hover:bg-[#C98A00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2340] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <Spinner />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}
