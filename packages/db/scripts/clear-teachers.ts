// `pnpm clear-teachers`: deletes every teacher from the local database, with
// their sessions and classes, and with the classes their students' class
// memberships, plays and recognitions, and the demo classes' students, so a
// Google account can sign up as a new teacher again (demo class and all).
// Real students stay, in no class. Only ever touches the Docker database
// `pnpm dev` starts.
import { createDb, localDatabaseUrl } from "../src/index.ts";

const url = process.env.DATABASE_URL ?? localDatabaseUrl;
if (url !== localDatabaseUrl) {
  console.error(
    "clear-teachers only runs against the local database; unset DATABASE_URL.",
  );
  process.exit(1);
}

const db = createDb(url);
try {
  const { count } = await db.account.deleteMany({ where: { role: "teacher" } });
  console.log(`Deleted ${count} teacher${count === 1 ? "" : "s"}.`);
} finally {
  await db.$disconnect();
}
