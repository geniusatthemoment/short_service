import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, query } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(__dirname, "..", "migrations", "001_init.sql");

try {
  const sql = await readFile(migrationPath, "utf8");
  await query(sql);
  console.log("Database migration completed.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
