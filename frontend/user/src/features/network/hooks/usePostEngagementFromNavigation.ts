import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import type { NetworkPost } from '../types/network.types';
import {
  type AppNavigationState,
  mergeEngagementPatches,
} from '../lib/postEngagementNavigation';

/**
 * Applies like/unlike changes made in the post overlay when the user navigates back.
 */
export function usePostEngagementFromNavigation(
  setPosts: React.Dispatch<React.SetStateAction<NetworkPost[]>>,
) {
  const location = useLocation();
  const appliedKeyRef = useRef('');

  useEffect(() => {
    const patches = (location.state as AppNavigationState | null)
      ?.postEngagementPatches;
    if (!patches?.length) return;

    const key = patches
      .map((p) => `${p.postId}:${p.liked}:${p.likeCount}`)
      .join('|');
    if (appliedKeyRef.current === key) return;
    appliedKeyRef.current = key;

    setPosts((prev) => mergeEngagementPatches(prev, patches));
  }, [location.state, setPosts]);
}
