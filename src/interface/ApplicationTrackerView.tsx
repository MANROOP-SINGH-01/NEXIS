import React, { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, Loader2, PlusCircle, CheckCircle2,
  Clock, XCircle, AlertCircle, RefreshCw, Send, ChevronRight
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { Button } from './primitives/Button';
import { Card } from './primitives/Card';
import { Badge } from './primitives/Badge';

const COLUMNS = [
  { id: 'SAVED', title: 'Saved', color: 'text-zinc-400 bg-zinc-800/80 border-zinc-700' },
  { id: 'APPLIED', title: 'Applied', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  { id: 'ASSESSMENT', title: 'Assessment', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'INTERVIEW', title: 'Interview', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'OFFER', title: 'Offer', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'REJECTED', title: 'Rejected', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
];

export const ApplicationTrackerView: React.FC = () => {
  const { traineeProfile } = useCoreStore();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications', {
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Failed to load applications');
      const data = await res.json();
      setApplications(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

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
          ...getAuthHeaders() 
        },
        body: JSON.stringify({ status: newStatus, notes: `Moved to ${newStatus}` })
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      const updatedApp = await res.json();
      setApplications(prev => prev.map(app => app.id === id ? updatedApp : app));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-6 sm:p-8 flex flex-col gap-6 max-w-[1500px] w-full mx-auto custom-scrollbar bg-[#090a0f]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white tracking-tight">
              Application Pipeline Tracker
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Live progression kanban across your active job applications
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchApplications}
          disabled={loading}
          leftIcon={<RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
        >
          Refresh Board
        </Button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 text-rose-300 text-xs font-mono rounded-xl border border-rose-500/20 flex items-center gap-2">
          <AlertCircle size={15} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar">
        {COLUMNS.map(col => {
          const colApps = getApplicationsByStatus(col.id);
          return (
            <div key={col.id} className="min-w-[280px] w-[280px] flex flex-col gap-3 snap-center">
              {/* Column Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold font-['Space_Grotesk'] uppercase tracking-wider text-zinc-300">
                  {col.title}
                </span>
                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${col.color}`}>
                  {colApps.length}
                </span>
              </div>

              {/* Column Dropzone / Container */}
              <div className="flex-1 bg-[#12131c] border border-zinc-800 rounded-2xl p-3 flex flex-col gap-2.5 min-h-[420px]">
                {colApps.map(app => (
                  <div
                    key={app.id}
                    className="bg-[#1a1b28] p-4 rounded-xl border border-zinc-700/60 shadow-sm hover:border-indigo-500/40 transition-all relative group"
                  >
                    {updating === app.id && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-10 flex items-center justify-center rounded-xl">
                        <Loader2 className="animate-spin text-indigo-400" size={20} />
                      </div>
                    )}
                    
                    <h4 className="font-bold font-['Space_Grotesk'] text-white text-sm leading-snug mb-1">
                      {app.jobTitle}
                    </h4>
                    <p className="text-xs text-zinc-400 font-mono mb-3 truncate">{app.companyName}</p>
                    
                    <div className="flex items-center gap-2 pt-2.5 border-t border-zinc-800">
                      <span className="text-[10px] uppercase font-mono text-zinc-500 flex-1">Move:</span>
                      <select
                        className="text-xs font-mono bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-indigo-500"
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
                
                {colApps.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800/80 rounded-xl">
                    <Briefcase size={20} className="text-zinc-700 mb-2" />
                    <p className="text-xs text-zinc-500 font-mono">No items in {col.title}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApplicationTrackerView;
