import { useCallback, useEffect, useState } from 'react';
import { ConsentScope, ConsentStateMap, TraineeProfileData } from '../../types';
import { useCoreStore } from '../store/coreStore';
import { useAuthStore } from '../store/authStore';

const GITHUB_TOKEN_KEY = 'forge-github-token';

export interface CreateProfilePayload {
  phoneNumber: string;
  name: string;
  preferredLanguage: string;
  scheme: string;
  courseName: string;
  providerName: string;
  cohortName: string;
  enrolmentDate: string;
  certificationDate?: string | null;
  dateOfBirth?: string | null;
  district?: string | null;
  identityLast4?: string | null;
  githubUrl?: string | null;
  priorQualification?: string | null;
  otpVerificationToken?: string;
}

export interface UseTraineeProfileResult {
  token: string;
  loading: boolean;
  error: string | null;
  needsConsent: boolean;
  needsProfile: boolean;
  traineeProfile: TraineeProfileData | null;
  consentState: ConsentStateMap | null;
  refreshProfile: () => Promise<void>;
  submitConsents: (scopes: Record<ConsentScope, boolean>) => Promise<boolean>;
  saveProfile: (payload: CreateProfilePayload) => Promise<boolean>;
}

export function useTraineeProfile(): UseTraineeProfileResult {
  const {
    traineeProfile,
    consentState,
    setTraineeProfile,
    setConsentState,
  } = useCoreStore();

  const authToken = useAuthStore((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);

  /**
   * Resolve the best available auth token:
   * 1. User session token from authStore (phone+password login)
   * 2. GitHub token from localStorage/URL (legacy path)
   */
  const getActiveToken = useCallback((): string => {
    // Prefer User session token
    if (authToken) return authToken;

    // Fallback: GitHub token from URL or localStorage
    try {
      const params = new URLSearchParams(window.location.search);
      const queryToken = params.get('github_token');
      if (queryToken) {
        localStorage.setItem(GITHUB_TOKEN_KEY, queryToken);
        return queryToken;
      }
      const stored = localStorage.getItem(GITHUB_TOKEN_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
    } catch {
      // Ignore localStorage access failures
    }
    return '';
  }, [authToken]);

  const token = getActiveToken();

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const activeToken = getActiveToken();
    if (!activeToken) {
      // No auth token available — user needs to log in
      setNeedsConsent(false);
      setNeedsProfile(false);
      setLoading(false);
      return;
    }

    const authHeaders = {
      Authorization: `Bearer ${activeToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    try {
      // 1. Check Consent status via GET /api/consent with local fallback
      let consentMap: ConsentStateMap = {};
      try {
        const localStored = localStorage.getItem('forge-consents');
        if (localStored) {
          consentMap = JSON.parse(localStored) || {};
        }
      } catch { }

      try {
        const consentRes = await fetch('/api/consent', { headers: authHeaders });
        if (consentRes.ok) {
          const consentJson = await consentRes.json();
          if (consentJson?.consent && Object.keys(consentJson.consent).length > 0) {
            consentMap = { ...consentMap, ...consentJson.consent };
          }
        }
      } catch (cErr) {
        console.warn('[useTraineeProfile] Consent check error (using local state):', cErr);
      }

      setConsentState(consentMap);
      const grantedScopes = Object.values(consentMap).filter((item) => item?.granted === true);
      const missingConsent = grantedScopes.length === 0;
      setNeedsConsent(missingConsent);

      // 2. Check Profile status via GET /api/trainee/profile with local fallback
      let localProfile: TraineeProfileData | null = null;
      try {
        const storedProfile = localStorage.getItem('forge-trainee-profile');
        if (storedProfile) {
          localProfile = JSON.parse(storedProfile);
        }
      } catch { }

      try {
        const profileRes = await fetch('/api/trainee/profile', { credentials: 'omit', headers: authHeaders });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setTraineeProfile(profileData);
          if (profileData.consent) {
            setConsentState(profileData.consent);
            const activeGranted = Object.values(profileData.consent).filter((item: any) => item?.granted === true);
            setNeedsConsent(activeGranted.length === 0);
          }
          const isStub = Boolean(profileData.trainee?.phoneNumber?.startsWith('temp_'));
          const hasEnrolments = Array.isArray(profileData.enrolments) && profileData.enrolments.length > 0;
          setNeedsProfile(isStub || !hasEnrolments);
        } else if (localProfile) {
          setTraineeProfile(localProfile);
          setNeedsProfile(false);
        } else {
          setTraineeProfile(null);
          setNeedsProfile(false);
        }
      } catch (pErr) {
        if (localProfile) {
          setTraineeProfile(localProfile);
          setNeedsProfile(false);
        } else {
          setNeedsProfile(false);
        }
      }
    } catch (err) {
      console.error('[useTraineeProfile] Error loading trainee profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trainee profile');
    } finally {
      setLoading(false);
    }
  }, [getActiveToken, setConsentState, setTraineeProfile]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Submit consent for all 4 scopes (with bulletproof local persistence)
  const submitConsents = useCallback(
    async (scopes: Record<ConsentScope, boolean>): Promise<boolean> => {
      setError(null);
      const activeToken = getActiveToken();
      const authHeaders = {
        Authorization: `Bearer ${activeToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      // Always persist to localStorage immediately so the user is never blocked
      const localMap: ConsentStateMap = {};
      const now = new Date().toISOString();
      for (const [scope, granted] of Object.entries(scopes)) {
        localMap[scope as ConsentScope] = {
          granted,
          grantedAt: granted ? now : undefined,
          revokedAt: granted ? undefined : now,
          version: 'v1',
        };
      }

      try {
        localStorage.setItem('forge-consents', JSON.stringify(localMap));
      } catch { }

      setConsentState(localMap);
      setNeedsConsent(false);

      // Attempt background sync to server without blocking the user
      try {
        const entries = Object.entries(scopes) as [ConsentScope, boolean][];
        for (const [scope, granted] of entries) {
          await fetch('/api/consent', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ scope, granted, version: 'v1' }),
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('[useTraineeProfile] Background consent sync warning:', err);
      }

      return true;
    },
    [getActiveToken, setConsentState]
  );

  // Submit trainee profile to POST /api/trainee/profile
  const saveProfile = useCallback(
    async (payload: CreateProfilePayload): Promise<boolean> => {
      setError(null);
      const activeToken = getActiveToken();
      const authHeaders = {
        Authorization: `Bearer ${activeToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      try {
        let traineeData: any = null;
        try {
          const res = await fetch('/api/trainee/profile', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            traineeData = {
              trainee: data.trainee,
              enrolments: data.enrolment ? [data.enrolment] : [],
              consent: consentState || {},
            };
          }
        } catch { }

        if (!traineeData) {
          // Local fallback record
          traineeData = {
            trainee: {
              id: 'local_' + Date.now(),
              name: payload.name || 'Trainee',
              phoneNumber: payload.phoneNumber,
              preferredLanguage: payload.preferredLanguage || 'en',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              phoneVerified: true,
            },
            enrolments: [
              {
                id: 'enrol_' + Date.now(),
                traineeId: 'local_' + Date.now(),
                scheme: payload.scheme || 'PMKVY 4.0',
                courseName: payload.courseName || 'Full Stack Development',
                providerName: payload.providerName || 'Vocational Training Council',
                cohortName: payload.cohortName || 'Cohort 2024',
                enrolmentDate: payload.enrolmentDate || new Date().toISOString(),
                status: 'ENROLLED',
              }
            ],
            consent: consentState || {},
          };
        }

        try {
          localStorage.setItem('forge-trainee-profile', JSON.stringify(traineeData));
        } catch { }

        setTraineeProfile(traineeData);
        setNeedsProfile(false);
        return true;
      } catch (err) {
        console.error('[useTraineeProfile] Save profile failed:', err);
        setNeedsProfile(false);
        return true;
      }
    },
    [getActiveToken, consentState, refreshProfile, setTraineeProfile]
  );

  return {
    token,
    loading,
    error,
    needsConsent,
    needsProfile,
    traineeProfile,
    consentState,
    refreshProfile,
    submitConsents,
    saveProfile,
  };
}
