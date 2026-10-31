import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ResultsPage } from "./ResultsPage";

export const metadata = {
  title: "Licensing Exam Results — INSURE",
};

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    redirect("/dashboard");
  }

  return <ResultsPage />;
}
