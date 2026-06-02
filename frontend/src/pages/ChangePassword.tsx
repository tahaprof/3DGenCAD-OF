import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const setMustChangePassword = useAuthStore(state => state.setMustChangePassword);
  const navigate = useNavigate();

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    setIsLoading(true);
    try {
      await apiClient.post('users/change-password/', {
        old_password: oldPassword,
        new_password: newPassword
      });
      
      setMustChangePassword(false);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Change Your Password</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1">
            You must change your default password before accessing the platform.
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showOldPassword ? "text" : "password"}
                required
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
              >
                {showOldPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
              >
                {showNewPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70 group mt-6"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Update Password
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
