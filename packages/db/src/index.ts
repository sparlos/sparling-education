import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "./generated/prisma/client.ts";

export { localDatabaseUrl } from "./url.ts";

export type Db = PrismaClient;

/** The client inside `db.$transaction(async (tx) => …)`. */
export type DbTransaction = Prisma.TransactionClient;

export function createDb(url: string): Db {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
