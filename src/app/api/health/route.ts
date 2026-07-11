import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET() {
  return corsResponse({
    status: "ok",
    service: "bakery-api",
    timestamp: new Date().toISOString(),
  });
}
