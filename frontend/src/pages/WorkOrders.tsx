import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Wrench, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '../components/CustomSelect';

interface WorkOrder {
  id: string;
  title: string;
  assetTag: string;
  assignedUser: string;
  status: 'open' | 'in_progress' | 'done';
  priority: 'High' | 'Medium' | 'Low';
}

const mockOrders: WorkOrder[] = [
  { id: 'WO-001', title: 'Replace worn bearing on main pump', assetTag: 'P-105A', assignedUser: 'EMP003', status: 'in_progress', priority: 'High' },
  { id: 'WO-002', title: 'Calibrate pressure sensor', assetTag: 'V-201', assignedUser: 'EMP002', status: 'open', priority: 'Medium' },
  { id: 'WO-003', title: 'Routine inspection', assetTag: 'T-501', assignedUser: 'EMP003', status: 'done', priority: 'Low' },
];

export default function WorkOrders() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<WorkOrder[]>(mockOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'open': return <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 border rounded text-xs font-medium">Open</span>;
      case 'in_progress': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 border rounded text-xs font-medium">In Progress</span>;
      case 'done': return <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 border rounded text-xs font-medium">Done</span>;
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch(prio) {
      case 'High': return <span className="text-red-600 font-medium text-xs">High</span>;
      case 'Medium': return <span className="text-orange-600 font-medium text-xs">Medium</span>;
      case 'Low': return <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium text-xs">Low</span>;
    }
  };

  const changeStatus = (id: string, newStatus: any) => {
    if (!canManage) return;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-slate-100">Work Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Manage maintenance tasks and team assignments.</p>
        </div>
        
        {canManage && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-slate-100 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Work Order</span>
          </button>
        )}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="interactive-element hover-premium-blue transition-colors cursor-pointer">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white dark:text-slate-100">
                    <div className="flex items-center">
                      <Wrench className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mr-2" />
                      {order.title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{order.assetTag}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{order.assignedUser}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getPriorityBadge(order.priority)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canManage ? (
                      <CustomSelect
                        variant="minimal"
                        className="w-24"
                        value={order.status}
                        onChange={(val) => changeStatus(order.id, val)}
                        options={[
                          { label: 'Open', value: 'open' },
                          { label: 'In Progress', value: 'in_progress' },
                          { label: 'Done', value: 'done' }
                        ]}
                      />
                    ) : (
                      getStatusBadge(order.status)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-slate-100">Create Work Order</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Task Title</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" placeholder="e.g. Check valve pressure" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Linked Asset TAG</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono" placeholder="V-201" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Assign To</label>
                    <select className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900">
                      <option>EMP002 (Manager)</option>
                      <option>EMP003 (Tech)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Priority</label>
                    <select className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900">
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-white dark:text-slate-100 transition-colors">Cancel</button>
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-slate-100 rounded-xl text-sm font-medium transition-colors shadow-sm">Create Task</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
