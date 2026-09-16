import { Eye, EyeOff, Trash2, X, Key, Shield } from 'lucide-react';
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
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm transition-opacity duration-300"
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl p-8 md:p-10 border border-white/20 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="max-w-md mx-auto flex flex-col gap-8">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-zinc-950 flex items-center justify-center shadow-xl shadow-zinc-900/10 mb-2">
              <Key size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-display font-bold text-zinc-950 tracking-tight">
              Gemini API Configuration
            </h2>
            <p className="text-sm text-zinc-500 font-medium max-w-sm">
              Connect your own API key to power NEXIS. Your key is stored locally and never leaves your browser.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 rounded-xl transition-colors mt-2 group"
            >
              <span className="text-xs font-bold text-blue-600">Get Gemini API Key</span>
              <svg className="text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </a>
          </div>

          {/* Error Message */}
          {byokError && (() => {
            const isLongError = byokError.length > 120;
            const displayError = isErrorExpanded || !isLongError ? byokError : byokError.slice(0, 110) + '...';

            return (
              <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl flex items-start gap-3">
                <div className="mt-0.5 text-red-500 shrink-0">
                  <X size={16} strokeWidth={3} className="rotate-45" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-red-800 mb-1">Connection Error</p>
                  <div className={`${isErrorExpanded ? 'max-h-48' : 'max-h-24'} overflow-y-auto pr-1 custom-scrollbar`}>
                    <p className="text-xs font-medium text-red-600 leading-relaxed break-words whitespace-pre-wrap">
                      {displayError}
                    </p>
                    {isLongError && (
                      <button
                        onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                        className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-700 hover:text-red-900 transition-colors"
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
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Shield size={14} className="text-zinc-400" /> API Key
            </label>
            <div className="relative group">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key here..."
                className="w-full bg-zinc-50 border border-zinc-200/80 rounded-2xl px-5 py-4 pr-14 text-sm text-zinc-950 font-mono placeholder:text-zinc-400 placeholder:font-sans focus:outline-none focus:border-zinc-400 focus:bg-white transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100"
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleClear}
              disabled={!isSaved && !apiKey}
              className="px-6 py-3.5 bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Trash2 size={16} />
            </button>

            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-1 py-3.5 bg-zinc-950 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md flex justify-center items-center gap-2"
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
