'use client';

import React, { useState, useEffect } from 'react';
import { StatusCard } from '@/components/dashboard/status-card';
import { ActionCard } from '@/components/dashboard/action-card';
import { WhatsAppStatusResponse, TestScenario } from '@/lib/whatsapp/types';
import { messageTemplates } from '@/lib/whatsapp/templates';
import { Layers, Send, RefreshCw, MessageSquare, Terminal } from 'lucide-react';

export default function Dashboard() {
  const [status, setStatus] = useState<WhatsAppStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Fetch status on load
  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await fetch('/api/whatsapp/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setStatus({
          status: 'unreachable',
          message: `Endpoint returned HTTP status ${response.status}`,
          endpoint: 'Unknown',
        });
      }
    } catch (err: any) {
      console.error('Failed to retrieve service status:', err);
      setStatus({
        status: 'unreachable',
        message: err.message || 'Network exception checking status.',
        endpoint: 'Unknown',
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Trigger scenario send action
  const handleTriggerScenario = async (scenarioId: string) => {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scenario: scenarioId }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        messageId: data.messageId,
        timestamp: data.timestamp,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to dispatch message.',
      };
    }
  };

  // Mask details fetched from backend config metadata
  const config = status?.details?.config;
  const isWhatsAppDisabled = status?.status === 'disabled';

  const scenarios: TestScenario[] = [
    {
      id: 'personal',
      title: 'Send Test Message to Me',
      description: 'Sends a basic personal test text directly to your own configured WhatsApp number.',
      targetType: 'personal',
      targetLabel: config?.myNumberMasked || 'WHATSAPP_MY_NUMBER (Unset)',
      exampleTemplate: 'TEST: Manual dashboard trigger to my personal WhatsApp at {timestamp}',
      actionName: 'sendText',
    },
    {
      id: 'registration',
      title: 'Registration Alert Simulation',
      description: 'Simulates a lead conversion: sends a registration webhook success alert to your number.',
      targetType: 'registration',
      targetLabel: config?.myNumberMasked || 'WHATSAPP_MY_NUMBER (Unset)',
      exampleTemplate: 'NEW REGISTRATION: Jane Doe just registered for Robotics Bootcamp at {timestamp}',
      actionName: 'sendText',
    },
    {
      id: 'group',
      title: 'Client Update Broadcast to Group',
      description: 'Broadcasts a classroom notice or course material alert to the designated updates group.',
      targetType: 'group',
      targetLabel: config?.groupIdMasked || 'WHATSAPP_UPDATES_GROUP_ID (Unset)',
      exampleTemplate: "UPDATE: New lesson materials are now available. Please review before tomorrow's class. Sent at {timestamp}",
      actionName: 'sendText',
    },
    {
      id: 'private',
      title: 'Private Client Progress Update',
      description: 'Sends a progress notification specifically to a designated client private chat ID.',
      targetType: 'private',
      targetLabel: config?.clientIdMasked || 'WHATSAPP_TEST_CLIENT_ID (Unset)',
      exampleTemplate: 'Hello! This is a private progress update from the dashboard test sent at {timestamp}',
      actionName: 'sendText',
    },
    {
      id: 'ping',
      title: 'System Ping Test',
      description: 'Runs an active connectivity check, dispatching a short ping to your personal phone number.',
      targetType: 'ping',
      targetLabel: config?.myNumberMasked || 'WHATSAPP_MY_NUMBER (Unset)',
      exampleTemplate: 'PING TEST from deployed dashboard at {timestamp}',
      actionName: 'sendText',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Dynamic Aesthetic Background Grid / Glows */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none translate-y-1/3" />

      {/* Main Container */}
      <main className="relative max-w-7xl mx-auto px-4 py-8 md:py-16">
        
        {/* Header Section */}
        <header className="mb-10 md:mb-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest">
              Open WA Easy API Dashboard
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            WhatsApp Action <br className="hidden md:inline" /> Testing Dashboard
          </h1>

          <p className="text-zinc-400 text-base md:text-lg max-w-3xl leading-relaxed">
            This dashboard pings and triggers WhatsApp actions in your separate <strong>Open WA EASY API</strong> backend service running the embedded runtime. 
            All environment credentials and target configurations are securely processed server-side in Next.js route handlers.
          </p>

          {/* Architecture Explainer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-zinc-200 text-sm uppercase tracking-wider mb-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Vercel Dashboard Layer (UI)
              </h2>
              <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
                <li>Serverless Route Handlers map scenarios to targets.</li>
                <li>Masks raw phone numbers and group IDs before displaying.</li>
                <li>Standard stateless HTTP fetch prevents socket drop-outs on Vercel.</li>
              </ul>
            </div>
            
            <div className="border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
              <h2 className="flex items-center gap-2 font-bold text-zinc-200 text-sm uppercase tracking-wider mb-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Node Backend Layer (Engine)
              </h2>
              <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
                <li>Hosts the actual Puppeteer browser and WhatsApp runtime.</li>
                <li>Handles internal WhatsApp automate connection states.</li>
                <li>Exposes HTTP API endpoints for clean triggers and status monitoring.</li>
              </ul>
            </div>
          </div>
        </header>

        {/* Status Component */}
        <section className="mb-10">
          <StatusCard
            status={status}
            isLoading={isLoadingStatus}
            onRefresh={fetchStatus}
          />
        </section>

        {/* Action Scenarios Grid Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">Test Scenarios</h2>
              <p className="text-zinc-400 text-xs mt-1">Manual triggers to test message layout and delivery status</p>
            </div>
            {isWhatsAppDisabled && (
              <span className="text-xs px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold animate-pulse">
                Integration is Off
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map((scenario) => (
              <ActionCard
                key={scenario.id}
                scenario={scenario}
                onSend={handleTriggerScenario}
                isServiceDisabled={status?.status !== 'connected' || isLoadingStatus}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Footer copyright */}
      <footer className="mt-20 border-t border-white/5 py-8 text-center text-xs text-zinc-600">
        <p>© 2026 WhatsApp Testing Panel. Designed with premium dark system styles.</p>
      </footer>
    </div>
  );
}
