import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";
import { sevenDaysAgo } from "@/lib/dates";
import { getShopDrops } from "@/lib/shop-drops";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.session) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? undefined;
    let dateFrom = searchParams.get("dateFrom") ?? undefined;
    let dateTo = searchParams.get("dateTo") ?? undefined;
    const deliveryGuyIdParam = searchParams.get("deliveryGuyId");
    const shopIdParam = searchParams.get("shopId");

    let deliveryGuyId =
      deliveryGuyIdParam && Number.isInteger(Number(deliveryGuyIdParam))
        ? Number(deliveryGuyIdParam)
        : undefined;
    const shopId =
      shopIdParam && Number.isInteger(Number(shopIdParam))
        ? Number(shopIdParam)
        : undefined;

    if (auth.session.role === "delivery") {
      deliveryGuyId = auth.session.id;
      const minDate = sevenDaysAgo().toISOString().slice(0, 10);

      if (date) {
        if (date < minDate) {
          return corsResponse(
            { error: "Delivery partners can only view the last 7 days" },
            400,
          );
        }
      } else {
        dateFrom = dateFrom && dateFrom >= minDate ? dateFrom : minDate;
        if (dateTo && dateTo < minDate) {
          return corsResponse({ drops: [] });
        }
      }
    } else if (auth.session.role !== "admin") {
      return corsResponse({ error: "Forbidden" }, 403);
    }

    const drops = await getShopDrops({
      date,
      dateFrom,
      dateTo,
      deliveryGuyId,
      shopId,
    });

    return corsResponse({ drops });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch shop drops";
    console.error("GET /api/shops/drops failed:", error);
    return corsResponse({ error: message }, 400);
  }
}
