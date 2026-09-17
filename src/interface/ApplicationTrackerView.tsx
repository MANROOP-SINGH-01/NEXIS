import React, { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, Loader2, PlusCircle, CheckCircle2,
  Clock, XCircle, AlertCircle, RefreshCw, Send, ChevronRight
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';


const COLUMNS = [
  { id: 'SAVED', title: 'Saved', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  { id: 'APPLIED', title: 'Applied', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'ASSESSMENT', title: 'Assessment', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'INTERVIEW', title: 'Interview', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'OFFER', title: 'Offer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'REJECTED', title: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' }
];

export const ApplicationTrackerView: React.FC = () => {
  const { traineeProfile } = useCoreStore();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const getActiveToken = useCallback((): string => {
    try {
      const auth = localStorage.getItem('nexis-auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed?.state?.token) return parsed.state.token;
      }
    } catch {}
    return '';
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications', {
        headers: { Authorization: `Bearer ${getActiveToken()}` }
      });
      if (!res.ok) throw new Error('Failed to load applications');
      const data = await res.json();
      setApplications(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [getActiveToken]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getActiveToken()}` 
        },
        body: JSON.stringify({ status: newStatus, notes: `Moved to ${newStatus}` })
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      // Update local state directly for speed, or refetch
      const updatedApp = await res.json();
      setApplications(prev => prev.map(app => app.id === id ? updatedApp : app));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  // Kanban Drag and Drop simulation
  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-8 sm:p-8 flex flex-col gap-6 max-w-[1400px] w-full mx-auto custom-scrollbar bg-zinc-50/30">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-zinc-900/10">
            <Briefcase size={22} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-zinc-950 tracking-tight leading-tight">Application Tracker</h1>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              Track your job applications across the hiring pipeline.
            </p>
          </div>
        </div>
        <button
          onClick={fetchApplications}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-all shadow-[var(--shadow-subtle)] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 font-medium flex items-center gap-3">
          <AlertCircle size={16} className="text-red-500" />
          {error}
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex flex-1 gap-6 overflow-x-auto pb-4 snap-x">
        {COLUMNS.map(col => (
          <div key={col.id} className="min-w-[300px] w-[300px] flex flex-col gap-3 snap-center">
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">{col.title}</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${col.color}`}>
                {getApplicationsByStatus(col.id).length}
              </span>
            </div>

            {/* Column Body */}
            <div className="flex-1 bg-zinc-100/50 border border-zinc-200/60 rounded-3xl p-3 flex flex-col gap-3 min-h-[400px]">
              {getApplicationsByStatus(col.id).map(app => (
                <div key={app.id} className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-md transition-shadow relative group">
                  {updating === app.id && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                      <Loader2 className="animate-spin text-zinc-900" size={24} />
                    </div>
                  )}
                  
                  <h4 className="font-bold text-zinc-950 text-sm leading-tight mb-1">{app.jobTitle}</h4>
                  <p className="text-xs text-zinc-500 font-medium mb-4">{app.companyName}</p>
                  
                  <div className="flex items-center gap-2 mt-2 pt-3 border-t border-zinc-100">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 flex-1">Move to:</span>
                    <select
                      className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 font-medium text-zinc-700 outline-none cursor-pointer hover:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10"
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                    >
                      {COLUMNS.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              
              {getApplicationsByStatus(col.id).length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                    <Briefcase size={16} className="text-zinc-300" />
                  </div>
                  <p className="text-xs font-medium text-zinc-400">No applications in {col.title}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApplicationTrackerView;
