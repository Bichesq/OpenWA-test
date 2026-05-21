import { create, Client } from '@open-wa/wa-automate';
import { getWhatsAppConfig } from './config';
import { WhatsAppStatus } from './types';

// Define typed global interface for hot-reload caching
declare global {
  var globalWhatsAppClient: Client | undefined;
  var globalWhatsAppStatus: WhatsAppStatus;
  var globalLatestQrCode: string | null;
  var globalClientError: string | null;
  var globalStartTime: number;
}

// Initialize global fields if undefined
if (globalThis.globalWhatsAppStatus === undefined) {
  globalThis.globalWhatsAppStatus = 'offline';
}
if (globalThis.globalLatestQrCode === undefined) {
  globalThis.globalLatestQrCode = null;
}
if (globalThis.globalClientError === undefined) {
  globalThis.globalClientError = null;
}
if (globalThis.globalStartTime === undefined) {
  globalThis.globalStartTime = Date.now();
}

export async function getWhatsAppClient(): Promise<Client> {
  const config = getWhatsAppConfig();

  if (!config.enabled) {
    globalThis.globalWhatsAppStatus = 'disabled';
    throw new Error('WhatsApp integration is disabled in configurations.');
  }

  // Return cached instance if it exists and status is connected
  if (globalThis.globalWhatsAppClient) {
    return globalThis.globalWhatsAppClient;
  }

  if (globalThis.globalWhatsAppStatus === 'authenticating') {
    // If already in the process of starting up, wait or return the transition message
    throw new Error('WhatsApp client is currently initializing. Please retry shortly.');
  }

  globalThis.globalWhatsAppStatus = 'authenticating';
  globalThis.globalLatestQrCode = null;
  globalThis.globalClientError = null;
  
  try {
    console.log('[WhatsApp Engine] Starting embedded wa-automate client initialization...');
    
    // Create client instance. We pass configurations dynamically.
    const clientInstance = await create({
      sessionId: 'nextjs-embedded-session',
      sessionDataPath: config.sessionDataPath,
      headless: config.headless,
      qrTimeout: 0, // Keep waiting for QR scan
      authTimeout: 0,
      killProcessOnClose: true,
      autoRefresh: true,
      safeMode: true,
      disableSpins: true, // cleaner console logs
      // Optimized parameters for headless Docker/Linux environments
      chromiumLaunchConfig: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ]
      }
    });

    globalThis.globalWhatsAppClient = clientInstance;
    globalThis.globalWhatsAppStatus = 'connected';
    globalThis.globalLatestQrCode = null;
    globalThis.globalClientError = null;

    // Attach general error listener to client page/browser
    const page = clientInstance.getPage();
    if (page) {
      page.on('error', (err: any) => {
        console.error('[WhatsApp Engine] Page Error:', err.message || err);
        globalThis.globalClientError = err.message || String(err);
        globalThis.globalWhatsAppStatus = 'offline';
        globalThis.globalWhatsAppClient = undefined;
      });
      page.browser().on('disconnected', () => {
        console.warn('[WhatsApp Engine] Browser disconnected.');
        globalThis.globalWhatsAppStatus = 'offline';
        globalThis.globalWhatsAppClient = undefined;
      });
    }

    console.log('[WhatsApp Engine] ✓ Embedded client successfully connected and running.');
    return clientInstance;
  } catch (error: any) {
    globalThis.globalWhatsAppStatus = 'offline';
    globalThis.globalWhatsAppClient = undefined;
    globalThis.globalClientError = error.message || String(error);
    console.error('[WhatsApp Engine] Failed to initialize wa-automate:', error);
    throw error;
  }
}

export function getWhatsAppEngineStatus() {
  const config = getWhatsAppConfig();
  if (!config.enabled) {
    return {
      status: 'disabled' as const,
      message: 'WhatsApp is disabled.',
      initialized: false,
    };
  }

  return {
    status: globalThis.globalWhatsAppStatus,
    message: 
      globalThis.globalWhatsAppStatus === 'connected'
        ? 'WhatsApp is ready'
        : globalThis.globalWhatsAppStatus === 'authenticating'
          ? 'Waiting for WhatsApp authentication'
          : 'WhatsApp offline or initializing',
    qr: globalThis.globalLatestQrCode || undefined,
    error: globalThis.globalClientError,
    uptime: Date.now() - globalThis.globalStartTime,
    initialized: !!globalThis.globalWhatsAppClient,
  };
}
export type WhatsAppEngineStatus = ReturnType<typeof getWhatsAppEngineStatus>;
