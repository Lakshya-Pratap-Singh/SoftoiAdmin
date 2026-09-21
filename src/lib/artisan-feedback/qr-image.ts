import QRCode from "qrcode";

// Error-correction "Q" (~25% recoverable): packaging gets creased and
// scuffed, and the URL is short, so the extra redundancy costs almost nothing.
const COMMON = { errorCorrectionLevel: "Q" as const, margin: 4 }; // 4 = standard quiet zone

export function renderQrPng(text: string, size = 1024): Promise<Buffer> {
  return QRCode.toBuffer(text, { ...COMMON, type: "png", width: size });
}

export function renderQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { ...COMMON, type: "svg" });
}
