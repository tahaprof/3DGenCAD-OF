import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UploadCloud, FileType2, CheckCircle2, AlertCircle, Clock, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

type ConversionStatus = 'Waiting' | 'In Progress' | 'Completed' | 'Failed';

interface ConversionTask {
  id: string;
  filename: string;
  status: ConversionStatus;
  date: string;
  progress: number;
}

export default function Conversions() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('doc');
  const docName = searchParams.get('name');
  
  const [tasks, setTasks] = useState<ConversionTask[]>([
    { id: 'CONV-001', filename: 'pump_blueprint_v2.pdf', status: 'Completed', date: 'Just now', progress: 100 },
    { id: 'CONV-002', filename: 'valve_assembly.jpg', status: 'In Progress', date: '2 mins ago', progress: 65 },
    { id: 'CONV-003', filename: 'motor_mount.png', status: 'Waiting', date: '15 mins ago', progress: 0 },
    { id: 'CONV-004', filename: 'corrupted_file.pdf', status: 'Failed', date: '1 hour ago', progress: 0 },
  ]);

  useEffect(() => {
    if (docId && docName) {
      const newTask: ConversionTask = {
        id: `CONV-${docId}`,
        filename: docName,
        status: 'Waiting',
        date: 'Just now',
        progress: 0
      };
      
      setTasks(prev => {
        if (prev.some(t => t.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
      
      // Simulate progress
      setTimeout(() => {
        setTasks(current => current.map(t => 
          t.id === newTask.id ? { ...t, status: 'In Progress', progress: 10 } : t
        ));
      }, 1000);
    }
  }, [docId, docName]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newTasks: ConversionTask[] = Array.from(files).map((file, i) => ({
      id: `CONV-NEW-${Date.now()}-${i}`,
      filename: file.name,
      status: 'Waiting',
      date: 'Just now',
      progress: 0
    }));
    
    setTasks(prev => [...newTasks, ...prev]);
    
    newTasks.forEach(task => {
      setTimeout(() => {
        setTasks(current => current.map(t => 
          t.id === task.id ? { ...t, status: 'In Progress', progress: 10 } : t
        ));
      }, 1000);
    });
  };

  const getStatusIcon = (status: ConversionStatus) => {
    switch(status) {
      case 'Completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'Failed': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'In Progress': return <div className="w-5 h-5 border-2 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin" />;
      case 'Waiting': return <Clock className="w-5 h-5 text-slate-400 dark:text-slate-500" />;
    }
  };

  const getStatusBadge = (status: ConversionStatus) => {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'Failed': return 'bg-red-100 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'In Progress': return 'bg-blue-100 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'Waiting': return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const { user } = useAuthStore();
  const canUpload = user?.role !== 'Viewer';

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-slate-100">2D to 3D Conversions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Upload technical drawings to generate 3D models automatically.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {canUpload && (
          <div className="lg:col-span-1 flex flex-col space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">New Conversion</h2>
            
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer min-h-[300px] interactive-element hover-premium-blue
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                  : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileInput}
                className="hidden" 
                multiple 
                accept=".pdf,.png,.jpg,.jpeg" 
              />
              
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors
                ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-white dark:bg-slate-900 shadow-sm text-slate-400 dark:text-slate-500'}`}>
                <UploadCloud className="w-8 h-8" />
              </div>
              
              <h3 className="text-base font-medium text-slate-900 dark:text-white mb-1">Upload Document</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-xs">
                Drag and drop your 2D plans here, or click to browse.
              </p>
              
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-400">PDF</span>
                <span className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-400">PNG</span>
                <span className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-400">JPG</span>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  The AI model will automatically analyze dimensions, views, and materials to generate a parametric 3D model. 
                  This process usually takes 2-5 minutes per file.
                </p>
              </div>
            </div>
          </div>
          </div>
        )}

        <div className={`${canUpload ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
            <h2 className="font-semibold text-slate-900 dark:text-white">Conversion Queue</h2>
            <div className="flex gap-2">
              <button className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-700 rounded-md transition-colors"><Search className="w-4 h-4" /></button>
              <button className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-700 rounded-md transition-colors"><Filter className="w-4 h-4" /></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <AnimatePresence>
              {tasks.map((task) => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 interactive-element hover-premium-blue transition-colors flex items-center cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0">
                    <FileType2 className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.filename}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{task.id} • {task.date}</p>
                      {task.status === 'In Progress' && (
                        <p className="text-xs font-medium text-blue-600">{task.progress}%</p>
                      )}
                    </div>
                    
                    {task.status === 'In Progress' && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                          className="bg-blue-500 h-full rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="pl-4 border-l border-slate-100 dark:border-slate-800 flex items-center justify-center w-12">
                    {getStatusIcon(task.status)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
