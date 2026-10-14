// Compares the pre-Prisma staff SQL with src/server/data/staff.ts on the
// local dev copy. Exit code 1 on any difference. Run: pnpm parity:staff
//
// The old queries are copied from the routes as they stood before Wave 4
// (commit 3b98519), so this stays a fixed reference after they change.
// Read-only: nothing here writes.
import { config } from "dotenv";
import { Pool } from "pg";
import { assertLocalDatabase } from "../../src/server/db/local-guard";

config({ path: ".env.local" });
const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL);
process.env.DATABASE_URL = url;

const pool = new Pool({ connectionString: url });
const diffs: string[] = [];

// JSON round trip: Dates become the ISO strings the API sends.
const json = (value: unknown) => JSON.stringify(JSON.parse(JSON.stringify(value ?? null)));

function same(label: string, oldValue: unknown, newValue: unknown) {
  const a = json(oldValue);
  const b = json(newValue);
  if (a !== b) diffs.push(`${label}\n  old: ${a}\n  new: ${b}`);
}

const OLD_REVIEWEES = `
  SELECT u.id, u.email, u.name, u.role, u.image,
         m.id    AS manager_id,
         m.name  AS manager_name,
         m.email AS manager_email,
         m.role  AS manager_role,
         m.image AS manager_image
    FROM users u
    LEFT JOIN users m ON m.id = u.manager_id
   WHERE u.role = 'USER' AND u.deleted_at IS NULL`;

const OLD_MANAGERS = `
  SELECT u.id, u.name, u.email, u.image, u.last_seen_at,
         COUNT(r.id) AS reviewees
    FROM users u
    LEFT JOIN users r ON r.manager_id = u.id AND r.role = 'USER'
                     AND r.deleted_at IS NULL
   WHERE u.role = 'MANAGER' AND u.deleted_at IS NULL
   GROUP BY u.id
   ORDER BY u.last_seen_at DESC NULLS LAST, u.name ASC`;

const OLD_TARGET = `
  SELECT id, name, email, role, manager_id FROM users
   WHERE id = $1 AND deleted_at IS NULL`;

const OLD_NUDGES = `
  SELECT id, sender_id, sender_name, message, created_at, read_at
    FROM nudges
   WHERE user_id = $1
   ORDER BY created_at DESC
   LIMIT 20`;

const OLD_UNREAD = `
  SELECT COUNT(*)::int AS count FROM nudges
   WHERE user_id = $1 AND read_at IS NULL`;

const OLD_LAST_SENT = `
  SELECT created_at FROM nudges
   WHERE user_id = $1 AND sender_id = $2
   ORDER BY created_at DESC
   LIMIT 1`;

type RosterHead = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  manager: { id: string; name: string; email: string; role: string; image: string | null } | null;
};

/** The roster row's leading fields, as the route builds them. */
const rosterHead = (r: RosterHead) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  image: r.image ?? null,
  manager: r.manager && {
    id: r.manager.id,
    name: r.manager.name,
    email: r.manager.email,
    role: r.manager.role,
    image: r.manager.image ?? null,
  },
});

const oldRosterHead = (row: Record<string, string | null>) =>
  rosterHead({
    id: row.id!,
    name: row.name!,
    email: row.email!,
    image: row.image,
    manager: row.manager_id
      ? {
          id: row.manager_id,
          name: row.manager_name!,
          email: row.manager_email!,
          role: row.manager_role!,
          image: row.manager_image,
        }
      : null,
  });

async function main() {
  const staff = await import("../../src/server/data/staff");

  const adminRoster = (await pool.query(`${OLD_REVIEWEES} ORDER BY u.name ASC`)).rows;
  console.log(`Comparing the admin roster (${adminRoster.length} reviewees)…`);
  same("roster (admin)", adminRoster.map(oldRosterHead), (await staff.listReviewees(null)).map(rosterHead));

  const staffIds = (
    await pool.query(`SELECT id::text FROM users WHERE role IN ('MANAGER', 'ADMIN')`)
  ).rows.map((r) => r.id as string);
  console.log(`Comparing each of ${staffIds.length} staff accounts' own roster…`);
  for (const id of staffIds) {
    same(
      `roster (manager ${id})`,
      (await pool.query(`${OLD_REVIEWEES} AND u.manager_id = $1 ORDER BY u.name ASC`, [id])).rows.map(oldRosterHead),
      (await staff.listReviewees(id)).map(rosterHead),
    );
  }

  const oldManagers = (await pool.query(OLD_MANAGERS)).rows;
  console.log(`Comparing the managers list (${oldManagers.length} managers)…`);
  same(
    "managers",
    oldManagers.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image ?? null,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
      reviewees: Number(row.reviewees),
    })),
    (await staff.listManagers()).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      image: m.image ?? null,
      lastSeenAt: m.lastSeenAt ? m.lastSeenAt.toISOString() : null,
      reviewees: m.reviewees,
    })),
  );

  const users = (await pool.query(`SELECT id::text FROM users`)).rows.map((r) => r.id as string);
  const nudgeCount = (await pool.query(`SELECT COUNT(*)::int AS n FROM nudges`)).rows[0].n;
  console.log(`Comparing targets, reminders (${nudgeCount}) and unread counts for ${users.length} users…`);
  for (const id of users) {
    const old = (await pool.query(OLD_TARGET, [id])).rows[0];
    same(
      `target ${id}`,
      old && { id: old.id, name: old.name, email: old.email, role: old.role, managerId: old.manager_id },
      await staff.findActiveAccount(id),
    );

    same(
      `nudges ${id}`,
      (await pool.query(OLD_NUDGES, [id])).rows.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        sender: row.sender_name,
        message: row.message,
        createdAt: row.created_at,
        read: row.read_at !== null,
      })),
      (await staff.listNudges(id, 20)).map((n) => ({
        id: n.id,
        senderId: n.senderId,
        sender: n.senderName,
        message: n.message,
        createdAt: n.createdAt,
        read: n.readAt !== null,
      })),
    );

    same(
      `unread ${id}`,
      (await pool.query(OLD_UNREAD, [id])).rows[0]?.count ?? 0,
      await staff.unreadNudgeCount(id),
    );
  }

  const pairs = (
    await pool.query(
      `SELECT DISTINCT user_id::text, sender_id::text FROM nudges WHERE sender_id IS NOT NULL`,
    )
  ).rows as { user_id: string; sender_id: string }[];
  console.log(`Comparing the cooldown's last send for ${pairs.length} reviewee–sender pairs…`);
  for (const { user_id, sender_id } of pairs) {
    same(
      `last sent ${user_id} by ${sender_id}`,
      (await pool.query(OLD_LAST_SENT, [user_id, sender_id])).rows[0]?.created_at ?? null,
      await staff.lastNudgeSentAt(user_id, sender_id),
    );
  }

  console.log(diffs.length === 0 ? "parity: 0 differences" : diffs.join("\n"));
  if (diffs.length) process.exitCode = 1;
  console.log(
    "Intended difference, not compared: a racing second removal no longer writes a second audit row.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    const { default: prisma } = await import("../../src/server/db/prisma");
    await prisma.$disconnect();
  });
