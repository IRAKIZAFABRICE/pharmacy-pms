// packages/frontend/src/services/api.ts

import axios from 'axios';

// Create axios instance
const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  // Read token from zustand persist storage (auth-storage key in localStorage)
  let token = null;
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      token = parsed?.state?.token || null;
    }
  } catch (e) {
    // fallback: try direct token key
    token = localStorage.getItem('token');
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on actual 401 auth failures (not connection errors
    // when the backend is still starting up)
    if (error.response?.status === 401) {
      // Don't redirect if we're already on the login page
      if (typeof window !== 'undefined' && !window.location.hash.includes('/login')) {
        // Only redirect if we have a stored token (meaning we were logged in
        // but the token is now invalid/expired)
        try {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.state?.token) {
              window.location.hash = '#/login';
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    }
    return Promise.reject(error);
  }
);

// API service with methods
const api = {
  get: async (url: string, config?: any) => {
    const response = await apiClient.get(url, config);
    return response.data;
  },

  post: async (url: string, data?: any, config?: any) => {
    const response = await apiClient.post(url, data, config);
    return response.data;
  },

  put: async (url: string, data?: any, config?: any) => {
    const response = await apiClient.put(url, data, config);
    return response.data;
  },

  patch: async (url: string, data?: any, config?: any) => {
    const response = await apiClient.patch(url, data, config);
    return response.data;
  },

  delete: async (url: string, config?: any) => {
    const response = await apiClient.delete(url, config);
    return response.data;
  },

  request: async (url: string, options: RequestInit = {}) => {
    let token = null;
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed?.state?.token || null;
      }
    } catch (e) {
      token = localStorage.getItem('token');
    }
    const response = await fetch(`${apiClient.defaults.baseURL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  },
};

// Export both for maximum compatibility
export default api;
export { api };