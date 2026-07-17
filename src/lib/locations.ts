import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { deliveryLocations, users } from "@/db/schema";

/** Consider a pin "live" if an update arrived within this window. */
export const LOCATION_STALE_MS = 10 * 60 * 1000;

export type DeliveryLocationPin = {
  deliveryGuyId: number;
  name: string;
  phone: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  isTracking: boolean;
  isLive: boolean;
  updatedAt: string;
};

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function upsertDeliveryLocation(input: {
  deliveryGuyId: number;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
}) {
  const db = getDb();
  const now = new Date();
  const lat = input.latitude.toFixed(7);
  const lng = input.longitude.toFixed(7);
  const accuracy =
    input.accuracyMeters != null && Number.isFinite(input.accuracyMeters)
      ? input.accuracyMeters.toFixed(2)
      : null;

  await db
    .insert(deliveryLocations)
    .values({
      deliveryGuyId: input.deliveryGuyId,
      latitude: lat,
      longitude: lng,
      accuracyMeters: accuracy,
      isTracking: true,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: deliveryLocations.deliveryGuyId,
      set: {
        latitude: lat,
        longitude: lng,
        accuracyMeters: accuracy,
        isTracking: true,
        updatedAt: now,
      },
    });
}

export async function stopDeliveryTracking(deliveryGuyId: number) {
  const db = getDb();
  await db
    .update(deliveryLocations)
    .set({ isTracking: false, updatedAt: new Date() })
    .where(eq(deliveryLocations.deliveryGuyId, deliveryGuyId));
}

export async function listDeliveryLocationsForAdmin(): Promise<
  DeliveryLocationPin[]
> {
  const db = getDb();
  const rows = await db
    .select({
      deliveryGuyId: deliveryLocations.deliveryGuyId,
      latitude: deliveryLocations.latitude,
      longitude: deliveryLocations.longitude,
      accuracyMeters: deliveryLocations.accuracyMeters,
      isTracking: deliveryLocations.isTracking,
      updatedAt: deliveryLocations.updatedAt,
      name: users.name,
      phone: users.phone,
      imageUrl: users.imageUrl,
      isActive: users.isActive,
    })
    .from(deliveryLocations)
    .innerJoin(users, eq(users.id, deliveryLocations.deliveryGuyId))
    .where(eq(deliveryLocations.isTracking, true));

  const now = Date.now();
  /** Hide pins that stopped updating (e.g. app force-closed) after ~30 min. */
  const hideAfterMs = LOCATION_STALE_MS * 3;

  return rows
    .filter((row) => row.isActive && now - row.updatedAt.getTime() <= hideAfterMs)
    .map((row) => {
      const latitude = toNumber(row.latitude) ?? 0;
      const longitude = toNumber(row.longitude) ?? 0;
      const updatedMs = row.updatedAt.getTime();
      return {
        deliveryGuyId: row.deliveryGuyId,
        name: row.name,
        phone: row.phone,
        imageUrl: row.imageUrl,
        latitude,
        longitude,
        accuracyMeters: toNumber(row.accuracyMeters),
        isTracking: row.isTracking,
        isLive: now - updatedMs <= LOCATION_STALE_MS,
        updatedAt: row.updatedAt.toISOString(),
      };
    })
    .filter(
      (row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude),
    );
}
