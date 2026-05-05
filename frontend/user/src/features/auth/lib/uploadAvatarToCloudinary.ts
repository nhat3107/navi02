import type { CloudinarySignatureData } from '../types/auth.types';

/**
 * Signed upload to Cloudinary (params from GET /api/user/cloudinary-upload-signature).
 */
export async function uploadAvatarToCloudinary(
  file: File,
  sig: CloudinarySignatureData,
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  form.append('public_id', sig.public_id);
  // Video vs image is determined by upload URL (.../video/upload); including
  // resource_type in the body can break signature verification.

  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  const data = (await res.json().catch(() => null)) as
    | { secure_url?: string; error?: { message?: string } }
    | null;

  if (!res.ok) {
    const msg = data?.error?.message?.trim();
    throw new Error(msg || `Upload failed (${res.status})`);
  }
  const url = data?.secure_url?.trim();
  if (!url) {
    throw new Error('Upload succeeded but no image URL was returned.');
  }
  return url;
}
