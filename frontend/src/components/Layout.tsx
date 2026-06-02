import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Files,
  Users,
  LogOut,
  Cuboid,
  Menu,
  Box,
  FileText,
  GitMerge,
  AlertTriangle,
  ClipboardList,
  Moon,
  Sun
} from 'lucide-react';

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return next;
    });
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (user?.must_change_password) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 justify-center items-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
          <div className="mt-6 text-center">
            <button
              onClick={logout}
              className="text-sm font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Asset Registry', path: '/assets', icon: Box },
    { name: 'Documents', path: '/documents', icon: FileText },
  ];

  if (user?.role === 'Admin') {
    navItems.push({ name: 'Mgmt of Change', path: '/moc', icon: GitMerge });
  }

  navItems.push(
    { name: 'Anomalies', path: '/anomalies', icon: AlertTriangle },
    { name: 'Work Orders', path: '/work-orders', icon: ClipboardList },
    { name: 'Conversions', path: '/conversions', icon: Files }
  );

  if (user?.role === 'Admin') {
    navItems.push({ name: 'Users', path: '/users', icon: Users });
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-transparent overflow-hidden font-sans transition-colors duration-200">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col hidden md:flex"
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 mr-3 shadow-sm flex items-center justify-center shrink-0">
            <img src="/logo-light.png?v=3" className="w-8 h-8 rounded-lg object-cover dark:hidden" alt="Logo" />
            <img src="/logo-dark.png?v=3" className="w-8 h-8 rounded-lg object-cover hidden dark:block" alt="Logo" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white dark:text-slate-100 tracking-tight text-lg">Mini <span className="text-blue-600 dark:text-blue-400">PLM</span></span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive
                  ? 'bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-slate-300' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center px-3 py-3 mb-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs uppercase mr-3">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate">{user?.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleDarkMode}
              className="flex-1 flex items-center justify-center px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:bg-slate-900 rounded-xl transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-amber-500" /> : <Moon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-blue-500" />}
            </button>
            <button
              onClick={logout}
              className="flex-[4] flex items-center px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:bg-red-900/30 hover:text-red-600 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3 text-slate-400 dark:text-slate-500 group-hover:text-red-500" />
              Logout
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:hidden shrink-0">
          <div className="flex items-center">
            <div className="w-8 h-8 mr-3 flex items-center justify-center shrink-0">
              <img src="/logo-light.png?v=3" className="w-8 h-8 rounded-lg object-cover dark:hidden" alt="Logo" />
              <img src="/logo-dark.png?v=3" className="w-8 h-8 rounded-lg object-cover hidden dark:block" alt="Logo" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white dark:text-slate-100">Mini <span className="text-blue-600 dark:text-blue-400">PLM</span></span>
          </div>
          <button className="p-2 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
