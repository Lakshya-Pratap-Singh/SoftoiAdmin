import { prisma } from "@/lib/prisma";
import { AccessError } from "@/lib/artisan-feedback/access";
import { buildFeedbackUrl } from "@/lib/artisan-feedback/config";
import { renderQrPng, renderQrSvg } from "@/lib/artisan-feedback/qr-image";
import { requireQRManager } from "@/lib/artisan-feedback/session";

// GET /api/admin/artisan-feedback/qr/<id>/image?format=png|svg&download=1
// Signed-in staff only. The image encodes just <APP_BASE_URL>/feedback/<token>.

const NO_STORE = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: NO_STORE });
}

function slug(value: string): string {
  return value.normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "item";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireQRManager();
  } catch (err) {
    if (err instanceof AccessError) return json({ error: err.message }, err.status);
    throw err;
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "png";
  if (format !== "png" && format !== "svg") return json({ error: 'format must be "png" or "svg".' }, 400);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return json({ error: "QR code not found." }, 404);

  const qr = await prisma.artisanFeedbackQR.findUnique({
    where: { id },
    select: {
      token: true,
      status: true,
      order: { select: { orderNumber: true } },
      product: { select: { name: true } },
    },
  });
  if (!qr) return json({ error: "QR code not found." }, 404);

  // Never hand out a printable image of a dead code.
  if (qr.status !== "ACTIVE") {
    return json({ error: "This QR code is not active. Regenerate it to get a working one." }, 409);
  }

  let url: string;
  try {
    url = buildFeedbackUrl(qr.token); // throws in production if APP_BASE_URL is missing
  } catch (err) {
    console.error("[artisan-feedback] cannot build QR URL:", err);
    return json({ error: err instanceof Error ? err.message : "Server is not configured for QR codes." }, 500);
  }

  const headers = new Headers(NO_STORE);
  if (searchParams.get("download") === "1") {
    const filename = `softoi-qr-${slug(qr.order?.orderNumber ?? "campaign")}-${slug(qr.product.name)}.${format}`;
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  }

  if (format === "svg") {
    headers.set("Content-Type", "image/svg+xml; charset=utf-8");
    return new Response(await renderQrSvg(url), { headers });
  }
  headers.set("Content-Type", "image/png");
  return new Response(new Uint8Array(await renderQrPng(url)), { headers });
}
