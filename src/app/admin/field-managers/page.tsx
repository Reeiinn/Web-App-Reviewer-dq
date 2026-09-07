import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FieldManagerPage } from "./FieldManagerPage";

/**
 * The Sales Manager's view of their field managers.
 *
 * A field manager is refused rather than shown a version of their own row:
 * ranking peers against each other is the Sales Manager's job, and a screen
 * that told a manager where they place among colleagues is a different feature
 * with a different conversation behind it. /api/admin/managers refuses them
 * for the same reason, so this guard only spares them a page that would load
 * empty.
 */
export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/admin");
  }

  return <FieldManagerPage />;
}
