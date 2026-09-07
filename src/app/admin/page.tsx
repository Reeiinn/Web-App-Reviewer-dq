import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPage } from "./AdminPage";

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    redirect("/dashboard");
  }

  // The roster reads ?manager= to seed its search box, and useSearchParams
  // needs a boundary above it before Next will render the tree.
  return (
    <Suspense>
      <AdminPage />
    </Suspense>
  );
}
