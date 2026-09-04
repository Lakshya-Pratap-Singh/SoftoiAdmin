import { v2 as cloudinary } from "cloudinary";

// Cloudinary's dashboard hands out a single CLOUDINARY_URL
// (cloudinary://<api_key>:<api_secret>@<cloud_name>). Support that as well
// as the three separate vars, since calling cloudinary.config() with
// explicit undefined values would otherwise clobber the SDK's own
// auto-parsing of CLOUDINARY_URL.
function parseCloudinaryUrl(url: string) {
  const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return null;
  const [, apiKey, apiSecret, cloudName] = match;
  return { apiKey, apiSecret, cloudName };
}

const parsed = process.env.CLOUDINARY_URL
  ? parseCloudinaryUrl(process.env.CLOUDINARY_URL)
  : null;

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || parsed?.cloudName;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || parsed?.apiKey;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || parsed?.apiSecret;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

export const CLOUDINARY_PRODUCT_FOLDER = "softoi/products";

export { cloudinary };