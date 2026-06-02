import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useAnomalyStore } from '../store/anomalyStore';
import { useAssetStore } from '../store/assetStore';
import type { AnomalyState } from '../store/anomalyStore';
import { AlertTriangle, Filter, Trash2, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';

export default function Anomalies() {
  const { user } = useAuthStore();
  const { anomalies, fetchAnomalies, updateAnomalyState, removeAnomaly, addAnomaly } = useAnomalyStore();
  const { assets, fetchAssets } = useAssetStore();
  const [stateFilter, setStateFilter] = useState<'all' | AnomalyState>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAnomaly, setNewAnomaly] = useState({ assetId: '', issue: '', type: 'Corrosion', priority: 'Medium' });
  const anomalyTypes = ['Corrosion', 'Vibration', 'Leak', 'Electrical', 'Structural', 'Other'];
  const anomalyPriorities = ['Low', 'Medium', 'High', 'Critical'];

  useEffect(() => {
    fetchAnomalies();
    if (assets.length === 0) fetchAssets();
  }, [fetchAnomalies, fetchAssets, assets.length]);

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';
  const isTechnician = user?.role === 'Technician';

  const getStateBadge = (state: AnomalyState) => {
    switch(state) {
      case 'reported': return <span className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-sm border border-red-200 dark:border-red-800 uppercase">Reported</span>;
      case 'awaiting review': return <span className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-sm border border-orange-200 dark:border-orange-800 uppercase">Awaiting Review</span>;
      case 'fixed': return <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-sm border border-green-200 dark:border-green-800 uppercase">Fixed</span>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch(priority) {
      case 'Critical': return <span className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">Critical</span>;
      case 'High': return <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">High</span>;
      case 'Low': return <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">Low</span>;
      case 'Medium':
      default: return <span className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">Medium</span>;
    }
  };

  const getAvailableOptions = (currentState: AnomalyState) => {
    if (isAdminOrManager) return ['reported', 'fixed'] as AnomalyState[];
    if (isTechnician) return ['awaiting review'] as AnomalyState[];
    return [] as AnomalyState[];
  };

  const filtered = anomalies.filter(a => stateFilter === 'all' || a.state === stateFilter);

  const handleAddAnomaly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnomaly.assetId || !newAnomaly.issue) return;
    const formattedIssue = `[${newAnomaly.type}] ${newAnomaly.issue}`;
    await addAnomaly({ asset: newAnomaly.assetId, issue: formattedIssue, priority: newAnomaly.priority });
    setShowAddForm(false);
    setNewAnomaly({ assetId: '', issue: '', type: 'Corrosion', priority: 'Medium' });
  };

  return (
    <div className="h-full flex flex-col font-sans max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Anomaly Tracking</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review and manage reported equipment anomalies.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdminOrManager || isTechnician ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Report Anomaly
            </button>
          ) : null}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <select 
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value as any)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <option value="all">All States</option>
              <option value="reported">Reported</option>
              <option value="awaiting review">Awaiting Review</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-6 relative z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Report New Anomaly</h2>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddAnomaly} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 z-30">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Asset</label>
              <CustomSelect
                value={newAnomaly.assetId}
                onChange={(val) => setNewAnomaly(prev => ({ ...prev, assetId: val }))}
                placeholder="Select Asset..."
                options={assets.map(a => ({ label: `${a.tag} - ${a.reference}`, value: a.id }))}
              />
            </div>
            <div className="w-full md:w-32 z-20">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Type</label>
              <CustomSelect
                value={newAnomaly.type}
                onChange={(val) => setNewAnomaly(prev => ({ ...prev, type: val }))}
                options={anomalyTypes.map(t => ({ label: t, value: t }))}
              />
            </div>
            <div className="w-full md:w-32 z-10">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Priority</label>
              <CustomSelect
                value={newAnomaly.priority}
                onChange={(val) => setNewAnomaly(prev => ({ ...prev, priority: val }))}
                options={anomalyPriorities.map(p => ({ label: p, value: p }))}
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Issue Description</label>
              <input
                required
                type="text"
                value={newAnomaly.issue}
                onChange={(e) => setNewAnomaly(prev => ({ ...prev, issue: e.target.value }))}
                placeholder="Describe the issue..."
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-end mt-4 md:mt-0">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 w-full sm:w-auto"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Issue Description</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">State</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reported</th>
                {(isAdminOrManager || isTechnician) && <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((anomaly) => {
                const options = getAvailableOptions(anomaly.state);
                const displayOptions = options.includes(anomaly.state) ? options : [anomaly.state, ...options];

                return (
                  <tr key={anomaly.id} className="interactive-element hover-premium-blue transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/assets/${anomaly.asset}`} className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                        {anomaly.assetTag}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <AlertTriangle className={`w-4 h-4 mr-2 ${anomaly.state === 'reported' ? 'text-red-500' : anomaly.state === 'awaiting review' ? 'text-orange-500' : 'text-slate-400'}`} />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{anomaly.issue}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStateBadge(anomaly.state)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(anomaly.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400">
                      {anomaly.date}
                    </td>
                    {(isAdminOrManager || isTechnician) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select 
                            value={anomaly.state}
                            onChange={(e) => updateAnomalyState(anomaly.id, e.target.value as AnomalyState)}
                            className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-400 cursor-pointer text-slate-700 dark:text-slate-300 capitalize"
                          >
                            {displayOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {isAdminOrManager && (
                            <button 
                              onClick={() => removeAnomaly(anomaly.id)}
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 transition-colors"
                              title="Delete anomaly"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
