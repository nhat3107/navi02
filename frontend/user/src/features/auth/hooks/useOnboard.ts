import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingApi } from '../api/auth.api';
import { ROUTES } from '../../../shared/constants/routes';
import type { OnboardRequest } from '../types/auth.types';
import { extractApiMessage } from '../../../shared/utils/api-error';

export function useOnboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onboard = async (data: OnboardRequest) => {
    setLoading(true);
    setError(null);
    try {
      await onboardingApi({
        full_name: data.full_name.trim(),
        username: data.username.trim().toLowerCase(),
        gender: data.gender,
        date_of_birth: data.dob,
        avatar_url: data.avatar_url.trim(),
        bio: data.bio.trim(),
      });
      navigate(ROUTES.HOME);
    } catch (err) {
      setError(
        extractApiMessage(err, 'Something went wrong. Please try again.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return { onboard, loading, error };
}
