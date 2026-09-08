import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { HelpPage } from "./HelpPage";

export const metadata: Metadata = {
  title: "Help — INSURE",
  description:
    "Answers to common questions about studying, locked exams, accounts and support.",
};

// Public on purpose: someone locked out of their account is exactly who needs
// this page, so it must render without a session.
export default async function Page() {
  const session = await auth();
  return <HelpPage signedIn={Boolean(session?.user)} />;
}
