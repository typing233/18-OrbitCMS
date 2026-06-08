import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe } from '../api/auth';

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  tenantId: string;
  roles: { id: string; name: string; slug: string }[];
}

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: UserInfo) => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  hasRole: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('orbit_access_token');
    if (token) {
      getMe()
        .then((data) => {
          setUser(data);
          localStorage.setItem('orbit_tenant_id', data.tenantId);
        })
        .catch(() => {
          localStorage.removeItem('orbit_access_token');
          localStorage.removeItem('orbit_refresh_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const loginFn = (accessToken: string, refreshToken: string, userData: UserInfo) => {
    localStorage.setItem('orbit_access_token', accessToken);
    localStorage.setItem('orbit_refresh_token', refreshToken);
    localStorage.setItem('orbit_tenant_id', userData.tenantId);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('orbit_access_token');
    localStorage.removeItem('orbit_refresh_token');
    localStorage.removeItem('orbit_tenant_id');
    setUser(null);
  };

  const hasRole = (role: string) => {
    return user?.roles.some((r) => r.slug === role) || false;
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login: loginFn, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
