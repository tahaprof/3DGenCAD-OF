import { create } from 'zustand';
import apiClient from '../api/client';

export type Role = 'Admin' | 'Manager' | 'Technician' | 'Viewer';

export interface User {
  id: string; // Employee ID
  name: string;
  role: Role;
  must_change_password: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (employeeId: string, password: string) => Promise<boolean>;
  logout: () => void;
  setMustChangePassword: (value: boolean) => void;
}

const storedUser = localStorage.getItem('user');
const initialUser = storedUser ? JSON.parse(storedUser) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: !!localStorage.getItem('access_token'),
  login: async (employee_id, password) => {
    try {
      const response = await apiClient.post('auth/login/', { employee_id, password });
      const { access, refresh, user } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      const userData = { 
        id: user.employee_id, 
        name: user.full_name, 
        role: user.role as Role,
        must_change_password: user.must_change_password
      };
      localStorage.setItem('user', JSON.stringify(userData));
      
      set({ user: userData, isAuthenticated: true });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },
  setMustChangePassword: (value) => set((state) => {
    if (state.user) {
      const updatedUser = { ...state.user, must_change_password: value };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    }
    return state;
  }),
}));
