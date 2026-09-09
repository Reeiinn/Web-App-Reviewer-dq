import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { TermsPage } from "./TermsPage";

export const metadata: Metadata = {
  title: "Terms & Conditions — INSURE",
  description:
    "The rules for using INSURE: who may use it, what it does not promise, and what an INSURE certificate means.",
};

// Public on purpose, same as Privacy: these are the terms you agree to by
// registering, so they have to be readable before you do.
export default async function Page() {
  const session = await auth();
  return <TermsPage signedIn={Boolean(session?.user)} />;
}
