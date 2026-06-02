import React, { useState, useEffect } from 'react';
import { useAuthStore, type Role } from '../store/authStore';
import { Shield, Trash2, Plus, Search, User as UserIcon } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../api/client';

interface UserData {
  id: number;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export default function Users() {
  const { user } = useAuthStore();
  
  if (user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('Technician');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('users/');
      setUsers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = async (id: number) => {
    const targetUser = users.find(u => u.id === id);
    if (targetUser?.employee_id === user?.id) {
      alert("You cannot delete yourself.");
      return;
    }
    
    try {
      await apiClient.delete(`users/${id}/`);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await apiClient.post('users/', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        role: newUserRole
      });
      
      setUsers([...users, response.data]);
      setIsAddModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setNewUserRole('Technician');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add user.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-slate-100">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Manage employee access and roles.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-slate-100 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Employee</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100">
              <AnimatePresence>
                {filteredUsers.map((u) => (
                  <motion.tr 
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="interactive-element hover-premium-blue transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
                          <UserIcon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-white dark:text-slate-100">{u.full_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{u.employee_id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                        ${u.role === 'Admin' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 border-purple-200' : 
                          u.role === 'Manager' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' : 
                          u.role === 'Technician' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                      >
                        {u.role === 'Admin' && <Shield className="w-3 h-3 mr-1" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === user?.id}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm">
              No users found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white dark:text-slate-100 mb-4">Add New Employee</h2>
                <form onSubmit={handleAddUser} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 text-sm rounded-lg text-center">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                    <input 
                      type="text" 
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      placeholder="e.g. Jane"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                    <input 
                      type="text" 
                      required
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      placeholder="e.g. Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Personal Email</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      placeholder="e.g. jane.doe@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                    <select 
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value as Role)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Technician">Technician</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>
                  
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white dark:text-slate-100 rounded-xl font-medium transition-colors shadow-sm shadow-blue-500/20"
                    >
                      Add User
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
