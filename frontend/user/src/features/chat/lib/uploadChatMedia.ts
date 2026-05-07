import { getCloudinaryUploadSignatureApi } from '../../auth/api/auth.api';
import { uploadAvatarToCloudinary } from '../../auth/lib/uploadAvatarToCloudinary';

/**
 * Image or video for chat: signed upload to Cloudinary (chat folder + correct endpoint).
 */
export async function uploadChatMediaFile(file: File): Promise<string> {
  const isVideo = file.type.startsWith('video/');
  const sig = await getCloudinaryUploadSignatureApi({
    context: 'chat',
    resourceType: isVideo ? 'video' : 'image',
  });
  return uploadAvatarToCloudinary(file, sig);
}
