import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { touchLastSeen } from "@/app/api/_lib/presence-store";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId } = session.user;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await touchLastSeen(currentUserId);

  try {
    const result = await pool.query(
      `INSERT INTO registration_invites (code, created_by, expires_at)
       VALUES ($1, $2, now() + INTERVAL '7 days')
       RETURNING code, expires_at`,
      [randomBytes(16).toString("base64url"), currentUserId],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating registration invite:", error);
    return NextResponse.json(
      { error: "Failed to create invitation link" },
      { status: 500 },
    );
  }
}
