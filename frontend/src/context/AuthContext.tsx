import {
  createContext, useContext, useState, useEffect,
  useCallback, ReactNode,
} from 'react';
import { authApi, tokenStorage } from '../lib/api';
import { getSocket, disconnectSocket, updateSocketToken } from '../lib/socket';
import type { AuthUser, Profile } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (data: {
    email: string; password: string; fullName: string;
    role: string; phone?: string; address?: string;
    latitude?: number; longitude?: number;
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    const token = tokenStorage.getAccess();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.getMe();
      setUser(data.data.user);
      setProfile(data.data.profile);
      // Connect socket when user is authenticated
      const socket = getSocket();
      socket.emit('status:online');
    } catch {
      tokenStorage.clear();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const signUp = async (data: {
    email: string; password: string; fullName: string; role: string;
    phone?: string; address?: string; latitude?: number; longitude?: number;
  }) => {
    const response = await authApi.register(data);
    const { accessToken, refreshToken, user: authUser, profile: authProfile } = response.data.data;
    tokenStorage.set(accessToken, refreshToken);
    setUser(authUser);
    setProfile(authProfile);
    updateSocketToken();
    getSocket();
  };

  const signIn = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { accessToken, refreshToken, user: authUser, profile: authProfile } = response.data.data;
    tokenStorage.set(accessToken, refreshToken);
    setUser(authUser);
    setProfile(authProfile);
    updateSocketToken();
    const socket = getSocket();
    socket.emit('status:online');
  };

  const signOut = async () => {
    const refreshToken = tokenStorage.getRefresh();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { /* Ignore logout errors */ } finally {
      tokenStorage.clear();
      setUser(null);
      setProfile(null);
      disconnectSocket();
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await authApi.getMe();
      setProfile(data.data.profile);
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}