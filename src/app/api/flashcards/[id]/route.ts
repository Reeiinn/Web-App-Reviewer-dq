import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { Flashcard } from "@/lib/types/flashcard";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Every sibling route checks the session for itself. This one was relying on
  // the middleware alone, which is one matcher edit away from being nothing.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await pool.query<Flashcard>(
      `SELECT id, exam_type, category, front, back 
       FROM flashcards WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Flashcard not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching flashcard:", error);
    return NextResponse.json(
      { error: "Failed to fetch flashcard" },
      { status: 500 },
    );
  }
}
