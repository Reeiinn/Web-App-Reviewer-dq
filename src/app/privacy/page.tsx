import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { PrivacyPage } from "./PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy Policy — INSURE",
  description:
    "What INSURE records about you, who can see it, where it is processed, and your rights under the Data Privacy Act.",
};

// Public on purpose: someone deciding whether to register has to be able to
// read this before there is an account to read it with. Left out of the
// middleware matcher for the same reason. The session only decides which
// header the page wears.
export default async function Page() {
  const session = await auth();
  return <PrivacyPage signedIn={Boolean(session?.user)} />;
}
