import { Client, Message } from '@open-wa/wa-automate';

/**
 * Orchestrates incoming WhatsApp message events
 */
export async function handleIncomingMessage(client: Client, message: Message) {
  // Filter out status messages, group messages, or messages from ourselves to keep it clean
  if (message.isGroupMsg || message.fromMe) return;

  console.log(`[WhatsApp Incoming] Message from ${message.from}: ${message.body}`);

  // Auto-responder testing scenario: respond to 'ping' with 'pong'
  if (message.body && message.body.toLowerCase().trim() === 'ping') {
    try {
      console.log(`[WhatsApp Auto-responder] Sending pong to ${message.from}`);
      await client.sendText(message.from, '🏓 pong (sent from embedded runtime!)');
    } catch (err: any) {
      console.error(`[WhatsApp Auto-responder] Failed to send response:`, err.message);
    }
  }
}

/**
 * Business service wrapper to format targets and dispatch text messages in-process
 */
export async function dispatchWhatsAppMessage(target: string, messageText: string): Promise<string> {
  const client = globalThis.globalWhatsAppClient;
  const status = globalThis.globalWhatsAppStatus;

  if (!client || status !== 'connected') {
    throw new Error(`WhatsApp engine is not ready. Current status: ${status}`);
  }

  // Format recipient ID
  let formattedTarget = target.trim();
  if (!formattedTarget.endsWith('@c.us') && !formattedTarget.endsWith('@g.us')) {
    if (formattedTarget.includes('-')) {
      formattedTarget = `${formattedTarget}@g.us`;
    } else {
      const numbersOnly = formattedTarget.replace(/[+\s\-()]/g, '');
      formattedTarget = `${numbersOnly}@c.us`;
    }
  }

  console.log(`[WhatsApp Dispatcher] Sending message to ${formattedTarget}`);
  try {
    const result = await client.sendText(formattedTarget as any, messageText);
    if (typeof result === 'boolean') {
      if (!result) {
        throw new Error('Failed to send message (sendText returned false)');
      }
      return 'sent';
    }
    console.log(`[WhatsApp Dispatcher] Message dispatched successfully. ID: ${result}`);
    return String(result);
  } catch (error: any) {
    console.error(`[WhatsApp Dispatcher Error] Failed to send message to ${formattedTarget}:`, error);
    throw error;
  }
}
