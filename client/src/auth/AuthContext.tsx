import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, AuthContextType, LoginCredentials } from '../types/auth';
import { getToken, setToken, removeToken, loginApi, getMeApi } from '../api/auth.api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokenState, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
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
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

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

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const response = await loginApi(credentials);
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
