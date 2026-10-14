import { registerBodySchema } from "@/lib/validation/auth.validation";
import { registerWithInvite } from "@/server/data/users";
import bcrypt from "bcryptjs";
import { createSignupGrant } from "@/lib/helper/signup-grant";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const parsed = registerBodySchema.safeParse(
      await req.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, password, name, code } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Claiming the invite and creating the account happen in one
    // transaction: a link can never be spent twice, and a refused signup
    // releases it instead of burning it.
    const outcome = await registerWithInvite({
      code,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      passwordHash: hashedPassword,
    });

    if (!outcome.ok) {
      if (outcome.reason === "email-taken") {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 },
        );
      }
      // An addressed invite belongs to one person; any other refusal is the
      // code itself.
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.reason === "claimant" ? 403 : 400 },
      );
    }

    const { user } = outcome;

    // The signup form signs the new account in straight away, and the
    // credentials provider wants a bot check it has no widget to satisfy.
    // This stands in for one, for this address, for the next two minutes.
    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        manager_id: user.managerId,
        created_at: user.createdAt,
        signupGrant: createSignupGrant(user.email),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 },
    );
  }
}
