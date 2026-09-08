"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { landingFor } from "@/lib/helper/roles";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setIsSubmitting(false);
      setError("Invalid email or password. Please try again.");
      return;
    }

    // signIn with redirect:false resolves before the session is readable, so
    // the role that decides where to land is fetched rather than assumed.
    const session = await getSession();
    const target = landingFor(session?.user?.role);

    // Straight through to the landing page. The button keeps its spinner
    // until the route changes, so the form cannot be submitted twice on the
    // way out.
    router.replace(target);
    router.refresh();
  }

  return (
    <div className="min-h-screen-safe app-gutter flex items-center justify-center bg-[#FBF7EE] py-6 sm:py-10">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-lg border border-[#E4DCC8] bg-white lg:min-h-[560px] lg:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden bg-gradient-to-b from-[#123057] to-[#123059] p-8 text-white lg:flex xl:p-11">
          <div className="flex items-center gap-2.5 text-xl relative z-10">
            <span className="inline-block w-[9px] h-[9px] rounded-full bg-[#FDB913]" />
            INSURE
          </div>

        
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute -right-[70px] -bottom-[70px] size-[260px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#FDB913_0%,#C98A00_55%,transparent_72%)] opacity-90"
            />
          </div>

          <div className="relative z-10 max-w-[340px] -translate-y-6">
            <h1 className="mb-4 text-3xl leading-snug xl:text-4xl">
              <span className="block text-white font-extrabold ">OUR TARGET.</span>
              <span className="block text-[#FDB913] font-extrabold">OUR WIN.</span>
            </h1>
            <p className="text-base font-semibold leading-relaxed text-white">
              &quot;Every action counts. Every conversation matters. Every submission brings us closer to our dreams.&quot;
            </p>
            <p className="mt-4 text-2xl font-semibold italic text-[#FDB913] xl:text-3xl">
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

   
        <div className="flex flex-col justify-start p-6 sm:p-8 lg:min-h-[560px] lg:p-12">
       
          <div className="mb-6 flex items-center gap-2 text-lg text-[#0B2340] lg:hidden">
            <span className="inline-block w-[8px] h-[8px] rounded-full bg-[#FDB913]" />
            INSURE
          </div>

          <h1 className="mb-2 text-display text-[#0B2340]">Welcome!</h1>
          <p className="mb-6 text-base text-[#5B6472] sm:mb-8">
            Sign in to continue your insurance licensing journey.
          </p>

          <form className="space-y-[18px]" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[#10151F] mb-1.5"
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
                  className="block w-full pl-10 pr-3 py-3 border border-[#E4DCC8] bg-white text-[#10151F] placeholder-[#A9A092] text-base outline-none transition focus:border-[#0B2340] focus:ring-4 focus:ring-[#0B2340]/10"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-[#10151F]"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-[#0B2340] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-4 text-[#A9A092]"
                  aria-hidden="true"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  className="block w-full border border-[#E4DCC8] bg-white py-3 pl-10 pr-12 text-base text-[#10151F] placeholder-[#A9A092] outline-none transition focus:border-[#0B2340] focus:ring-4 focus:ring-[#0B2340]/10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-1 flex w-11 items-center justify-center text-[#A9A092] transition hover:text-[#0B2340]"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1.5 flex min-h-12 w-full items-center justify-center gap-2 bg-[#FDB913] px-4 py-3.5 text-base text-[#0B2340] shadow-sm transition-colors hover:bg-[#C98A00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2340] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {isSubmitting ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="mt-6 text-center text-base text-[#5B6472] sm:mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#0B2340] font-bold hover:underline">
              Create account
            </Link>
          </div>
          {/* Reachable without an account on purpose: someone who cannot get
              past this screen is exactly who needs Help. */}
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-[#5B6472]">
            <Link href="/about" className="font-semibold hover:text-[#0B2340] hover:underline">
              About
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/help" className="font-semibold hover:text-[#0B2340] hover:underline">
              Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}