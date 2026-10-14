import { auth } from "@/lib/auth";
import { markTourSeen } from "@/server/data/users";
import { NextResponse } from "next/server";

/**
 * Marks the signed-in account's own role-tour as seen, so it does not run
 * again next time they land here. The role comes from the session rather
 * than the request body — nothing about which tour finished is the caller's
 * to declare.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markTourSeen(session.user.id, session.user.role);

  return NextResponse.json({ ok: true });
}
