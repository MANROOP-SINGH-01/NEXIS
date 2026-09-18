import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../primitives/Button';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';

interface OTPVerificationProps {
  phoneNumber: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangePhone: () => void;
  isLoading?: boolean;
  error?: string;
  devCode?: string;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  phoneNumber,
  onVerify,
  onResend,
  onChangePhone,
  isLoading = false,
  error,
  devCode,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(45);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, val: string) => {
    const char = val.slice(-1).replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits are entered
    if (char && index === 5 && newDigits.every((d) => d !== '')) {
      onVerify(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      onVerify(pasted);
    }
  };

  const handleResendClick = async () => {
    if (countdown === 0) {
      setCountdown(45);
      await onResend();
    }
  };

  const isComplete = digits.every((d) => d !== '');

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onChangePhone}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change phone number</span>
        </button>
        <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
          Verify Phone Number
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Enter the 6-digit authentication code sent to{' '}
          <span className="font-mono text-zinc-200 font-semibold">{phoneNumber}</span>
        </p>
      </div>

      {devCode && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs font-mono text-indigo-300">
          Dev Mode Code: <span className="font-bold underline">{devCode}</span>
        </div>
      )}

      {/* 6 Digit Inputs */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={idx === 0 ? handlePaste : undefined}
            disabled={isLoading}
            className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono bg-[#12131c] border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        ))}
      </div>

      {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

      {/* Resend & Timer */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Didn't receive code?</span>
        {countdown > 0 ? (
          <span className="font-mono text-zinc-500">Resend in {countdown}s</span>
        ) : (
          <button
            onClick={handleResendClick}
            className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Resend Code</span>
          </button>
        )}
      </div>

      <Button
        variant="glow"
        size="md"
        className="w-full py-3"
        disabled={!isComplete || isLoading}
        isLoading={isLoading}
        onClick={() => onVerify(digits.join(''))}
      >
        Verify & Continue
      </Button>
    </div>
  );
};
