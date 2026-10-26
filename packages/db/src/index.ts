import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

export { localDatabaseUrl } from "./url.ts";

export type Db = PrismaClient;

export function createDb(url: string): Db {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
