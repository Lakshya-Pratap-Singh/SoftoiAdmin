import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudinary, CLOUDINARY_PRODUCT_FOLDER } from "@/lib/cloudinary";

// Issues a short-lived signature so the browser can upload directly to
// Cloudinary without ever seeing the API secret. Only logged-in admins
// can request one.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json(
      { error: "Cloudinary is not configured on the server." },
      { status: 500 }
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = CLOUDINARY_PRODUCT_FOLDER;

  // Only params included in the signature can be sent in the actual
  // upload request, so keep this in sync with the client's formData.
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
