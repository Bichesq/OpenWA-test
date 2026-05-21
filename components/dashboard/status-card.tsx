'use client';

import React from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert, Zap, Globe, Cpu } from 'lucide-react';
import { WhatsAppStatusResponse } from '@/lib/whatsapp/types';

interface StatusCardProps {
  status: WhatsAppStatusResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function StatusCard({ status, isLoading, onRefresh }: StatusCardProps) {
  const connectionState = status?.status || 'unreachable';
  const endpoint = status?.endpoint || 'Loading configuration...';
  const message = status?.message || 'Connecting to WhatsApp service...';
  const details = status?.details;

  // Determine styles and icons based on connection state
  const getStatusStyles = () => {
    switch (connectionState) {
      case 'connected':
        return {
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          glow: 'shadow-emerald-500/20',
          dot: 'bg-emerald-400 animate-pulse',
          icon: <CheckCircle2 className="w-5 h-5" />,
          label: 'Active & Connected',
        };
      case 'authenticating':
        return {
          bgColor: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          glow: 'shadow-purple-500/20',
          dot: 'bg-purple-400 animate-pulse',
          icon: <Activity className="w-5 h-5 animate-pulse" />,
          label: 'Authentication Required',
        };
      case 'waking_up':
        return {
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          glow: 'shadow-amber-500/20',
          dot: 'bg-amber-400 animate-bounce',
          icon: <Activity className="w-5 h-5 animate-pulse" />,
          label: 'Waking Up / Initializing',
        };
      case 'disabled':
        return {
          bgColor: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
          badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
          glow: 'shadow-zinc-500/5',
          dot: 'bg-zinc-400',
          icon: <ShieldAlert className="w-5 h-5" />,
          label: 'Integration Disabled',
        };
      case 'unreachable':
      default:
        return {
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          glow: 'shadow-rose-500/20',
          dot: 'bg-rose-400',
          icon: <AlertTriangle className="w-5 h-5" />,
          label: 'Unreachable / Sleeping',
        };
    }
  };

  const style = getStatusStyles();

  return (
    <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-500 shadow-lg ${style.bgColor} ${style.glow}`}>
      {/* Decorative Background Glows */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-current opacity-10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-current opacity-5 blur-3xl" />

      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold opacity-70">
              WhatsApp Integration Status
            </span>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${style.badgeColor}`}>
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            </div>
          </div>
          
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2 text-sm font-semibold rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/10 backdrop-blur-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm hover:scale-[1.02]"
          >
            <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            {isLoading ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {/* Message Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5 mb-6 text-sm text-zinc-200">
          <div className="mt-0.5">{style.icon}</div>
          <p className="leading-relaxed flex-1">{message}</p>
        </div>

        {/* QR Code display */}
        {status?.qr && (
          <div className="flex flex-col items-center justify-center p-6 mb-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-sm font-semibold text-zinc-200 mb-4 text-center">
              Scan this QR code with WhatsApp Linked Devices on your phone:
            </p>
            <div className="p-3.5 rounded-2xl bg-white shadow-xl shadow-purple-500/5 border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={status.qr} alt="WhatsApp QR Code" className="w-48 h-48 select-none" />
            </div>
            <p className="text-xs text-zinc-400 mt-4 text-center leading-relaxed">
              Once scanned, the status will automatically update to connected.
            </p>
          </div>
        )}

        {/* Technical Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Endpoint display */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-black/20 border border-white/5">
            <Globe className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="overflow-hidden">
              <div className="font-semibold text-zinc-400">API Runtime Location</div>
              <div className="text-zinc-200 truncate mt-0.5" title={endpoint}>{endpoint}</div>
            </div>
          </div>

          {/* Response Latency / Uptime */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-black/20 border border-white/5">
            <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
            <div>
              <div className="font-semibold text-zinc-400">Response / Uptime</div>
              <div className="text-zinc-200 mt-0.5">
                {connectionState === 'connected' && details?.uptime 
                  ? `${details.uptime}ms` 
                  : connectionState === 'waking_up' 
                  ? 'Warming up...' 
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Platform Platform / Version */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-black/20 border border-white/5">
            <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="font-semibold text-zinc-400">Embedded Engine</div>
              <div className="text-zinc-200 mt-0.5">
                {connectionState === 'connected' && details?.version 
                  ? details.version 
                  : '@open-wa/wa-automate'}
              </div>
            </div>
          </div>
        </div>

        {/* Node backend helper text */}
        {connectionState === 'waking_up' && (
          <div className="mt-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-normal animate-pulse">
            <strong>Notice:</strong> The Next.js backend is initializing the WhatsApp client browser in-process. This process may take a moment to launch.
          </div>
        )}
        {connectionState === 'unreachable' && (
          <div className="mt-5 p-3 rounded-lg bg-zinc-500/5 border border-white/5 text-xs text-zinc-300 leading-normal">
            <strong>Troubleshooting:</strong> Make sure the Next.js backend server is running. Verify that `WHATSAPP_ENABLED` is set to `true` in your environment and check the server logs for any initialization errors.
          </div>
        )}
      </div>
    </div>
  );
}
