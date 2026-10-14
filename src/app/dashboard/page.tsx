import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/helper/roles";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardPage } from "./DashboardPage";

export default async function Page() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // Staff oversee reviewees rather than study, so the console is their home.
  if (isStaff(session.user.role)) {
    redirect("/admin");
  }

  // The onboarding tour reads ?tour=1 to support "Replay tour", and
  // useSearchParams needs a boundary above it before Next will render the
  // tree.
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}
