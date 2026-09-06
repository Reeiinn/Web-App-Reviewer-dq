import { auth } from "@/lib/auth";
import { fetchEligibility } from "@/app/api/_lib/mastery";
import { NextResponse } from "next/server";

/**
 * Whether the caller may sit the practice exam for a track, with the counts the
 * UI needs to explain a lock. Starting an attempt lives on POST /api/attempts,
 * which applies this same check server-side.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const examType = searchParams.get("exam_type");

  if (!examType) {
    return NextResponse.json(
      { error: "exam_type is required" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await fetchEligibility(session.user.id, examType));
  } catch (error) {
    console.error("Error checking practice exam eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 },
    );
  }
}
