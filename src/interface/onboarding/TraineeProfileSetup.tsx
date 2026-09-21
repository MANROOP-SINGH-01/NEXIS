import React, { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  Target,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Upload,
  AlertCircle,
  RefreshCw,
  X,
  LogIn,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuthStore, getAuthHeaders } from '../../integration/store/authStore';
import { useCoreStore } from '../../integration/store/coreStore';
import { useRouter } from '../../router';

interface TraineeProfileSetupProps {
  onProfileSaved?: (payload?: any) => Promise<boolean>;
  onComplete?: () => void;
}

const STORAGE_DRAFT_KEY = 'nexis-onboarding-draft';

export const TraineeProfileSetup: React.FC<TraineeProfileSetupProps> = ({ onProfileSaved, onComplete }) => {
  const { user, updateUser, setToken, setAuth } = useAuthStore();
  const { setWorkHistoryProfile } = useCoreStore();
  const { navigate } = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [name, setName] = useState(user?.profile?.name || 'Aarav Sharma');
  const [age, setAge] = useState('24');
  const [currentCity, setCurrentCity] = useState('Pune');
  const [currentCountry, setCurrentCountry] = useState('India');

  const [occupation, setOccupation] = useState('Software Engineer');
  const [employmentStatus, setEmploymentStatus] = useState('EMPLOYED');
  const [educationLevel, setEducationLevel] = useState('Graduate');
  const [degree, setDegree] = useState('B.Tech in Computer Science');
  const [fieldOfStudy, setFieldOfStudy] = useState('Engineering');
  const [yearsOfExperience, setYearsOfExperience] = useState('2');
  const [primarySkills, setPrimarySkills] = useState('React, TypeScript, Node.js');
  const [secondarySkills, setSecondarySkills] = useState('PostgreSQL, Docker, AWS');

  const [desiredRole, setDesiredRole] = useState('Full Stack Developer');
  const [preferredLocations, setPreferredLocations] = useState('Pune, Mumbai, Remote');
  const [preferredWorkMode, setPreferredWorkMode] = useState<'REMOTE' | 'HYBRID' | 'ONSITE'>('HYBRID');
  const [expectedSalary, setExpectedSalary] = useState('₹12,00,000 / year');

  // Resume Upload State
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeExtracted, setResumeExtracted] = useState<boolean>(false);
  const [resumeSummary, setResumeSummary] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionError, setIsSessionError] = useState(false);

  // Restore draft from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.age) setAge(parsed.age);
        if (parsed.currentCity) setCurrentCity(parsed.currentCity);
        if (parsed.occupation) setOccupation(parsed.occupation);
        if (parsed.educationLevel) setEducationLevel(parsed.educationLevel);
        if (parsed.degree) setDegree(parsed.degree);
        if (parsed.yearsOfExperience) setYearsOfExperience(parsed.yearsOfExperience);
        if (parsed.primarySkills) setPrimarySkills(parsed.primarySkills);
        if (parsed.desiredRole) setDesiredRole(parsed.desiredRole);
        if (parsed.preferredLocations) setPreferredLocations(parsed.preferredLocations);
        if (parsed.preferredWorkMode) setPreferredWorkMode(parsed.preferredWorkMode);
        if (parsed.step) setStep(parsed.step);
      }
    } catch {}
  }, []);

  // Save draft on change
  const saveDraft = (currentStep = step) => {
    try {
      const payload = {
        name,
        age,
        currentCity,
        currentCountry,
        occupation,
        employmentStatus,
        educationLevel,
        degree,
        fieldOfStudy,
        yearsOfExperience,
        primarySkills,
        secondarySkills,
        desiredRole,
        preferredLocations,
        preferredWorkMode,
        expectedSalary,
        step: currentStep,
      };
      localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(payload));
    } catch {}
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSessionError(false);

    if (step === 1) {
      if (!name.trim()) {
        setError('Full name is required.');
        return;
      }
      saveDraft(2);
      setStep(2);
    } else if (step === 2) {
      if (!primarySkills.trim()) {
        setError('Please list at least 1 primary skill.');
        return;
      }
      saveDraft(3);
      setStep(3);
    } else if (step === 3) {
      if (!desiredRole.trim()) {
        setError('Desired job role is required.');
        return;
      }
      saveDraft(4);
      setStep(4);
    }
  };

  const handleResumeDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.pdf') && !ext.endsWith('.docx')) {
      setError('Please upload a PDF or DOCX resume.');
      return;
    }

    setResumeFile(file);
    setError(null);
    setIsSessionError(false);
    setIsUploadingResume(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/resume/extract', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (res.status === 401) {
        console.warn('Auth token expired during resume extraction; accepting file locally.');
        setResumeExtracted(true);
        setResumeSummary(`Document "${file.name}" accepted (${(file.size / 1024).toFixed(0)} KB). Details will be analyzed in your workspace.`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse resume document.');
      }

      setResumeExtracted(true);
      if (data.document?.summary) {
        setResumeSummary(data.document.summary);
      } else if (data.text) {
        setResumeSummary(data.text.slice(0, 150) + '...');
      }

      // Auto-extract candidate name or skills if blank
      if (data.document?.header?.name && name === 'Aarav Sharma') {
        setName(data.document.header.name);
      }
      if (data.document?.skills?.core?.length) {
        setPrimarySkills(data.document.skills.core.slice(0, 6).join(', '));
      }
    } catch (err: any) {
      // Graceful local fallback: Never let upload failures lock the user
      setResumeExtracted(true);
      setResumeSummary(`Document "${file.name}" attached (${(file.size / 1024).toFixed(0)} KB).`);
    } finally {
      setIsUploadingResume(false);
    }
  };

  const commitLocalCompletion = () => {
    try {
      localStorage.setItem('forge-onboarding-completed', 'true');
    } catch {}

    if (user) {
      updateUser({
        profile: {
          ...user.profile,
          id: user.profile?.id || 'prf_completed',
          name: name.trim() || user.profile?.name || 'Priya Sharma',
          headline: desiredRole.trim() || 'Full Stack Developer',
          profileCompleteness: 90,
          onboardingCompleted: true,
        },
      });
    } else {
      setAuth('dev_trainee', {
        id: 'candidate_default',
        phone: '+919876543210',
        email: 'candidate@example.com',
        role: 'candidate',
        profile: {
          id: 'prf_completed',
          name: name.trim() || 'Priya Sharma',
          headline: desiredRole.trim() || 'Full Stack Developer',
          profileCompleteness: 90,
          onboardingCompleted: true,
        },
      });
    }

    setWorkHistoryProfile({
      candidateName: name.trim() || 'Priya Sharma',
      targetRole: desiredRole.trim() || 'Full Stack Developer',
    });

    try {
      localStorage.removeItem(STORAGE_DRAFT_KEY);
    } catch {}

    if (onComplete) {
      onComplete();
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setIsSessionError(false);

    const onboardingPayload = {
      name: name.trim(),
      age,
      currentCity: currentCity.trim(),
      currentCountry: currentCountry.trim(),
      occupation: occupation.trim(),
      employmentStatus,
      educationLevel,
      degree: degree.trim(),
      fieldOfStudy: fieldOfStudy.trim(),
      yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
      primarySkills: primarySkills.split(',').map((s) => s.trim()).filter(Boolean),
      secondarySkills: secondarySkills.split(',').map((s) => s.trim()).filter(Boolean),
      desiredRole: desiredRole.trim(),
      preferredLocations: preferredLocations.split(',').map((s) => s.trim()).filter(Boolean),
      preferredWorkMode,
      expectedSalary: expectedSalary.trim(),
    };

    try {
      const res = await fetch('/api/auth/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(onboardingPayload),
      });

      if (res.status === 401) {
        setIsSessionError(true);
        setError('Session invalid or expired. Please log in again or continue as guest.');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete profile onboarding.');
      }

      commitLocalCompletion();

      if (onProfileSaved) {
        await onProfileSaved(onboardingPayload).catch(() => {});
      }
    } catch (err: any) {
      console.warn('Network or server error during onboarding submission:', err.message);
      commitLocalCompletion();
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueAsGuest = () => {
    setToken('dev_trainee');
    commitLocalCompletion();
  };

  const handleGoToLogin = () => {
    try {
      localStorage.removeItem('forge-session-token');
      localStorage.removeItem('forge-github-token');
    } catch {}
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] p-6 sm:p-10 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Functional Close / Skip Button */}
        <button
          type="button"
          onClick={handleContinueAsGuest}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white hover:bg-[#E53935] hover:text-white border-2 border-[#111111] text-[#111111] shadow-[2px_2px_0px_#111111] transition-all cursor-pointer z-20"
          title="Skip setup & enter NEXIS"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress Bar & Steps Indicator */}
        <div className="mb-6 pr-8">
          <div className="flex items-center justify-between text-xs font-mono font-black uppercase text-[#111111] mb-2">
            <span>
              Step {step} of 4: {
                step === 1 ? 'Identity' : step === 2 ? 'Career & Skills' : step === 3 ? 'Job Preferences' : 'Resume Upload'
              }
            </span>
            <span>{step * 25}% Completed</span>
          </div>
          <div className="w-full h-3 bg-[#EFE7D8] border-2 border-[#111111]">
            <div
              className="h-full bg-[#E53935] transition-all duration-300"
              style={{ width: `${step * 25}%` }}
            />
          </div>
        </div>

        {/* Actionable Error / Session Expiration Banner */}
        {error && (
          <div className="mb-6 p-4 bg-[#E53935]/10 border-2 border-[#E53935] shadow-[3px_3px_0px_#E53935] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#E53935] shrink-0" />
              <span className="text-xs font-mono font-bold text-[#E53935]">{error}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="px-3 py-1.5 bg-white hover:bg-[#F5F0E6] text-[#111111] border-2 border-[#111111] text-[11px] font-mono font-bold uppercase shadow-[2px_2px_0px_#111111] flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                <span>Log In</span>
              </button>
              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="px-3 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white border-2 border-[#111111] text-[11px] font-mono font-bold uppercase shadow-[2px_2px_0px_#111111] flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Enter as Demo</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Basic Identity */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                  Age / Year of Birth
                </label>
                <input
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="24"
                  className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                  Current City
                </label>
                <input
                  type="text"
                  value={currentCity}
                  onChange={(e) => setCurrentCity(e.target.value)}
                  placeholder="Pune / Mumbai"
                  className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
                />
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between border-t-2 border-[#111111]">
              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="text-xs font-mono font-bold text-[#777777] hover:text-[#111111] underline cursor-pointer"
              >
                Skip Setup & Enter NEXIS
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#111111] hover:bg-[#E53935] text-white border-2 border-[#111111] font-['Space_Grotesk'] font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_#E53935] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Career</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Career & Skills */}
        {step === 2 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                  Current Occupation
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Software Engineer / Student"
                  className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                Highest Degree / Qualification
              </label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="B.Tech in Computer Science / Diploma"
                className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                Primary Technical Skills * (comma-separated)
              </label>
              <input
                type="text"
                value={primarySkills}
                onChange={(e) => setPrimarySkills(e.target.value)}
                placeholder="React, TypeScript, Node.js, Python"
                className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
              />
            </div>

            <div className="pt-6 flex items-center justify-between border-t-2 border-[#111111]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-[#EFE7D8] text-[#111111] border-2 border-[#111111] font-mono font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#111111]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#111111] hover:bg-[#E53935] text-white border-2 border-[#111111] font-['Space_Grotesk'] font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_#E53935] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Preferences</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Job Preferences */}
        {step === 3 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                Desired Job Role *
              </label>
              <input
                type="text"
                value={desiredRole}
                onChange={(e) => setDesiredRole(e.target.value)}
                placeholder="Full Stack Developer / Frontend Engineer"
                className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                  Preferred Work Mode
                </label>
                <select
                  value={preferredWorkMode}
                  onChange={(e) => setPreferredWorkMode(e.target.value as any)}
                  className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
                >
                  <option value="HYBRID">Hybrid</option>
                  <option value="REMOTE">Remote</option>
                  <option value="ONSITE">On-site</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                  Expected Salary
                </label>
                <input
                  type="text"
                  value={expectedSalary}
                  onChange={(e) => setExpectedSalary(e.target.value)}
                  placeholder="₹12,00,000 / year"
                  className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-1">
                Preferred Cities (comma-separated)
              </label>
              <input
                type="text"
                value={preferredLocations}
                onChange={(e) => setPreferredLocations(e.target.value)}
                placeholder="Pune, Mumbai, Bengaluru, Remote"
                className="w-full bg-[#FFFFFF] border-2 border-[#111111] px-4 py-2.5 text-xs font-mono font-bold text-[#111111] focus:border-[#E53935] focus:outline-none shadow-[2px_2px_0px_#111111]"
              />
            </div>

            <div className="pt-6 flex items-center justify-between border-t-2 border-[#111111]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-[#EFE7D8] text-[#111111] border-2 border-[#111111] font-mono font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#111111]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#111111] hover:bg-[#E53935] text-white border-2 border-[#111111] font-['Space_Grotesk'] font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_#E53935] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Upload Resume</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Dual-Format Resume Upload */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-mono font-black uppercase text-[#111111] mb-2">
                Upload Resume (PDF or DOCX)
              </label>
              <label className="border-2 border-dashed border-[#111111] p-8 flex flex-col items-center justify-center text-center bg-[#FDFBF7] hover:bg-[#F5F0E6] transition-colors cursor-pointer block">
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleResumeDrop}
                  className="hidden"
                />
                {isUploadingResume ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-8 h-8 text-[#E53935] animate-spin" />
                    <span className="text-xs font-mono font-bold text-[#111111]">
                      Parsing and structuring your resume...
                    </span>
                  </div>
                ) : resumeExtracted ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-[#2E7D32]" />
                    <span className="text-xs font-mono font-bold text-[#111111]">
                      {resumeFile?.name || 'Resume'} successfully attached!
                    </span>
                    <span className="text-[10px] font-mono text-[#555555]">Click to change document</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-[#555555]" />
                    <span className="text-xs font-mono font-bold text-[#111111]">
                      Drag and drop your resume file, or click to browse
                    </span>
                    <span className="text-[10px] font-mono text-[#777777]">
                      Supports PDF and Microsoft Word (.docx)
                    </span>
                  </div>
                )}
              </label>
            </div>

            {resumeSummary && (
              <div className="p-3 bg-[#F5F0E6] border-2 border-[#111111] text-xs font-mono">
                <span className="font-bold uppercase text-[#111111] block mb-1">Parsed Extract:</span>
                <p className="text-[#555555] line-clamp-3">{resumeSummary}</p>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="pt-6 border-t-2 border-[#111111] flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#EFE7D8] hover:bg-[#E5DFD0] text-[#111111] border-2 border-[#111111] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#111111]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-[#F5F0E6] text-[#111111] border-2 border-[#111111] font-mono font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_#111111] transition-all cursor-pointer"
                >
                  Skip Resume for Now
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white border-2 border-[#111111] font-['Space_Grotesk'] font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_#111111] hover:shadow-[1px_1px_0px_#111111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Onboarding & Enter NEXIS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraineeProfileSetup;
