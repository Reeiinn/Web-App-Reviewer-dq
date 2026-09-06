// app/learningMethods/practiceExam/page.tsx
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/helper/roles";
import { redirect } from "next/navigation";
import { PracticeExamPage } from "./PracticeExamPage";

export default async function Page() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // Staff oversee reviewees rather than study, so the console is their home.
  if (isStaff(session.user.role)) {
    redirect("/admin");
  }

  return <PracticeExamPage />;
}
