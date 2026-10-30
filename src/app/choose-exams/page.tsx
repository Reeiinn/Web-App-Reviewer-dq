import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/helper/roles";
import { redirect } from "next/navigation";
import { ChooseExamsPage } from "./ChooseExamsPage";

export const metadata = {
  title: "Choose your exams — INSURE",
};

export default async function Page() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // Staff oversee reviewees rather than study, so there is nothing to choose.
  if (isStaff(session.user.role)) {
    redirect("/admin");
  }

  return <ChooseExamsPage />;
}
