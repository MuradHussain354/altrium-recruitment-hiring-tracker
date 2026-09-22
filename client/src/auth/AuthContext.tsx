import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  User,
  AuthContextType,
  LoginCredentials,
} from '../types/auth';
import {
  getToken,
  setToken,
  removeToken,
  loginApi,
  getMeApi,
  logoutApi,
} from '../api/auth.api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokenState, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    // Best-effort server-side logout (fire and forget; errors are silently ignored)
    try {
      logoutApi().catch(() => {});
    } catch {
      // ignore
    }
    removeToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const restoreSession = useCallback(async () => {
    const savedToken = getToken();
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const { user: meUser } = await getMeApi();
      if (meUser && meUser.isActive) {
        setUser(meUser);
        setTokenState(savedToken);
      } else {
        removeToken();
        setTokenState(null);
        setUser(null);
      }
    } catch {
      removeToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  /**
   * Email + password login. On success, stores the token and sets the user.
   */
  const login = async (credentials: LoginCredentials): Promise<User> => {
    const response = await loginApi(credentials);
    setToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
    return response.user;
  };

  /**
   * Applies a session obtained outside the normal login flow (currently: after
   * invitation acceptance, whose response has the same {token, user} shape as
   * the direct-login response).
   */
  const applySession = (token: string, sessionUser: User): void => {
    setToken(token);
    setTokenState(token);
    setUser(sessionUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: tokenState,
        isAuthenticated: !!user && !!tokenState,
        isLoading,
        login,
        applySession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
