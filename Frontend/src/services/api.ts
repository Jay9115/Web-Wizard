import axios, { AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or cookies
    const token = localStorage.getItem('authToken') || Cookies.get('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 errors (token expired or invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh token for login, register, or refresh-token endpoints
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                            originalRequest.url?.includes('/auth/register') ||
                            originalRequest.url?.includes('/auth/refresh-token');
      
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Only try to refresh if we have a token
        const existingToken = localStorage.getItem('authToken') || Cookies.get('authToken');
        if (!existingToken) {
          throw new Error('No token available');
        }

        // Try to refresh token
        const refreshResponse = await api.post('/auth/refresh-token');
        const newToken = refreshResponse.data.data.token;

        // Update token in storage
        localStorage.setItem('authToken', newToken);
        Cookies.set('authToken', newToken, { expires: 7, secure: true, sameSite: 'strict' });

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('authToken');
        Cookies.remove('authToken');
        
        // Only redirect if we're not already on the login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'admin';
  status: 'active' | 'inactive';
  studentId?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  profilePicture?: string;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    value: any;
  }>;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId?: string;
  phone?: string;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface SearchParams extends PaginationParams {
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Auth API
export const authAPI = {
  // Register new user
  register: async (userData: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await api.post('/auth/login', credentials);
    
    // Store token in localStorage and cookies
    if (response.data.success && response.data.data.token) {
      const token = response.data.data.token;
      localStorage.setItem('authToken', token);
      
      // Set cookie based on rememberMe option
      const expires = credentials.rememberMe ? 30 : 1; // 30 days or 1 day
      Cookies.set('authToken', token, { 
        expires, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' 
      });
    }
    
    return response.data;
  },

  // Logout user
  logout: async (): Promise<ApiResponse> => {
    const response = await api.post('/auth/logout');
    
    // Clear tokens from storage
    localStorage.removeItem('authToken');
    Cookies.remove('authToken');
    
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Refresh token
  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await api.post('/auth/refresh-token');
    return response.data;
  },

  // Change password
  changePassword: async (passwordData: PasswordChangeData): Promise<ApiResponse> => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },
};

// User API
export const userAPI = {
  // Get user profile
  getProfile: async (userId: string): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get(`/users/profile/${userId}`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (userId: string, updateData: ProfileUpdateData): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put(`/users/profile/${userId}`, updateData);
    return response.data;
  },

  // Get user dashboard data
  getDashboard: async (userId: string): Promise<ApiResponse<{ user: User; dashboard: any }>> => {
    const response = await api.get(`/users/dashboard/${userId}`);
    return response.data;
  },

  // Upload avatar
  uploadAvatar: async (userId: string, avatarUrl: string): Promise<ApiResponse<{ profilePicture: string }>> => {
    const response = await api.post(`/users/upload-avatar/${userId}`, { avatarUrl });
    return response.data;
  },

  // Get user activity
  getActivity: async (userId: string, params?: PaginationParams): Promise<ApiResponse<{ activities: any[]; pagination: any }>> => {
    const response = await api.get(`/users/activity/${userId}`, { params });
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  // Get all users
  getUsers: async (params?: SearchParams): Promise<ApiResponse<{ users: User[]; pagination: any; filters: any }>> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // Get specific user details
  getUser: async (userId: string): Promise<ApiResponse<{ user: User; recentActivity: any[] }>> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData: RegisterData & { role?: string; generatePassword?: boolean }): Promise<ApiResponse<{ user: User; temporaryPassword?: string }>> => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (userId: string, updateData: ProfileUpdateData & { status?: string; role?: string; studentId?: string }): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put(`/admin/users/${userId}`, updateData);
    return response.data;
  },

  // Delete user
  deleteUser: async (userId: string, hardDelete = false): Promise<ApiResponse> => {
    const response = await api.delete(`/admin/users/${userId}`, { 
      params: { hardDelete: hardDelete.toString() } 
    });
    return response.data;
  },

  // Get dashboard statistics
  getStats: async (): Promise<ApiResponse<{ stats: any; recentActivity: any[] }>> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Get audit logs
  getAuditLogs: async (params?: PaginationParams & { action?: string; userId?: string; startDate?: string; endDate?: string }): Promise<ApiResponse<{ logs: any[]; pagination: any }>> => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
};

// Utility functions
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('authToken') || Cookies.get('authToken');
    return !!token;
  },

  // Get stored token
  getToken: (): string | null => {
    return localStorage.getItem('authToken') || Cookies.get('authToken') || null;
  },

  // Clear authentication
  clearAuth: (): void => {
    localStorage.removeItem('authToken');
    Cookies.remove('authToken');
  },

  // Handle API errors
  handleError: (error: AxiosError): string => {
    if (error.response?.data) {
      const errorData = error.response.data as ApiResponse;
      return errorData.message || 'An error occurred';
    }
    
    if (error.message === 'Network Error') {
      return 'Network error. Please check your connection.';
    }
    
    return error.message || 'An unexpected error occurred';
  },

  // Format user display name
  formatUserName: (user: User): string => {
    return `${user.firstName} ${user.lastName}`.trim();
  },

  // Check if user has admin role
  isAdmin: (user: User): boolean => {
    return user.role === 'admin';
  },

  // Check if user profile is complete
  isProfileComplete: (user: User): boolean => {
    return !!(
      user.firstName &&
      user.lastName &&
      user.email &&
      user.phone &&
      user.dateOfBirth
    );
  },
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.data.status === 'OK';
  } catch (error) {
    return false;
  }
};

// Export default API instance for custom requests
export default api;