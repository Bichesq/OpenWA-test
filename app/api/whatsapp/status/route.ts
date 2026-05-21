import { NextResponse } from 'next/server';
import { getWhatsAppEngineStatus } from '@/lib/whatsapp/client';
import { bootstrapWhatsApp } from '@/lib/whatsapp/bootstrap';
import { getWhatsAppConfig, getSafeConfigSummary } from '@/lib/whatsapp/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[API Status Route] Checking in-process WhatsApp health status...');
  
  try {
    const config = getWhatsAppConfig();
    if (!config.enabled) {
      return NextResponse.json({
        status: 'disabled',
        message: 'WhatsApp integration is disabled via WHATSAPP_ENABLED environment variable.',
        endpoint: 'Disabled',
        details: { config: getSafeConfigSummary() }
      }, { status: 200 });
    }

    const report = getWhatsAppEngineStatus();

    // Trigger lazy bootstrap if offline
    if (report.status === 'offline') {
      console.log('[API Status Route] WhatsApp is offline. Launching bootstrapper asynchronously...');
      bootstrapWhatsApp().catch(err => {
        console.error('[API Status Route] Background bootstrap failed:', err);
      });
      
      // Update local report properties to show waking up transition
      report.status = 'waking_up';
      report.message = 'Launching embedded WhatsApp engine...';
    }

    return NextResponse.json({
      status: report.status,
      message: report.message,
      qr: report.qr || undefined,
      endpoint: 'In-Process (Embedded)',
      details: {
        uptime: report.uptime,
        version: 'wa-automate (embedded)',
        platform: 'Next.js Backend Process',
        config: getSafeConfigSummary(),
        error: report.error || undefined
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('[API Status Route] Fatal status route error:', error);
    return NextResponse.json({
      status: 'unreachable',
      message: error.message || 'Fatal status route error.',
      endpoint: 'In-Process (Embedded)',
    }, { status: 500 });
  }
}
