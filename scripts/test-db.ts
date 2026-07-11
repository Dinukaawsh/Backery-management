import "dotenv/config";

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Testing connection...");
  const sql = neon(url);
  const result = await sql`SELECT 1 as ok`;
  console.log("Connection OK:", result);
}

main().catch((error) => {
  console.error("Connection failed:", error.message);
  if (error.cause) console.error("Cause:", error.cause.message ?? error.cause);
  process.exit(1);
});
