import "dotenv/config";

import { eq } from "drizzle-orm";

import { getDb } from "../src/db";
import { businessSettings, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

async function seed() {
  const email = process.env.ADMIN_EMAIL ?? "admin@bakery.local";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const name = process.env.ADMIN_NAME ?? "Bakery Admin";
  const businessName = process.env.BUSINESS_NAME ?? "Bakery";

  const db = getDb();

  const [existingSettings] = await db
    .select()
    .from(businessSettings)
    .limit(1);

  if (!existingSettings) {
    await db.insert(businessSettings).values({
      id: 1,
      businessName,
      address: "",
      phone: "",
    });
    console.log(`Business settings created: ${businessName}`);
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    email,
    passwordHash,
    name,
    role: "admin",
  });

  console.log("Admin user created:");
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
