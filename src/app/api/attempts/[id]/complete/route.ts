import { auth } from "@/lib/auth";
import { attemptJson, certificateJson } from "@/lib/helper/exam-json";
import { PASSES_REQUIRED, cappedPasses } from "@/lib/helper/practice-exam";
import { completeAttempt, findAttemptOwner } from "@/server/data/attempts";
import { issueCertificate } from "@/server/data/certificates";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: attemptId } = await params;

  try {
    // fetch the attempt first to check ownership before mutating anything
    const owner = await findAttemptOwner(attemptId);

    if (!owner) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (owner !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { attempt, passes: counted } = await completeAttempt(attemptId);
    const passes = cappedPasses(counted);

    // The fifth pass is what earns the certificate, and every sitting after
    // it asks again — so this returns the certificate already held rather
    // than minting a second one.
    const certificate =
      passes >= PASSES_REQUIRED
        ? await issueCertificate(attempt.userId, attempt.examType)
        : null;

    return NextResponse.json({
      ...attemptJson(attempt),
      passes,
      passes_required: PASSES_REQUIRED,
      track_passed: passes >= PASSES_REQUIRED,
      certificate: certificate ? certificateJson(certificate) : null,
    });
  } catch (error) {
    console.error("Error completing attempt:", error);
    return NextResponse.json(
      { error: "Failed to complete attempt" },
      { status: 500 },
    );
  }
}
