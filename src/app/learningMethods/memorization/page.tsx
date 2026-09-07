// app/learningMethods/memorization/page.tsx
import { recordVisit } from "@/app/api/_lib/recent-activity-store";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/helper/roles";
import { parseExamType } from "@/lib/types/common";
import { redirect } from "next/navigation";
import { MemorizationPage } from "./MemorizationPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ exam_type?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // Staff oversee reviewees rather than study, so the console is their home.
  if (isStaff(session.user.role)) {
    redirect("/admin");
  }

  const { exam_type } = await searchParams;
  await recordVisit(session.user.id, parseExamType(exam_type), "memorize");

  return <MemorizationPage />;
}
