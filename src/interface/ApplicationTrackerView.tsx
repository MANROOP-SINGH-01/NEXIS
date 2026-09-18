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
  { id: 'SAVED', title: 'Saved', color: 'text-[#575047] bg-[#F4EDE3] border-[#E5DBCF]' },
  { id: 'APPLIED', title: 'Applied', color: 'text-[#C45709] bg-[#FFF0E4] border-[#FDCBA7]' },
  { id: 'ASSESSMENT', title: 'Assessment', color: 'text-[#6B2FB5] bg-[#F8F2FC] border-[#E2D4F0]' },
  { id: 'INTERVIEW', title: 'Interview', color: 'text-[#A6690E] bg-[#FEF6E9] border-[#F8DFAC]' },
  { id: 'OFFER', title: 'Offer', color: 'text-[#246B44] bg-[#E8F6EE] border-[#BCE4CE]' },
  { id: 'REJECTED', title: 'Rejected', color: 'text-[#B83128] bg-[#FDEEED] border-[#F7BEBA]' }
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
    <div className="flex-1 h-full overflow-y-auto px-4 py-6 sm:p-8 flex flex-col gap-6 max-w-[1500px] w-full mx-auto custom-scrollbar bg-[#F8F3EC]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FFF0E4] border border-[#FDCBA7] flex items-center justify-center shrink-0 text-[#F47B20] shadow-xs">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181512] tracking-tight">
              Application Pipeline Tracker
            </h1>
            <p className="text-xs sm:text-sm text-[#6A6359] font-normal">
              Live progression Kanban across your active job applications
            </p>
          </div>
        </div>

        <button
          onClick={fetchApplications}
          disabled={loading}
          className="nx-btn-secondary !py-2 !px-4 !text-xs cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[#F47B20]' : ''} />
          <span>Refresh Board</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-[#FDEEED] text-[#B83128] text-xs rounded-2xl border border-[#F7BEBA] flex items-center gap-2">
          <AlertCircle size={15} className="text-[#D9453B] shrink-0" />
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
                <span className="text-xs font-bold uppercase tracking-wider text-[#181512]">
                  {col.title}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${col.color}`}>
                  {colApps.length}
                </span>
              </div>

              {/* Column Dropzone / Container */}
              <div className="flex-1 bg-[#FAF6F0] border border-[#EADFCF] rounded-2xl p-3 flex flex-col gap-2.5 min-h-[420px]">
                {colApps.map(app => (
                  <div
                    key={app.id}
                    className="bg-white p-4 rounded-xl border border-[#EADFCF] shadow-[0_2px_8px_rgba(180,150,120,0.06)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(180,150,120,0.12)] transition-all duration-200 relative group"
                  >
                    {updating === app.id && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-10 flex items-center justify-center rounded-xl">
                        <Loader2 className="animate-spin text-[#F47B20]" size={20} />
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-[#181512] text-sm leading-snug">
                        {app.jobTitle || app.role || 'Senior Engineer'}
                      </h4>
                      {(app.fitScore || app.alignmentScore) && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF0E4] border border-[#FDCBA7] text-[#C45709] shrink-0">
                          {app.fitScore || app.alignmentScore}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6A6359] font-medium mb-2 truncate">
                      {app.companyName || app.company || 'Partner Org'}
                    </p>
                    {app.notes && (
                      <p className="text-[11px] text-[#8C8275] leading-relaxed mb-3 line-clamp-2 bg-[#FAF6F0] p-2 rounded-lg border border-[#EADFCF]">
                        {app.notes}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-[#F5EFE6]">
                      <span className="text-[10px] uppercase font-bold text-[#999084] flex-1">Stage:</span>
                      <select
                        className="text-xs bg-[#FAF6F0] border border-[#D7CABB] text-[#181512] font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-[#F47B20]"
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
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#D7CABB] rounded-xl">
                    <Briefcase size={20} className="text-[#999084] mb-2" />
                    <p className="text-xs text-[#999084] font-medium">No items in {col.title}</p>
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
