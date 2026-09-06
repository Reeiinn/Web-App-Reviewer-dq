"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SignupPage({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      code: initialCode,
    };
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(
        data.error ?? "Unable to create your account. Please try again.",
      );
      setIsSubmitting(false);
      return;
    }
    const signInResult = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setIsSubmitting(false);

    if (signInResult?.error) {
      setError("Signup succeeded, but automatic login failed. Please log in manually.");
      return;
    }

    setSuccess("Account created successfully! Redirecting to your dashboard...");
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 1000);
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBF8F1] p-3 sm:p-6">
      <div className="grid w-full max-w-[1120px] overflow-hidden rounded-lg border border-[#E5DDCF] bg-white shadow-sm md:grid-cols-[1.03fr_0.97fr]">
        <div className="relative hidden min-h-[620px] overflow-hidden bg-[#183A63] p-10 text-white sm:p-12 md:flex md:flex-col md:justify-between">
          <div className="flex items-center gap-2.5 text-xl relative z-10">
            <span className="inline-block w-[9px] h-[9px] rounded-full bg-[#FDB913]" />
            INSURE
          </div>

          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute -right-[70px] -bottom-[70px] size-[260px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#FDB913_0%,#C98A00_55%,transparent_72%)] opacity-90"
            />
          </div>

          <div className="relative z-10 max-w-[390px]">
            <h1 className="text-4xl font-extrabold leading-tight mb-5">
              <span className="block text-white font-extrabold">OUR TARGET.</span>
              <span className="block text-[#FDB913] font-extrabold">OUR WIN.</span>
            </h1>
            <p className="text-base font-semibold leading-6 text-white">
              &quot;Every action counts. Every conversation matters. Every submission brings us closer to our dreams.&quot;
            </p>
            <p className="mt-4 text-3xl font-semibold italic text-[#FDB913]">
              Let&apos;s do this, Team!
            </p>
          </div>

          <div className="relative z-10 flex gap-6 mt-7 -translate-y-6">
            <div>
              <div className="text-lg text-[#FDB913]">DAILY ACTIONS.</div>
              <div className="text-lg text-[#FDB913]">BIG RESULTS.</div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[620px] flex-col justify-center bg-white px-8 py-12 sm:px-12 lg:px-16">
          <div className="flex md:hidden items-center gap-2 text-lg mb-6 text-[#0B2340]">
            <span className="inline-block w-[8px] h-[8px] rounded-full bg-[#FDB913]" />
            INSURE
          </div>

          <h1 className="max-w-[380px] text-5xl font-normal leading-none tracking-tight text-[#0B2340]">Create your account</h1>
          <p className="mb-8 mt-4 max-w-[340px] text-base leading-6 text-[#66717D]">
            Start your insurance licensing journey with INSURE.
          </p>

          {/* Registration is invite-only: /api/auth/register claims a row in
              registration_invites and takes the new user's manager from it, so
              a signup without a code can only ever be rejected. Say that up
              front instead of showing a form that cannot succeed. */}
          {!initialCode && (
            <div className="max-w-[440px] border border-[#E5DDCF] bg-[#FBF8F1] p-4 sm:p-6">
              <p className="text-base font-semibold text-[#0B2340]">
                You need an invitation link
              </p>
              <p className="mt-2 text-sm leading-6 text-[#66717D]">
                Accounts are created from an invitation link sent by your admin
                or manager. Ask them for one, then open it to finish signing up.
              </p>
            </div>
          )}

          {initialCode && (
          <form className="max-w-[440px] space-y-[18px]" onSubmit={handleSubmit}>
          <Field
            id="name"
            label="Full Name"
            type="text"
            autoComplete="name"
            placeholder="Enter your name"
            icon={<UserRound className="size-4" />}
          />
          <Field
            id="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            icon={<Mail className="size-4" />}
          />
          <Field
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            icon={<LockKeyhole className="size-4" />}
            trailingAction={
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
                className="flex items-center justify-center text-[#A9A092] transition hover:text-[#0B2340]"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-700" role="status">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1.5 flex w-full items-center justify-center gap-2 bg-[#FDB913] px-4 py-3.5 text-base text-[#0B2340] shadow-sm transition-colors hover:bg-[#D99D00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2340] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
            ) : (
                <ArrowRight className="size-4" />
            )}
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
          </form>
          )}
          <p className="mt-8 max-w-[440px] text-center text-base text-[#66717D]">
            Already have an account?{" "}
            <Link href="/" className="font-bold text-[#0B2340] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  icon,
  trailingAction,
  ...inputProps
}: React.ComponentProps<"input"> & {
  id: string;
  label: string;
  icon: React.ReactNode;
  trailingAction?: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-[#10151F]"
      >
        {label}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center justify-center text-[#A9A092]"
          aria-hidden="true"
        >
          {icon}
        </span>
        <input
          id={id}
          name={id}
          required
          className="block w-full pl-10 pr-10 py-3 border border-[#E4DCC8] bg-white text-[#10151F] placeholder-[#A9A092] text-base outline-none transition focus:border-[#0B2340] focus:ring-4 focus:ring-[#0B2340]/10"
          {...inputProps}
        />
        {trailingAction && (
          <span className="absolute inset-y-0 right-3.5 flex items-center justify-center">
            {trailingAction}
          </span>
        )}
      </div>
    </div>
  );
}
