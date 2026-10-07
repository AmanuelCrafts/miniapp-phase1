'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTelegram } from '@/components/TelegramProvider';
import type { TelegramUser } from '@/types/telegram';

interface AuthContextValue {
  user: TelegramUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isTelegram: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isTelegram: false,
  login: async () => {},
  logout: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isTelegram, isReady, initData } = useTelegram();
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async () => {
    if (!initData) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // Auth failed
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Logout failed
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    if (isTelegram && isReady && initData && !user) {
      void login();
    }
  }, [isTelegram, isReady, initData, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        isTelegram,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
