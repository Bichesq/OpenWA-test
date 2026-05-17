'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, XCircle, Clock, Copy, Info } from 'lucide-react';
import { TestScenario } from '@/lib/whatsapp/types';

interface ActionCardProps {
  scenario: TestScenario;
  onSend: (scenarioId: string) => Promise<{ success: boolean; error?: string; messageId?: string; timestamp?: string }>;
  isServiceDisabled: boolean;
}

export function ActionCard({ scenario, onSend, isServiceDisabled }: ActionCardProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    messageId?: string;
    timestamp?: string;
  }>({ type: null, message: '' });

  const handleSend = async () => {
    setLoading(true);
    setFeedback({ type: null, message: '' });
    
    try {
      const response = await onSend(scenario.id);
      
      if (response.success) {
        setFeedback({
          type: 'success',
          message: 'Message dispatched successfully!',
          messageId: response.messageId,
          timestamp: response.timestamp ? new Date(response.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
        });
      } else {
        setFeedback({
          type: 'error',
          message: response.error || 'Failed to dispatch message. Target may not be registered.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'An unexpected error occurred during dispatch.',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(scenario.exampleTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine borders and background tints on status
  const cardBorderClass = 
    feedback.type === 'success' 
      ? 'border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/5' 
      : feedback.type === 'error' 
      ? 'border-rose-500/30 bg-rose-500/5 shadow-rose-500/5' 
      : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/[0.08]';

  return (
    <div className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border backdrop-blur-xl p-6 transition-all duration-300 shadow-md ${cardBorderClass}`}>
      {/* Decorative Badge */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 blur-2xl opacity-10 pointer-events-none" />

      <div>
        {/* Scenario Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-bold text-lg text-white tracking-wide">{scenario.title}</h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/5">
            {scenario.actionName}
          </span>
        </div>

        {/* Description & Target details */}
        <p className="text-sm text-zinc-400 mb-4 font-normal leading-relaxed">{scenario.description}</p>
        
        {/* Target Details Badge */}
        <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-black/30 border border-white/5 text-xs text-zinc-300">
          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="font-semibold text-zinc-400">Target:</span>
          <span className="truncate text-zinc-200 font-mono">{scenario.targetLabel}</span>
        </div>

        {/* Message Preview Container */}
        <div className="relative mb-5 p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-zinc-300 leading-relaxed group">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={copyTemplate}
              className="p-1 rounded bg-white/10 hover:bg-white/20 border border-white/5 text-zinc-300"
              title="Copy message preview"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="font-semibold text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5 flex justify-between items-center">
            <span>Payload Template Preview</span>
            {copied && <span className="text-emerald-400 text-[9px] capitalize">Copied!</span>}
          </div>
          <p className="whitespace-pre-line italic break-words">"{scenario.exampleTemplate}"</p>
        </div>
      </div>

      {/* Footer and Interactive Area */}
      <div className="mt-auto pt-2">
        {/* Status Feedbacks */}
        {feedback.type === 'success' && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300 mb-4 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{feedback.message}</p>
              {feedback.messageId && (
                <p className="mt-0.5 text-[10px] opacity-70 truncate font-mono">ID: {feedback.messageId}</p>
              )}
              {feedback.timestamp && (
                <p className="mt-0.5 text-[9px] opacity-50 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Sent at {feedback.timestamp}
                </p>
              )}
            </div>
          </div>
        )}

        {feedback.type === 'error' && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-950/40 border border-rose-500/20 text-xs text-rose-300 mb-4 animate-fadeIn">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1 leading-normal">
              <p className="font-semibold">Failed to send</p>
              <p className="opacity-80 text-[11px] mt-0.5 break-words">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleSend}
          disabled={loading || isServiceDisabled}
          className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer ${
            loading 
              ? 'bg-white/10 text-white border border-white/5 cursor-wait' 
              : isServiceDisabled 
              ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              : 'bg-white text-zinc-950 hover:bg-zinc-150 border border-white hover:scale-[1.01] active:scale-[0.99] shadow-sm font-bold'
          }`}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 shrink-0" />
              <span>Trigger Scenario</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
