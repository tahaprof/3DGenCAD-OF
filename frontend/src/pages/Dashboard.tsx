import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Box, AlertTriangle, GitMerge, Clock, Activity } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin';

  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      apiClient.get('audit/')
        .then(response => {
          const results = response.data.results || response.data;
          const mappedLogs = results.map((log: any) => {
            const date = new Date(log.created_at);
            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            let status = 'info';
            if (log.action.toLowerCase().includes('fail') || log.action.toLowerCase().includes('error')) {
              status = 'error';
            } else if (log.action.toLowerCase().includes('add') || log.action.toLowerCase().includes('create') || log.action.toLowerCase().includes('approve')) {
              status = 'success';
            }
            
            return {
              time: time,
              action: `${log.employee_id}: ${log.action}`,
              status: status
            };
          });
          setLogs(mappedLogs.slice(0, 5));
        })
        .catch(err => {
          console.error('Failed to fetch logs:', err);
        });
    }
  }, [isAdmin]);

  // Mock KPIs
  const kpis = [
    { label: 'Active Assets', value: '1,248', trend: '+12', icon: Box, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Open Anomalies', value: '34', trend: '-2', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' },
    { label: 'Pending MoC', value: '12', trend: '+3', icon: GitMerge, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    { label: 'Overdue Inspections', value: '7', trend: '-5', icon: Clock, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' },
  ];

  // Mock Data for Pie Chart (Asset Distribution by Category)
  const pieData = [
    { name: 'Pumps', value: 400 },
    { name: 'Motors', value: 300 },
    { name: 'Valves', value: 300 },
    { name: 'HVAC', value: 200 },
  ];
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  // Mock Data for Line Chart (Asset Conversions Over Time - 30 days for smooth tracking)
  const lineData = Array.from({ length: 30 }, (_, i) => {
    const base = 10 + Math.sin(i / 3) * 5;
    const noise = Math.random() * 3 - 1.5;
    return {
      name: `Day ${i + 1}`,
      conversions: Math.max(0, Math.round(base + noise + (i * 0.5)))
    };
  });

  // Mock Data for Assets by Stage
  const stageData = [
    { site: 'Hassi Messaoud', op: 120, maint: 15, comm: 5, design: 8, proc: 12, decom: 2 },
    { site: 'Rhourde El Baguel', op: 85, maint: 12, comm: 2, design: 4, proc: 5, decom: 0 },
    { site: 'Hassi R\'Mel', op: 210, maint: 25, comm: 10, design: 15, proc: 20, decom: 5 },
    { site: 'Arzew Terminal', op: 150, maint: 18, comm: 8, design: 6, proc: 10, decom: 1 },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col font-sans">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-slate-100">Platform Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Welcome back, {user?.name}. Here's what's happening today.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start justify-between group hover:border-slate-300 dark:border-slate-600 transition-colors">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{kpi.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}</p>
                  <span className={`text-xs font-semibold ${
                    kpi.label === 'Open Anomalies' || kpi.label === 'Overdue Inspections' 
                      ? 'text-red-600' 
                      : kpi.trend.startsWith('+') ? 'text-green-600' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {kpi.trend}
                  </span>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col h-80">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100 mb-4 uppercase tracking-wider">Asset Distribution</h2>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col h-80">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100 mb-4 uppercase tracking-wider">3D Conversions (Last 30 Days)</h2>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorConversions)"
                  activeDot={{ r: 7, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Assets by Stage & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white dark:text-slate-100 uppercase tracking-wider">Assets by Stage Across Sites</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-white dark:bg-slate-900 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Site</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">OP</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">MAINT</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">COMM</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">DES</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">PROC</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">DEC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stageData.map((row, i) => (
                  <tr key={i} className="interactive-element hover-premium-blue transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.site}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{row.op}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{row.maint}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{row.comm}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{row.design}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{row.proc}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{row.decom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm flex flex-col overflow-hidden text-slate-300">
            <div className="p-4 border-b border-slate-800 bg-slate-900 shrink-0 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white dark:text-slate-100 uppercase tracking-wider flex items-center">
                <Activity className="w-4 h-4 mr-2 text-blue-400" />
                System Logs
              </h2>
              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">ADMIN ONLY</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <div key={i} className="flex flex-col border-l-2 pl-3 pb-1" style={{ borderColor: log.status === 'error' ? '#ef4444' : log.status === 'success' ? '#10b981' : '#3b82f6' }}>
                    <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-0.5">{log.time}</span>
                    <span className={`${log.status === 'error' ? 'text-red-300' : 'text-slate-300'}`}>{log.action}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 dark:text-slate-400 text-center py-4">No recent activity.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
