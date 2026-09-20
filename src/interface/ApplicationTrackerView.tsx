import React, { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, Loader2, PlusCircle, CheckCircle2,
  Clock, XCircle, AlertCircle, RefreshCw, Send, ChevronRight
} from 'lucide-react';
import { useCoreStore } from '../integration/store/coreStore';
import { getAuthHeaders } from '../integration/store/authStore';
import { isDemoMode } from '../demo/demoData';
import { PageHeader } from './bauhaus/PageHeader';

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
  { id: 'SAVED', title: 'Saved', color: 'text-[#111111] bg-[#EFE7D8] border-[#111111]' },
  { id: 'APPLIED', title: 'Applied', color: 'text-white bg-[#2457A6] border-[#111111]' },
  { id: 'ASSESSMENT', title: 'Assessment', color: 'text-[#111111] bg-[#F4C430] border-[#111111]' },
  { id: 'INTERVIEW', title: 'Interview', color: 'text-white bg-[#E53935] border-[#111111]' },
  { id: 'OFFER', title: 'Offer', color: 'text-white bg-[#111111] border-[#111111]' },
  { id: 'REJECTED', title: 'Rejected', color: 'text-[#555555] bg-[#FFFFFF] border-[#888888]' }
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
    <div className="flex-1 h-full overflow-y-auto px-4 py-6 sm:p-8 flex flex-col gap-6 max-w-[1500px] w-full mx-auto custom-scrollbar bg-[#F5F0E6] text-[#111111]">
      {/* Bauhaus PageHeader */}
      <PageHeader
        sectionNumber="08"
        code="TRACKER"
        title="APPLICATION PIPELINE TRACKER"
        subtitle="LIVE PROGRESSION KANBAN ACROSS YOUR ACTIVE JOB APPLICATIONS"
        action={
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="px-4 py-2 text-xs font-mono font-bold uppercase bg-[#FFFFFF] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:bg-[#EFE7D8] transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-[#E53935]' : ''} />
            <span>Refresh Board</span>
          </button>
        }
      />

      {error && (
        <div className="p-3.5 bg-[#FDEDEC] text-[#E53935] text-xs font-mono font-bold border-2 border-[#E53935] shadow-[2px_2px_0px_#111111] flex items-center gap-2">
          <AlertCircle size={15} className="text-[#E53935] shrink-0" />
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
              <div className="flex items-center justify-between px-1 pb-1 border-b-2 border-[#111111]">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-[#111111]">
                  {col.title}
                </span>
                <span className={`text-[10px] font-mono font-black px-2 py-0.5 border-2 ${col.color} shadow-[1px_1px_0px_#111111]`}>
                  {colApps.length}
                </span>
              </div>

              {/* Column Dropzone / Container */}
              <div className="flex-1 bg-[#FFFFFF] border-2 border-[#111111] shadow-[4px_4px_0px_#111111] p-3 flex flex-col gap-2.5 min-h-[420px]">
                {colApps.map(app => (
                  <div
                    key={app.id}
                    className="bg-[#FDFBF7] p-4 border-2 border-[#111111] shadow-[2px_2px_0px_#111111] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#111111] transition-all duration-200 relative group"
                  >
                    {updating === app.id && (
                      <div className="absolute inset-0 bg-[#FFFFFF]/90 z-10 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#E53935]" size={20} />
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-mono font-black text-[#111111] text-xs leading-snug">
                        {app.jobTitle || app.role || 'Senior Engineer'}
                      </h4>
                      {(app.fitScore || app.alignmentScore) && (
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-[#F4C430] border border-[#111111] text-[#111111] shrink-0 shadow-[1px_1px_0px_#111111]">
                          {app.fitScore || app.alignmentScore}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[#555555] font-bold uppercase mb-2 truncate">
                      {app.companyName || app.company || 'Partner Org'}
                    </p>
                    {app.notes && (
                      <p className="text-[10.5px] text-[#555555] leading-relaxed mb-3 line-clamp-2 bg-[#F5F0E6] p-2 border border-[#111111] font-mono">
                        {app.notes}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-[#EFE7D8]">
                      <span className="text-[10px] uppercase font-mono font-bold text-[#777777] flex-1 tracking-wider">Stage:</span>
                      <select
                        className="text-xs bg-[#FFFFFF] border-2 border-[#111111] text-[#111111] font-mono font-bold px-2 py-1 outline-none cursor-pointer hover:border-[#E53935] transition-colors"
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                      >
                        {COLUMNS.map(c => (
                          <option key={c.id} value={c.id} className="bg-[#FFFFFF] text-[#111111] font-mono">{c.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                
                {colApps.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#CCCCCC] bg-[#F5F0E6]">
                    <Briefcase size={20} className="text-[#888888] mb-2" />
                    <p className="text-xs font-mono text-[#888888] font-bold uppercase">Empty: {col.title}</p>
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
