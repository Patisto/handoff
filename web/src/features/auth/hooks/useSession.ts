import { useEffect } from 'react';
import { refreshSession } from '../../../api/client';
import { useAuth } from '../../../stores/auth';
export function useSession() {
  const token = useAuth((s) => s.token);
  useEffect(() => {
    void refreshSession().catch(() => {});
  }, []);
  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => void refreshSession().catch(() => {}), 12 * 60000);
    return () => clearInterval(timer);
  }, [token]);
}
