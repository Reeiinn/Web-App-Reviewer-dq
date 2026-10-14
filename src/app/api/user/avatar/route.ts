import { touchLastSeen } from "@/app/api/_lib/presence-store";
import { auth } from "@/lib/auth";
import { getAvatar, setAvatar } from "@/server/data/users";
import { NextResponse } from "next/server";

/**
 * The signed-in account's profile photo.
 *
 * The photo is a data URL in users.image rather than a file in object storage:
 * the client shrinks it to a 256px square before sending, so what lands here is
 * a few tens of kilobytes and belongs with the row it describes. The cap below
 * is what keeps that true no matter what a caller sends.
 */
const MAX_CHARS = 300_000; // ~220KB of image once base64 is undone
const ALLOWED = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  // Every screen renders AppNav, and AppNav asks for this photo once per
  // visit, so this is the one request every signed-in account makes whatever
  // they came to do. Stamping here is what lets last_seen_at mean "opened the
  // app" rather than "opened the console": a unit manager who spends their
  // session in the glossary now reads as present, where before only loading
  // the roster counted.
  await touchLastSeen(session.user.id);

  try {
    const image = await getAvatar(session.user.id);
    return NextResponse.json({ image });
  } catch (error) {
    console.error("Error loading avatar:", error);
    return NextResponse.json(
      { error: "Failed to load photo" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    const body = (await req.json()) as { image?: unknown };
    const image = body.image;

    if (typeof image !== "string" || !ALLOWED.test(image)) {
      return NextResponse.json(
        { error: "image must be a PNG, JPEG or WebP data URL" },
        { status: 400 },
      );
    }

    if (image.length > MAX_CHARS) {
      return NextResponse.json(
        { error: "That photo is too large. Try a smaller one." },
        { status: 413 },
      );
    }

    await setAvatar(session.user.id, image);

    return NextResponse.json({ image });
  } catch (error) {
    console.error("Error saving avatar:", error);
    return NextResponse.json(
      { error: "Failed to save photo" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return unauthorized();

  try {
    await setAvatar(session.user.id, null);
    return NextResponse.json({ image: null });
  } catch (error) {
    console.error("Error clearing avatar:", error);
    return NextResponse.json(
      { error: "Failed to remove photo" },
      { status: 500 },
    );
  }
}
