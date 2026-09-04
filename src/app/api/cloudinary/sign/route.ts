import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  cloudinary,
  CLOUDINARY_PRODUCT_FOLDER,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from "@/lib/cloudinary";

// Issues a short-lived signature so the browser can upload directly to
// Cloudinary without ever seeing the API secret. Only logged-in admins
// can request one.
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        {
          error: "Cloudinary is not configured on the server.",
          missing: {
            CLOUDINARY_CLOUD_NAME: !CLOUDINARY_CLOUD_NAME,
            CLOUDINARY_API_KEY: !CLOUDINARY_API_KEY,
            CLOUDINARY_API_SECRET: !CLOUDINARY_API_SECRET,
          },
        },
        { status: 500 }
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = CLOUDINARY_PRODUCT_FOLDER;

    // Only params included in the signature can be sent in the actual
    // upload request, so keep this in sync with the client's formData.
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      CLOUDINARY_API_SECRET
    );

    return NextResponse.json({
      signature,
      timestamp,
      folder,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME,
    });
  } catch (err) {
    // Surface the real error instead of a bare 500 so this is diagnosable
    // from the browser network tab without needing server log access.
    console.error("[cloudinary/sign] failed:", err);
    return NextResponse.json(
      {
        error: "Signature generation failed.",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}