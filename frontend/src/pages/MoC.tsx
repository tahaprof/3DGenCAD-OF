import React, { useState, useEffect } from 'react';
import { GitMerge } from 'lucide-react';
import apiClient from '../api/client';

export default function MoC() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    apiClient.get('audit/')
      .then(response => {
        const results = response.data.results || response.data;
        const mappedLogs = results.map((log: any) => {
          const date = new Date(log.created_at);
          const formattedDate = date.toLocaleString([], { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          return {
            id: log.id,
            user: log.employee_id || 'System',
            action: log.action,
            entity: log.entity_id || log.entity_type || 'N/A',
            date: formattedDate
          };
        });
        setLogs(mappedLogs);
      })
      .catch(err => {
        console.error('Failed to fetch logs:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="h-full flex flex-col font-sans max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-slate-100">Management of Change (MoC)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Traceability log for all system actions and updates.</p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length > 0 ? (
          <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-8 pb-8">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-8">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {log.user}
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{log.action}</span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-mono">{log.date}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 flex items-center">
                    <GitMerge className="w-3 h-3 mr-1" /> Ref: {log.entity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8">No logs found.</div>
        )}
      </div>
    </div>
  );
}
