import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resendOtpApi, verifyOtpApi } from '../api/auth.api';
import { ROUTES } from '../../../shared/constants/routes';
import type { AxiosError } from 'axios';

export function useVerifyOtp(email: string) {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const verify = async (otp: string) => {
    setLoading(true);
    setError(null);
    try {
      await verifyOtpApi(email, otp);
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ??
          'Verification failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResendLoading(true);
    setError(null);
    try {
      await resendOtpApi(email);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ??
          'Could not resend code. Please try again.',
      );
    } finally {
      setResendLoading(false);
    }
  };

  return { verify, resend, loading, resendLoading, error };
}
