import React, { useState } from 'react';
import { PhoneInput } from './PhoneInput';
import { OTPVerification } from './OTPVerification';
import { Input } from '../primitives/Input';
import { Button } from '../primitives/Button';
import { Card } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { useAuthStore } from '../../integration/store/authStore';
import { Bot, Shield, ArrowRight, Lock, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
  onBackToHome?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onBackToHome }) => {
  const { setAuth } = useAuthStore();
  const [authMethod, setAuthMethod] = useState<'otp' | 'password' | 'register'>('otp');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  // Phone OTP state
  const [phone, setPhone] = useState('+91');
  const [devOtp, setDevOtp] = useState<string | undefined>();
  
  // Password login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('+91');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setDevOtp(data.devOtpCode);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Error communicating with authentication service');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (code: string) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      // Successful OTP verification creates or signs in session
      // Provide a candidate session user
      const userObj = {
        id: `usr_${Date.now()}`,
        phone: phone,
        email: null,
        role: 'CANDIDATE',
        profile: {
          id: `prf_${Date.now()}`,
          name: `Candidate (${phone.slice(-4)})`,
          profileCompleteness: 40,
        },
      };

      setAuth(data.verificationToken || 'session_token_verified', userObj);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      setAuth(data.token, data.user);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: regPhone,
          name: regName,
          email: regEmail || undefined,
          password: regPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setAuth(data.token, data.user);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col lg:flex-row relative overflow-hidden">
      {/* Background Decorative Lighting */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      </div>

      {/* Left Brand Panel */}
      <div className="relative z-10 lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-zinc-950/40">
        <div>
          {/* Logo */}
          <div
            onClick={onBackToHome}
            className="inline-flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#090a0f] rounded-[11px] flex items-center justify-center font-['Space_Grotesk'] font-bold text-sm text-indigo-400">
                NX
              </div>
            </div>
            <span className="font-['Space_Grotesk'] font-bold text-lg text-white">
              NEXIS
            </span>
          </div>

          <div className="mt-16 max-w-lg">
            <Badge variant="indigo" size="sm" pulseDot className="mb-4 font-mono">
              SECURE TELEMETRY AUTHENTICATION
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-['Space_Grotesk'] text-white leading-tight">
              Access your digital career command center.
            </h1>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              Connect to your persistent multi-agent workspace with real-time job radar, ATS optimization, and cryptographically verified credentials.
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="hidden lg:grid grid-cols-2 gap-4 mt-12 pt-8 border-t border-zinc-800/60 max-w-lg">
          <div className="flex items-start gap-2.5">
            <Bot className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-zinc-200">Living 3D Agents</p>
              <p className="text-[11px] text-zinc-500">Autonomous workers collaborating live</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-zinc-200">DPDP Compliant</p>
              <p className="text-[11px] text-zinc-500">Zero data leaks or unauthorized scraping</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="relative z-10 lg:w-1/2 p-6 sm:p-12 lg:p-16 flex items-center justify-center">
        <Card variant="glass" className="w-full max-w-md border-zinc-800 p-6 sm:p-8 shadow-2xl">
          {/* Method Selector Tabs */}
          <div className="flex rounded-xl bg-zinc-900/90 p-1 border border-zinc-800/80 mb-6">
            <button
              onClick={() => { setAuthMethod('otp'); setStep('phone'); setError(null); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                authMethod === 'otp'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Phone OTP
            </button>
            <button
              onClick={() => { setAuthMethod('password'); setError(null); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                authMethod === 'password'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => { setAuthMethod('register'); setError(null); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                authMethod === 'register'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* OTP Method */}
          {authMethod === 'otp' && (
            step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="mb-2">
                  <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                    Sign in with Phone
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    We'll send a 6-digit verification code to authenticate your session.
                  </p>
                </div>

                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  disabled={loading}
                />

                <Button
                  type="submit"
                  variant="glow"
                  size="md"
                  className="w-full py-3"
                  isLoading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Send Verification Code
                </Button>
              </form>
            ) : (
              <OTPVerification
                phoneNumber={phone}
                onVerify={handleVerifyOtp}
                onResend={handleSendOtp}
                onChangePhone={() => setStep('phone')}
                isLoading={loading}
                error={error || undefined}
                devCode={devOtp}
              />
            )
          )}

          {/* Password Method */}
          {authMethod === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="mb-2">
                <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                  Welcome Back
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Enter your credentials to access your candidate profile.
                </p>
              </div>

              <Input
                label="Phone or Email"
                placeholder="+919876543210 or user@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="glow"
                size="md"
                className="w-full py-3 mt-2"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>
          )}

          {/* Register Method */}
          {authMethod === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="mb-1">
                <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                  Create Candidate Account
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Join the NEXIS talent orchestration network.
                </p>
              </div>

              <Input
                label="Full Name"
                placeholder="Aditi Sharma"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />

              <PhoneInput
                value={regPhone}
                onChange={setRegPhone}
                disabled={loading}
              />

              <Input
                label="Email (Optional)"
                type="email"
                placeholder="aditi@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />

              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="glow"
                size="md"
                className="w-full py-3 mt-2"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Complete Registration
              </Button>
            </form>
          )}

          {/* Terms Footer */}
          <p className="mt-6 text-center text-[10px] text-zinc-500">
            By continuing, you agree to NEXIS Terms of Service and DPDP Data Sovereignty Principles.
          </p>
        </Card>
      </div>
    </div>
  );
};
