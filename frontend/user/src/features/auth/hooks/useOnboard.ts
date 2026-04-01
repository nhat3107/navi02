import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingApi } from '../api/auth.api';
import { ROUTES } from '../../../shared/constants/routes';
import type { OnboardRequest } from '../types/auth.types';
import type { AxiosError } from 'axios';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useOnboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onboard = async (data: OnboardRequest) => {
    setLoading(true);
    setError(null);
    try {
      const avatar_url = data.avatar
        ? await fileToDataUrl(data.avatar)
        : '';
      await onboardingApi({
        full_name: data.username.trim(),
        username: data.username.trim(),
        gender: data.gender,
        date_of_birth: data.dob,
        avatar_url,
        bio: '',
      });
      navigate(ROUTES.HOME);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ??
          'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return { onboard, loading, error };
}
