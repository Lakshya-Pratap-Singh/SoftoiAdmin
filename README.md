# Cloudinary product-image upload — file package

## New files (copy as-is into your repo, same paths)
- src/lib/cloudinary.ts
- src/app/api/cloudinary/sign/route.ts
- src/components/products/image-upload.tsx

## Modified files (replace your existing copy, or apply CHANGES.diff)
- package.json            (added the `cloudinary` dependency)
- src/components/products/product-form.tsx  (added the upload widget next to the URL field)

## Setup after copying
1. npm install
2. Add to your .env:
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
3. Restart `npm run dev`
4. Test: Products -> Add Product -> Upload image
