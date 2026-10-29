// `pnpm clear-students`: deletes every student from the local database, with
// their sessions, class memberships and plays, so a Google account can sign up as a
// new student again (join link, grade pick and all). Teachers and classes stay.
// Only ever touches the Docker database `pnpm dev` starts.
import { createDb, localDatabaseUrl } from "../src/index.ts";

const url = process.env.DATABASE_URL ?? localDatabaseUrl;
if (url !== localDatabaseUrl) {
  console.error(
    "clear-students only runs against the local database; unset DATABASE_URL.",
  );
  process.exit(1);
}

const db = createDb(url);
try {
  const { count } = await db.account.deleteMany({ where: { role: "student" } });
  console.log(`Deleted ${count} student${count === 1 ? "" : "s"}.`);
} finally {
  await db.$disconnect();
}
