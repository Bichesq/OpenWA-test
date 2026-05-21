import { ev, Client } from '@open-wa/wa-automate';
import { getWhatsAppClient } from './client';
import { handleIncomingMessage } from './handlers';
import { getWhatsAppConfig } from './config';

let hasRegisteredProcessHooks = false;

export async function bootstrapWhatsApp(): Promise<Client | null> {
  const config = getWhatsAppConfig();
  if (!config.enabled) {
    console.log('[WhatsApp Bootstrapper] WhatsApp integration is disabled via environment variable.');
    globalThis.globalWhatsAppStatus = 'disabled';
    return null;
  }

  // Bind QR Code and connection state events BEFORE client creation to catch the initialization phase
  ev.on('qr.**', (qrcode: string, sessionId: string) => {
    console.log(`[WhatsApp Bootstrapper] New QR code generated for session: ${sessionId}`);
    globalThis.globalLatestQrCode = qrcode;
    globalThis.globalWhatsAppStatus = 'authenticating';
    globalThis.globalClientError = null;
  });

  ev.on('change_state.**', (state: string, sessionId: string) => {
    console.log(`[WhatsApp Bootstrapper] State transitioned to ${state} for session: ${sessionId}`);
    if (state === 'CONNECTED') {
      globalThis.globalWhatsAppStatus = 'connected';
      globalThis.globalLatestQrCode = null;
      globalThis.globalClientError = null;
    } else if (state === 'PAIRING' || state === 'SYNCING') {
      globalThis.globalWhatsAppStatus = 'authenticating';
    } else if (['DISCONNECTED', 'UNPAIRED', 'CONFLICT'].includes(state)) {
      globalThis.globalWhatsAppStatus = 'offline';
      globalThis.globalLatestQrCode = null;
      globalThis.globalClientError = `WhatsApp state: ${state}`;
      globalThis.globalWhatsAppClient = undefined;
    }
  });

  try {
    const client = await getWhatsAppClient();

    // Attach listeners
    client.onMessage(async (message) => {
      try {
        await handleIncomingMessage(client, message);
      } catch (err) {
        console.error('[WhatsApp Event Loop] Error running onMessage handler:', err);
      }
    });

    // Handle process shutdown cleanly (prevent zombie Chromium processes)
    if (!hasRegisteredProcessHooks) {
      const shutdown = async (signal: string) => {
        console.log(`\n[WhatsApp System] Received ${signal}. Shutting down browser...`);
        const currentClient = globalThis.globalWhatsAppClient;
        if (currentClient) {
          try {
            await currentClient.kill();
            console.log('[WhatsApp System] Browser process killed successfully.');
          } catch (err: any) {
            console.error('[WhatsApp System] Error closing browser process:', err.message || err);
          } finally {
            globalThis.globalWhatsAppClient = undefined;
            globalThis.globalWhatsAppStatus = 'offline';
          }
        }
        // Let the node process terminate naturally or manually if needed
        if (signal !== 'API_RELOAD') {
          process.exit(0);
        }
      };

      process.once('SIGINT', () => shutdown('SIGINT'));
      process.once('SIGTERM', () => shutdown('SIGTERM'));
      hasRegisteredProcessHooks = true;
    }

    return client;
  } catch (error: any) {
    console.error('[WhatsApp Bootstrapper] Startup sequence failed:', error.message || error);
    return null;
  }
}
