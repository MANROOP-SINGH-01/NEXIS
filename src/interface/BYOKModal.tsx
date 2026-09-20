import { Eye, EyeOff, Trash2, X, Key, Shield, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';
import { useUiStore } from '../integration/store/uiStore';
import { DEFAULT_MODELS } from '../core/llm/constants';

interface BYOKModalProps {
  onClose: () => void;
}

const STORAGE_KEY = 'byok-config';

const BYOKModal: React.FC<BYOKModalProps> = ({ onClose }) => {
  const { llmConfig, setLlmConfig, byokError } = useUiStore();

  const [apiKey, setApiKey] = useState<string>(llmConfig.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);

  const handleSave = () => {
    const config = {
      apiKey: apiKey.trim(),
      model: llmConfig.model || DEFAULT_MODELS.text,
    };
    setLlmConfig(config);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save BYOK config', e);
    }
    onClose();
  };

  const handleClear = () => {
    const emptyConfig = {
      apiKey: '',
      model: llmConfig.model || DEFAULT_MODELS.text,
    };
    setApiKey('');
    setLlmConfig(emptyConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyConfig));
    } catch (e) {
      console.error('Failed to clear BYOK config', e);
    }
  };

  const isSaved = !!llmConfig.apiKey;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-[#111111]/60 backdrop-blur-xs transition-opacity duration-200"
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white border-4 border-[#111111] shadow-[8px_8px_0px_#111111] p-6 md:p-8 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white border-2 border-[#111111] flex items-center justify-center text-[#111111] hover:bg-[#E53935] hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#111111]"
        >
          <X size={16} />
        </button>

        <div className="max-w-md mx-auto flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 bg-[#F4C430] border-2 border-[#111111] flex items-center justify-center shadow-[3px_3px_0px_#111111] mb-1">
              <Key size={22} className="text-[#111111]" />
            </div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              [BYOK] // CLIENT RUNTIME
            </div>
            <h2 className="text-xl font-['Space_Grotesk'] font-black uppercase text-[#111111] tracking-tight">
              Gemini API Configuration
            </h2>
            <p className="text-xs font-mono text-[#555555] max-w-sm leading-relaxed">
              Connect your own API key to power NEXIS. Your key is stored locally in browser storage and never uploaded to our servers.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#2457A6] hover:bg-[#1C4587] text-white border-2 border-[#111111] text-xs font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0px_#111111] transition-all mt-1"
            >
              <span>Get Gemini API Key</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Error Message */}
          {byokError && (() => {
            const isLongError = byokError.length > 120;
            const displayError = isErrorExpanded || !isLongError ? byokError : byokError.slice(0, 110) + '...';

            return (
              <div className="p-3.5 bg-[#E53935]/10 border-2 border-[#E53935] shadow-[2px_2px_0px_#E53935] flex items-start gap-3">
                <div className="mt-0.5 text-[#E53935] shrink-0 font-mono font-bold">!</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#E53935] mb-1">Connection Error</p>
                  <div className={`${isErrorExpanded ? 'max-h-48' : 'max-h-24'} overflow-y-auto pr-1 custom-scrollbar`}>
                    <p className="text-xs font-mono text-[#111111] leading-relaxed break-words whitespace-pre-wrap">
                      {displayError}
                    </p>
                    {isLongError && (
                      <button
                        onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                        className="mt-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#E53935] hover:underline"
                      >
                        {isErrorExpanded ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* API Key input */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
              <Shield size={14} className="text-[#2457A6]" /> Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key (AIzaSy...)"
                className="w-full bg-[#F5F0E6] border-2 border-[#111111] px-4 py-2.5 pr-12 text-xs text-[#111111] font-mono placeholder:text-[#7A7A7A] focus:outline-none focus:border-[#E53935] shadow-[2px_2px_0px_#111111] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-[#111111] transition-colors cursor-pointer w-7 h-7 flex items-center justify-center"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleClear}
              disabled={!isSaved && !apiKey}
              title="Clear Key"
              className="px-4 py-2.5 bg-white hover:bg-[#E53935] hover:text-white text-[#E53935] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] text-xs font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              <Trash2 size={16} />
            </button>

            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-1 py-2.5 bg-[#E53935] hover:bg-[#D32F2F] text-white border-2 border-[#111111] text-xs font-mono font-bold uppercase tracking-wider shadow-[3px_3px_0px_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#111111] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BYOKModal;
