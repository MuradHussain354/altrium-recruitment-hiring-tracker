import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  User,
  AuthContextType,
  LoginCredentials,
  TwoFactorChallengeResponse,
} from '../types/auth';
import {
  getToken,
  setToken,
  removeToken,
  loginApi,
  verify2FALoginApi,
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
   * Step 1: email + password login.
   * - If 2FA not enabled → stores token, sets user, returns User.
   * - If 2FA enabled → returns TwoFactorChallengeResponse (caller must show Step 2 screen).
   */
  const login = async (credentials: LoginCredentials): Promise<User | TwoFactorChallengeResponse> => {
    const response = await loginApi(credentials);

    if (response.requires2FA === false) {
      // Direct login
      setToken(response.token);
      setTokenState(response.token);
      setUser(response.user);
      return response.user;
    }

    // 2FA challenge: return the challenge response — caller handles Step 2
    return response;
  };

  /**
   * Step 2: verify TOTP or backup code with the tempToken from Step 1.
   * On success, stores permanent token and sets user.
   */
  const complete2FALogin = async (tempToken: string, code: string): Promise<User> => {
    const response = await verify2FALoginApi(tempToken, code);
    setToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
    return response.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: tokenState,
        isAuthenticated: !!user && !!tokenState,
        isLoading,
        login,
        complete2FALogin,
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
