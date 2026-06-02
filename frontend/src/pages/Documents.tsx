import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { UploadCloud, FileType2, Play, Download, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Document {
  id: string;
  filename: string;
  asset_tag?: string;
  created_at: string;
  file_size_kb: number;
  file_url?: string;
}

export default function Documents() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const canUpload = user?.role !== 'Viewer';

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('documents/');
      const results = response.data.results || response.data;
      setDocuments(results);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleUpload = async (files: FileList | File[]) => {
    setIsLoading(true);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setDocuments(prev => [response.data, ...prev]);
      setIsUploadModalOpen(false);
    } catch (err: any) {
      console.error('Failed to upload document:', err);
      const detail = err.response?.data?.detail || err.response?.data?.non_field_errors || JSON.stringify(err.response?.data);
      alert(`Failed to upload document: ${detail || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.asset_tag && doc.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-slate-100">Documents & 2D Plans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Manage technical drawings and reference files for your assets.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 w-full sm:w-64 shadow-sm" 
            />
          </div>
          
          {canUpload && (
            <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
              <UploadCloud className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1 relative">
          {isLoading && documents.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Linked Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upload Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="interactive-element hover-premium-blue transition-colors group cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileType2 className="w-5 h-5 text-slate-400 dark:text-slate-500 mr-3" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{doc.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-mono">
                      {doc.asset_tag || 'Unlinked'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">
                      {doc.file_size_kb} KB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canUpload && (
                          <button 
                            title="Trigger Conversion" 
                            onClick={() => navigate(`/conversions?doc=${doc.id}&name=${encodeURIComponent(doc.filename)}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {doc.file_url && (
                          <a href={doc.file_url} download={doc.filename} target="_blank" rel="noopener noreferrer" title="Download File" className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isUploadModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50" onClick={() => setIsUploadModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload Document</h2>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6">
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer interactive-element hover-premium-blue ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleUpload(e.target.files)} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                  <UploadCloud className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-4" />
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">Click to upload or drag and drop</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">PDF, PNG, JPG (max 20MB)</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
