import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api/v1';

// Token storage helpers — keeps auth logic in one place
export const tokenStorage = {
  getAccess: () => localStorage.getItem('accessToken'),
  getRefresh: () => localStorage.getItem('refreshToken'),
  set: (access: string, refresh: string) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  },
  clear: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => (token ? prom.resolve(token) : prom.reject(error)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStorage.getRefresh();

      if (!refreshToken) {
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers!.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
        const newToken = data.data.accessToken;
        tokenStorage.set(newToken, refreshToken);
        processQueue(null, newToken);
        originalRequest.headers!.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ── Typed API helpers ──────────────────────────────────────────────────────

export const authApi = {
  register: (data: {
    email: string; password: string; fullName: string;
    phone?: string; role: string; latitude?: number; longitude?: number; address?: string;
  }) => api.post('/auth/register', data),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh-token', { refreshToken }),

  getMe: () => api.get('/auth/me'),
};

export const profileApi = {
  get: () => api.get('/profile'),
  update: (data: any) => api.put('/profile', data),
  updateLocation: (latitude: number, longitude: number, address: string) =>
    api.put('/profile/location', { latitude, longitude, address }),
  setAvailability: (isAvailable: boolean) =>
    api.put('/profile/availability', { isAvailable }),
  getNearbyHelpers: (latitude: number, longitude: number, maxDistance?: number) =>
    api.get('/profile/nearby-helpers', { params: { latitude, longitude, maxDistance } }),
};

export const requestsApi = {
  create: (data: {
    cylinderType: string; message?: string;
    latitude: number; longitude: number; address: string; quantity?: number;
  }) => api.post('/requests', data),

  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/requests/user', { params }),

  getPending: (params?: {
    latitude?: number; longitude?: number;
    maxDistance?: number; page?: number; limit?: number;
  }) => api.get('/requests/pending', { params }),

  getById: (id: string) => api.get(`/requests/${id}`),
  accept: (id: string) => api.put(`/requests/${id}/accept`),
  complete: (id: string, data?: { rating?: number; review?: string }) =>
    api.put(`/requests/${id}/complete`, data),
  cancel: (id: string) => api.put(`/requests/${id}/cancel`),
  getStats: () => api.get('/requests/stats'),
};

export const providersApi = {
  getNearby: (latitude: number, longitude: number, maxDistance?: number, businessType?: string) =>
    api.get('/providers/nearby', { params: { latitude, longitude, maxDistance, businessType } }),
  search: (query: string, businessType?: string) =>
    api.get('/providers/search', { params: { query, businessType } }),
  getTop: (limit?: number) => api.get('/providers/top', { params: { limit } }),
  getById: (id: string) => api.get(`/providers/${id}`),
  create: (data: any) => api.post('/providers', data),
  getMyProvider: () => api.get('/providers/me'),
  update: (data: any) => api.put('/providers/me', data),
};

export const messagesApi = {
  send: (requestId: string, receiverId: string, content: string) =>
    api.post('/messages', { requestId, receiverId, content }),
  getByRequest: (requestId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/messages/request/${requestId}`, { params }),
  getUnreadCount: () => api.get('/messages/unread-count'),
  markRead: (id: string) => api.put(`/messages/${id}/mark-read`),
  getChatHistory: (requestId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/messages/chat/${requestId}`, { params }),
  markChatRead: (requestId: string) =>
    api.put(`/messages/chat/${requestId}/read`),
};

export const ratingsApi = {
  create: (data: { requestId: string; toUserId: string; providerId?: string; rating: number; review?: string }) =>
    api.post('/ratings', data),
  getUserRatings: (userId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/ratings/user/${userId}`, { params }),
  getProviderRatings: (providerId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/ratings/provider/${providerId}`, { params }),
};

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/notifications', { params }),
  getUnread: () => api.get('/notifications/unread'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};