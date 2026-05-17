import { NextResponse } from 'next/server';
import { checkWhatsAppStatus } from '@/lib/whatsapp/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[API Status Route] Initiating WhatsApp health check...');
  
  try {
    const statusReport = await checkWhatsAppStatus();
    return NextResponse.json(statusReport, { status: 200 });
  } catch (error: any) {
    console.error('[API Status Route] Fatal status route error:', error);
    return NextResponse.json({
      status: 'unreachable',
      message: error.message || 'Fatal status route error.',
      endpoint: 'Unknown',
    }, { status: 500 });
  }
}
