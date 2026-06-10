import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';

export async function fetchVideoCallToken(meetingId?: string): Promise<string> {
  const res = await api.post<{ token: string }>(
    API_ROUTES.CALL_TOKEN,
    meetingId?.trim() ? { meetingId: meetingId.trim() } : {},
  );
  const token = res.data?.token?.trim();
  if (!token) throw new Error('No token in response');
  return token;
}

/** Creates a VideoSDK room and returns JWT + meeting id (caller / host). */
export async function fetchCallRoom(): Promise<{
  token: string;
  meetingId: string;
}> {
  const res = await api.post<{ token: string; meetingId: string }>(
    API_ROUTES.CALL_ROOM,
    {},
  );
  const token = res.data?.token?.trim();
  const meetingId = res.data?.meetingId?.trim();
  if (!token || !meetingId) throw new Error('Invalid call/room response');
  return { token, meetingId };
}
