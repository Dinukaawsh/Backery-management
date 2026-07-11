import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { corsOptionsResponse, corsResponse } from "@/lib/cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    return corsResponse(
      {
        error:
          "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in .env",
      },
      503,
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return corsResponse({ error: "No image file provided" }, 400);
    }

    const cloudinaryBody = new FormData();
    cloudinaryBody.append("file", file);
    cloudinaryBody.append("upload_preset", uploadPreset);
    cloudinaryBody.append("folder", "bakery");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: cloudinaryBody },
    );

    const data = await response.json();

    if (!response.ok) {
      return corsResponse(
        { error: data.error?.message ?? "Cloudinary upload failed" },
        500,
      );
    }

    return corsResponse({ url: data.secure_url as string });
  } catch (error) {
    console.error("POST /api/upload failed:", error);
    return corsResponse({ error: "Upload failed" }, 500);
  }
}
