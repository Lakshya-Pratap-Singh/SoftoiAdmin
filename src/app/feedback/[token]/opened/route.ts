import { prisma } from "@/lib/prisma";
import { recordWhatsappOpen } from "@/lib/artisan-feedback/service";

// Beacon fired when the customer taps the WhatsApp button (see
// whatsapp-button.tsx). It records "WhatsApp opened" only — never "message
// sent", which a wa.me link cannot tell us. Public, so: same-origin only,
// no body, always 204, and rate-limited by src/proxy.ts.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 204 }); // ignore cross-site pokes

  try {
    await recordWhatsappOpen(prisma, token);
  } catch (err) {
    console.error("[artisan-feedback] could not record WhatsApp open:", err);
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
