import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { Cuboid, ArrowRight, Lock, User, Key, RefreshCw, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetCode, setResetCode] = useState('');

  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(employeeId, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid Employee ID or password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await apiClient.post('users/request-reset/', { employee_id: employeeId });
      setResetStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsLoading(true);
    try {
      await apiClient.post('users/request-reset/', { employee_id: employeeId });
      setError('Code resent successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await apiClient.post('users/verify-reset/', {
        employee_id: employeeId,
        code: resetCode
      });
      setResetStep(3);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('users/verify-reset/', {
        employee_id: employeeId,
        code: resetCode,
        new_password: password
      });
      setIsResetMode(false);
      setResetStep(1);
      setResetCode('');
      setPassword('');
      setConfirmPassword('');
      setError('Password reset successfully. Please log in.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-[100px] opacity-70"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[100px] opacity-70"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 backdrop-blur-xl bg-white dark:bg-slate-900/60">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 mb-4 shadow-lg shadow-blue-500/10 shrink-0">
              <img src="/logo-light.png?v=3" className="w-20 h-20 rounded-2xl object-cover dark:hidden" alt="Logo" />
              <img src="/logo-dark.png?v=3" className="w-20 h-20 rounded-2xl object-cover hidden dark:block" alt="Logo" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isResetMode ? 'Reset Password' : 'Mini PLM'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">
              {isResetMode
                ? `Step ${resetStep} of 3`
                : 'Product Lifecycle Management — simplified.'}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-3 border text-sm rounded-lg text-center mb-5 ${error.includes('successfully')
                ? 'bg-green-50 border-green-100 text-green-600'
                : 'bg-red-50 dark:bg-red-900/30 border-red-100 text-red-600'
                }`}
            >
              {error}
            </motion.div>
          )}

          {!isResetMode ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Employee ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    placeholder="e.g. EMP001"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                  >
                    {showPassword ? (
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
                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70 group mt-2 interactive-element"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={
                resetStep === 1 ? handleRequestReset :
                  resetStep === 2 ? handleVerifyCode :
                    handleFinalReset
              }
              className="space-y-5"
            >
              {resetStep === 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Employee ID</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      placeholder="e.g. EMP001"
                      required
                    />
                  </div>
                </div>
              )}

              {resetStep === 2 && (
                <>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-lg text-center mb-2">
                    Type the code sent to your email.
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reset Code (4 digits)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                        placeholder="e.g. 1234"
                        required
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center"
                      disabled={isLoading}
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                      Resend Code
                    </button>
                  </div>
                </>
              )}

              {resetStep === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                        placeholder="••••••••"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                        placeholder="••••••••"
                        required
                        minLength={8}
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
                </>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (resetStep === 1) {
                      setIsResetMode(false);
                    } else {
                      setResetStep(resetStep - 1);
                    }
                    setError('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                >
                  {resetStep === 1 ? 'Cancel' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70 group"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {resetStep === 1 ? 'Send Code' : resetStep === 2 ? 'Verify Code' : 'Reset Password'}
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Demo Accounts: EMP001 (Admin), EMP002 (Manager), EMP003 (Tech), EMP004 (Viewer)
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
