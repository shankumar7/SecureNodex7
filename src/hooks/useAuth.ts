import { useState, useEffect } from 'react';
import { authService, SecureNodeXUser } from '../lib/auth';

interface AuthState {
  user: SecureNodeXUser | null;
  loading: boolean;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<SecureNodeXUser | null>(authService.getCurrentUser());
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  return { user, loading };
};
