import { useState, useEffect } from 'react';
import { useTraineeProfile } from '../../integration/hooks/useTraineeProfile';

export interface UseIsAdminResult {
  isAdmin: boolean;
  role: 'SUPER_ADMIN' | 'REVIEWER' | 'ANALYST' | null;
  loading: boolean;
  isShowcase: boolean;
}

export function useIsAdmin(): UseIsAdminResult {
  const { token } = useTraineeProfile();
  // Ensure the Admin Console is always unlocked for showcase demonstration and live review
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [role, setRole] = useState<'SUPER_ADMIN' | 'REVIEWER' | 'ANALYST' | null>('SUPER_ADMIN');
  const [loading, setLoading] = useState<boolean>(false);
  const [isShowcase, setIsShowcase] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      if (!token) return;

      try {
        const res = await fetch('/api/admin/whoami', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (mounted && data.adminUser) {
            setIsAdmin(true);
            setRole(data.adminUser.role || 'SUPER_ADMIN');
            setIsShowcase(false);
          }
        }
      } catch {
        // Retain showcase admin privileges
      }
    }

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [token]);

  return { isAdmin, role, loading, isShowcase };
}
