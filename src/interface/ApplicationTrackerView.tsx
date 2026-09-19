import React, { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, Loader2, PlusCircle, CheckCircle2,
  Clock, XCircle, AlertCircle, RefreshCw, Send, ChevronRight
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { isDemoMode } from '../demo/demoData';

const DEMO_APPLICATIONS = [
  {
    id: 'demo-app-1',
    role: 'Senior Full-Stack Engineer',
    company: 'Razorpay',
    status: 'APPLIED',
    fitScore: 92,
    source: 'company-careers',
    notes: 'Direct skills overlap in React, Node.js, distributed payments. Two-phase ATS packet submitted.',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-app-2',
    role: 'Platform Engineer',
    company: 'Zerodha',
    status: 'ASSESSMENT',
    fitScore: 85,
    source: 'hidden',
    notes: 'System design assessment link received. Due in 48 hours.',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'demo-app-3',
    role: 'Staff Frontend Architect',
    company: 'Swiggy',
    status: 'INTERVIEW',
    fitScore: 89,
    source: 'linkedin',
    notes: 'Round 2 Technical Architecture scheduled with VP of Engineering.',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'demo-app-4',
    role: 'Lead Backend Engineer',
    company: 'CRED',
    status: 'SAVED',
    fitScore: 88,
    source: 'linkedin',
    notes: 'Bookmarked for targeted network referral connection.',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const COLUMNS = [
  { id: 'SAVED', title: 'Saved', color: 'text-[#8B949E] bg-[#1A1B20] border-white/10' },
  { id: 'APPLIED', title: 'Applied', color: 'text-[#FF5C1A] bg-[#FF5C1A]/10 border-[#FF5C1A]/20' },
  { id: 'ASSESSMENT', title: 'Assessment', color: 'text-[#A78BFA] bg-[#A78BFA]/10 border-[#A78BFA]/20' },
  { id: 'INTERVIEW', title: 'Interview', color: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20' },
  { id: 'OFFER', title: 'Offer', color: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20' },
  { id: 'REJECTED', title: 'Rejected', color: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20' }
];

export const ApplicationTrackerView: React.FC = () => {
  const { traineeProfile } = useCoreStore();
  const [applications, setApplications] = useState<any[]>(() => isDemoMode() ? DEMO_APPLICATIONS : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (isDemoMode()) {
      setApplications(DEMO_APPLICATIONS);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/applications', {
        headers: { ...getAuthHeaders() }
      });
      if (!res.ok) throw new Error('Failed to load applications');
      const data = await res.json();
      setApplications(data || []);
    } catch (err) {
      if (isDemoMode()) {
        setApplications(DEMO_APPLICATIONS);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    if (isDemoMode()) {
      setTimeout(() => {
        setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
        setUpdating(null);
      }, 300);
      return;
    }

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
    <div className="flex-1 h-full overflow-y-auto px-4 py-6 sm:p-8 flex flex-col gap-6 max-w-[1500px] w-full mx-auto custom-scrollbar bg-[#0A0B0E] text-[#EDEDED]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#121317] border border-white/8 flex items-center justify-center shrink-0 text-[#FF5C1A] shadow-xs">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EDEDED] tracking-tight">
              Application Pipeline Tracker
            </h1>
            <p className="text-xs sm:text-sm text-[#8B949E] font-normal">
              Live progression Kanban across your active job applications
            </p>
          </div>
        </div>

        <button
          onClick={fetchApplications}
          disabled={loading}
          className="nx-btn-secondary !py-2 !px-4 !text-xs cursor-pointer border-white/10 bg-[#121317] text-[#EDEDED] hover:bg-[#1A1B20]"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[#FF5C1A]' : ''} />
          <span>Refresh Board</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-[#EF4444]/10 text-[#EF4444] text-xs rounded-2xl border border-[#EF4444]/20 flex items-center gap-2">
          <AlertCircle size={15} className="text-[#EF4444] shrink-0" />
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
                <span className="text-xs font-bold uppercase tracking-wider text-[#8B949E] font-mono">
                  {col.title}
                </span>
                <span className={`text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full border ${col.color}`}>
                  {colApps.length}
                </span>
              </div>

              {/* Column Dropzone / Container */}
              <div className="flex-1 bg-[#121317] border border-white/8 rounded-2xl p-3 flex flex-col gap-2.5 min-h-[420px]">
                {colApps.map(app => (
                  <div
                    key={app.id}
                    className="bg-[#1A1B20] p-4 rounded-xl border border-white/8 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_6px_16px_rgba(0,0,0,0.5)] transition-all duration-200 relative group"
                  >
                    {updating === app.id && (
                      <div className="absolute inset-0 bg-[#121317]/80 backdrop-blur-xs z-10 flex items-center justify-center rounded-xl">
                        <Loader2 className="animate-spin text-[#FF5C1A]" size={20} />
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-[#EDEDED] text-sm leading-snug">
                        {app.jobTitle || app.role || 'Senior Engineer'}
                      </h4>
                      {(app.fitScore || app.alignmentScore) && (
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#FF5C1A]/10 border border-[#FF5C1A]/20 text-[#FF5C1A] shrink-0">
                          {app.fitScore || app.alignmentScore}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8B949E] font-medium mb-2 truncate">
                      {app.companyName || app.company || 'Partner Org'}
                    </p>
                    {app.notes && (
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed mb-3 line-clamp-2 bg-[#0A0B0E] p-2.5 rounded-lg border border-white/6 font-mono text-[10.5px]">
                        {app.notes}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-white/8">
                      <span className="text-[10px] uppercase font-bold text-[#71717A] flex-1 font-mono tracking-wider">Stage:</span>
                      <select
                        className="text-xs bg-[#0A0B0E] border border-white/12 text-[#EDEDED] font-semibold rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:border-[#FF5C1A] transition-colors focus:border-[#FF5C1A]"
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                      >
                        {COLUMNS.map(c => (
                          <option key={c.id} value={c.id} className="bg-[#121317] text-[#EDEDED]">{c.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                
                {colApps.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl">
                    <Briefcase size={20} className="text-[#52525B] mb-2" />
                    <p className="text-xs text-[#71717A] font-medium">No items in {col.title}</p>
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
