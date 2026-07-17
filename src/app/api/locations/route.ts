import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { FEATURE_DISABLED_MESSAGE, features } from "@/lib/features";
import {
  listDeliveryLocationsForAdmin,
  stopDeliveryTracking,
  upsertDeliveryLocation,
} from "@/lib/locations";

export async function OPTIONS() {
  return corsOptionsResponse();
}

function requireMapFeature() {
  if (!features.map) {
    return corsResponse({ error: FEATURE_DISABLED_MESSAGE }, 403);
  }
  return null;
}

/** Admin: list live delivery pins. */
export async function GET(request: NextRequest) {
  const disabled = requireMapFeature();
  if (disabled) return disabled;

  const auth = await requireAuth(request, ["admin"]);
  if (auth.error || !auth.session) return auth.error;

  try {
    const locations = await listDeliveryLocationsForAdmin();
    return corsResponse({ locations });
  } catch (error) {
    console.error("GET /api/locations failed:", error);
    return corsResponse({ error: "Failed to fetch locations" }, 500);
  }
}

/** Delivery: push current GPS coordinates. */
export async function POST(request: NextRequest) {
  const disabled = requireMapFeature();
  if (disabled) return disabled;

  const auth = await requireAuth(request, ["delivery"]);
  if (auth.error || !auth.session) return auth.error;

  try {
    const body = await request.json();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const accuracyMeters =
      body.accuracyMeters != null ? Number(body.accuracyMeters) : null;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return corsResponse({ error: "Invalid coordinates" }, 400);
    }

    await upsertDeliveryLocation({
      deliveryGuyId: auth.session.id,
      latitude,
      longitude,
      accuracyMeters:
        accuracyMeters != null && Number.isFinite(accuracyMeters)
          ? accuracyMeters
          : null,
    });

    return corsResponse({ ok: true });
  } catch (error) {
    console.error("POST /api/locations failed:", error);
    return corsResponse({ error: "Failed to save location" }, 500);
  }
}

/** Delivery: stop sharing location. */
export async function DELETE(request: NextRequest) {
  const disabled = requireMapFeature();
  if (disabled) return disabled;

  const auth = await requireAuth(request, ["delivery"]);
  if (auth.error || !auth.session) return auth.error;

  try {
    await stopDeliveryTracking(auth.session.id);
    return corsResponse({ ok: true });
  } catch (error) {
    console.error("DELETE /api/locations failed:", error);
    return corsResponse({ error: "Failed to stop tracking" }, 500);
  }
}
