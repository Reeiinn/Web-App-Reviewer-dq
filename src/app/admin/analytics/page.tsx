import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/helper/roles";
import { redirect } from "next/navigation";
import { CohortAnalyticsPage } from "./CohortAnalyticsPage";

/**
 * The cohort, for whoever oversees it.
 *
 * Both staff roles reach this; the figures are scoped to what each may see, an
 * admin over the whole intake and a field manager over their own recruits. A
 * reviewee is sent to their own analytics, which is the same question asked of
 * one person.
 */
export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (!isStaff(session.user.role)) {
    redirect("/analytics");
  }

  return <CohortAnalyticsPage />;
}
