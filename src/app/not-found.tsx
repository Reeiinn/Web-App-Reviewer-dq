"use client";

import { AppNav } from "@/components/ui/app-nav";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="shrink-0">
        <AppNav />
      </div>

      <main className="rv-shell min-h-0 flex-1 overflow-clip py-4 sm:py-6 flex items-center justify-center">
        <div className="w-full max-w-2xl px-4">
          {/* Decorative Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -right-32 top-0 size-64 rounded-full bg-[radial-gradient(circle_at_35%_30%,#FDB913_0%,transparent_72%)] opacity-10" />
            <div className="absolute -left-32 -bottom-32 size-64 rounded-full bg-[radial-gradient(circle_at_35%_30%,#0B2340_0%,transparent_72%)] opacity-5" />
          </div>

          <div className="relative">
            {/* Main Card */}
            <div className="rv-card p-6 sm:p-8 lg:p-10 text-center">
              {/* 404 Number - Big and Bold */}
              <div className="mb-2">
                <span className="text-8xl sm:text-9xl font-black text-[#0B2340] opacity-10">
                  404
                </span>
              </div>

              {/* Icon */}
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-[#FFF8D6] p-4">
                  <AlertCircle className="size-12 text-[#FDB913]" />
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B2340] mb-3">
                Page Lost in Translation
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                We couldn't find the page you're looking for. It might've been
                moved or never existed. Let's get you back on track.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 bg-[#FDB913] hover:bg-[#E8C200] px-8 py-3 text-base font-bold text-[#0B2340] rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  <ArrowLeft className="size-4" />
                  Back to Dashboard
                </Link>
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 border-2 border-[#0B2340] hover:bg-[#0B2340] hover:text-white px-8 py-3 text-base font-bold text-[#0B2340] rounded-lg transition-all duration-200"
                >
                  Go Home
                </Link>
              </div>

              {/* Divider */}
              <div className="mb-8 h-px bg-border" />

              {/* Quick Navigation */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">
                  Quick Navigation
                </p>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  <Link
                    href="/about"
                    className="px-3 py-1.5 rounded-md text-sm font-semibold text-[#0B2340] hover:bg-[#FFF8D6] transition"
                  >
                    About
                  </Link>
                  <Link
                    href="/help"
                    className="px-3 py-1.5 rounded-md text-sm font-semibold text-[#0B2340] hover:bg-[#FFF8D6] transition"
                  >
                    Help
                  </Link>
                  <Link
                    href="/privacy"
                    className="px-3 py-1.5 rounded-md text-sm font-semibold text-[#0B2340] hover:bg-[#FFF8D6] transition"
                  >
                    Privacy
                  </Link>
                  <Link
                    href="/terms"
                    className="px-3 py-1.5 rounded-md text-sm font-semibold text-[#0B2340] hover:bg-[#FFF8D6] transition"
                  >
                    Terms
                  </Link>
                </div>
              </div>
            </div>

            {/* Motivational Message */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground italic">
                Every wrong turn brings you closer to the right path.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
