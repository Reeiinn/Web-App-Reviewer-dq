import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { AboutPage } from "./AboutPage";

export const metadata: Metadata = {
  title: "About — INSURE",
  description:
    "What INSURE covers, the four exam tracks, and how mastery and certificates work.",
};

// Public on purpose: no redirect here, and the route is left out of the
// middleware matcher. The session only decides which header the page wears.
export default async function Page() {
  const session = await auth();
  return <AboutPage signedIn={Boolean(session?.user)} />;
}
