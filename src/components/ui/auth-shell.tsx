import Link from "next/link";

/**
 * The split panel shared by the password-recovery screens, matching the
 * sign-in page so the flow feels continuous.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF7EE] p-4 md:p-8">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-lg border border-[#E4DCC8] bg-white md:min-h-[560px] md:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-b from-[#123057] to-[#123059] p-11 text-white md:flex">
          <Link
            href="/"
            className="relative z-10 flex items-center gap-2.5 text-xl"
          >
            <span className="inline-block size-[9px] rounded-full bg-[#FDB913]" />
            INSURE
          </Link>

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -bottom-[70px] -right-[70px] size-[260px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#FDB913_0%,#C98A00_55%,transparent_72%)] opacity-90" />
          </div>

          <div className="relative z-10 max-w-[340px] -translate-y-6">
            <h2 className="mb-4 text-4xl font-extrabold leading-snug">
              <span className="block">BACK ON</span>
              <span className="block text-[#FDB913]">TRACK.</span>
            </h2>
            <p className="text-base font-semibold leading-relaxed">
              Your progress is safe. Let&apos;s get you back into your review.
            </p>
          </div>

          <div className="relative z-10 -translate-y-6 text-lg text-[#FDB913]">
            <div>DAILY ACTIONS.</div>
            <div>BIG RESULTS.</div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-9 md:min-h-[560px] md:p-12">
          <Link
            href="/"
            className="mb-6 flex items-center gap-2 text-lg text-[#0B2340] md:hidden"
          >
            <span className="inline-block size-2 rounded-full bg-[#FDB913]" />
            INSURE
          </Link>

          <h1 className="mb-2 text-4xl font-extrabold text-[#0B2340]">
            {title}
          </h1>
          <p className="mb-8 text-base text-[#5B6472]">{subtitle}</p>

          {children}

          {footer && <div className="mt-8 text-center text-base">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
