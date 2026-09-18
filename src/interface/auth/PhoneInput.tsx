import React, { useState } from 'react';
import { ChevronDown, Phone } from 'lucide-react';

interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  error?: string;
  disabled?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [localNumber, setLocalNumber] = useState(() => {
    if (value.startsWith('+')) {
      const match = COUNTRY_CODES.find((c) => value.startsWith(c.code));
      if (match) return value.slice(match.code.length);
    }
    return value.replace(/^\+91/, '');
  });

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = COUNTRY_CODES.find((c) => c.code === e.target.value) || COUNTRY_CODES[0];
    setSelectedCountry(found);
    onChange(`${found.code}${localNumber}`);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setLocalNumber(raw);
    onChange(`${selectedCountry.code}${raw}`);
  };

  return (
    <div className="w-full space-y-1.5">
      <label className="block text-xs font-medium text-zinc-300">
        Phone Number
      </label>
      <div className="flex rounded-xl overflow-hidden border border-zinc-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 bg-[#12131c] transition-all">
        {/* Country Code Select */}
        <div className="relative flex items-center bg-zinc-900/80 px-3 border-r border-zinc-800">
          <span className="text-base mr-1.5">{selectedCountry.flag}</span>
          <span className="text-xs font-mono text-zinc-300 mr-1">{selectedCountry.code}</span>
          <select
            value={selectedCountry.code}
            onChange={handleCountryChange}
            disabled={disabled}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label="Select Country Code"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.country} ({c.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-zinc-500 pointer-events-none" />
        </div>

        {/* Input Field */}
        <div className="relative flex-1 flex items-center">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="98765 43210"
            value={localNumber}
            onChange={handleNumberChange}
            disabled={disabled}
            className="w-full bg-transparent px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-mono"
          />
        </div>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
};
