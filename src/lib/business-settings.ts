import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { businessSettings } from "@/db/schema";

export type BusinessSettings = {
  businessName: string;
  address: string;
  phone: string;
  email: string | null;
  ownerName: string | null;
};

const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "Bakery",
  address: "",
  phone: "",
  email: null,
  ownerName: null,
};

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const db = getDb();
  const [row] = await db.select().from(businessSettings).limit(1);

  if (!row) {
    await db.insert(businessSettings).values({ id: 1, ...DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  }

  return {
    businessName: row.businessName,
    address: row.address,
    phone: row.phone,
    email: row.email,
    ownerName: row.ownerName,
  };
}

export async function updateBusinessSettings(input: {
  businessName: string;
  address: string;
  phone: string;
  email?: string | null;
  ownerName?: string | null;
}): Promise<BusinessSettings> {
  const businessName = input.businessName.trim();
  const address = input.address.trim();
  const phone = input.phone.trim();
  const email =
    input.email === undefined
      ? undefined
      : input.email?.trim()
        ? input.email.trim()
        : null;
  const ownerName =
    input.ownerName === undefined
      ? undefined
      : input.ownerName?.trim()
        ? input.ownerName.trim()
        : null;

  if (!businessName) {
    throw new Error("Business name is required");
  }

  if (!address) {
    throw new Error("Address is required");
  }

  if (!phone) {
    throw new Error("Phone is required");
  }

  const db = getDb();
  await getBusinessSettings();

  const [updated] = await db
    .update(businessSettings)
    .set({
      businessName,
      address,
      phone,
      ...(email !== undefined ? { email } : {}),
      ...(ownerName !== undefined ? { ownerName } : {}),
      updatedAt: new Date(),
    })
    .where(eq(businessSettings.id, 1))
    .returning();

  return {
    businessName: updated.businessName,
    address: updated.address,
    phone: updated.phone,
    email: updated.email,
    ownerName: updated.ownerName,
  };
}
