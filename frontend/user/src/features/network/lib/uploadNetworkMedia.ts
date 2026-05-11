import { getCloudinaryUploadSignatureApi } from '../../auth/api/auth.api';
import { uploadAvatarToCloudinary } from '../../auth/lib/uploadAvatarToCloudinary';

/**
 * Image or video for feed posts / comments: signed upload (network folder on backend).
 */
export async function uploadNetworkMediaFile(file: File): Promise<string> {
  const isVideo = file.type.startsWith('video/');
  const sig = await getCloudinaryUploadSignatureApi({
    context: 'network',
    resourceType: isVideo ? 'video' : 'image',
  });
  return uploadAvatarToCloudinary(file, sig);
}
