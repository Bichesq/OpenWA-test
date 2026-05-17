import { WhatsAppStatusResponse, SendMessageResponse, WhatsAppStatus } from './types';
import { getWhatsAppConfig, validateWhatsAppConfig, getSafeConfigSummary } from './config';

/**
 * Format a WhatsApp target (phone or group ID) to the correct format expected by Open WA
 */
export function formatWhatsAppTarget(target: string): string {
  const clean = target.trim();
  if (!clean) return '';

  // Already formatted
  if (clean.endsWith('@c.us') || clean.endsWith('@g.us')) {
    return clean;
  }

  // Group ID format: usually contains a hyphen, e.g., 1234567890-14839284@g.us
  if (clean.includes('-')) {
    return `${clean}@g.us`;
  }

  // Clean phone number: remove +, spaces, dashes, parentheses
  const numbersOnly = clean.replace(/[+\s\-()]/g, '');
  return `${numbersOnly}@c.us`;
}

/**
 * Make an HTTP request with a strict timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Check health / reachability of the remote Render-hosted Open WA service
 */
export async function checkWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
  const config = getWhatsAppConfig();
  
  // 1. Check if integration is enabled
  const validation = validateWhatsAppConfig(config);
  if (!validation.isValid) {
    return {
      status: 'disabled',
      message: validation.error || 'WhatsApp is disabled.',
      endpoint: config.baseUrl || 'Not configured',
      details: { config: getSafeConfigSummary() }
    };
  }

  const endpoint = config.baseUrl;
  
  // We'll try to reach a common endpoint.
  // Standard Open WA EASY API has GET /ping, GET /api/ping, or GET /
  const pingUrl = `${endpoint}/ping`;
  const fallbackUrl = `${endpoint}/`;

  console.log(`[WhatsApp Service] Pinging Open WA service at: ${pingUrl}`);

  const startTime = Date.now();
  try {
    // We use a relatively short timeout (5 seconds) to check health.
    // If it takes longer, it's likely a cold start on Render free tier.
    const response = await fetchWithTimeout(
      pingUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'x-api-key': config.apiKey,
        },
      },
      5000
    );

    const duration = Date.now() - startTime;
    console.log(`[WhatsApp Service] Ping succeeded in ${duration}ms with status ${response.status}`);

    if (response.ok || response.status === 401 || response.status === 403) {
      // 401/403 means the server is awake and actively rejecting unauthorized requests, which is "reachable"!
      // 200 means active and healthy.
      let extraInfo: any = {};
      try {
        const body = await response.json();
        extraInfo = body.details || body || {};
      } catch {
        // No json body, that's fine
      }

      return {
        status: 'connected',
        message: 'Open WA service is online and reachable.',
        endpoint,
        details: {
          uptime: extraInfo.uptime || duration,
          version: extraInfo.version || 'EASY API',
          platform: 'Render',
          config: getSafeConfigSummary(),
        },
      };
    }

    return {
      status: 'unreachable',
      message: `Service returned unexpected HTTP status: ${response.status}`,
      endpoint,
      details: { config: getSafeConfigSummary() }
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[WhatsApp Service] Status check failed after ${duration}ms:`, error);

    // Differentiate between timeout (cold start) and connection refused (down)
    if (error.name === 'AbortError') {
      return {
        status: 'waking_up',
        message: 'Open WA service is taking longer than 5 seconds to respond. It is likely waking up from Render free tier sleep.',
        endpoint,
        details: { 
          error: 'Timeout waiting for Render instance',
          config: getSafeConfigSummary()
        },
      };
    }

    // Attempt a fallback check on the root path in case /ping is not defined
    try {
      console.log(`[WhatsApp Service] Trying fallback health check on root: ${fallbackUrl}`);
      const fallbackResponse = await fetchWithTimeout(
        fallbackUrl,
        {
          method: 'GET',
        },
        3000
      );

      if (fallbackResponse.status < 500) {
        return {
          status: 'connected',
          message: 'Open WA service root is reachable.',
          endpoint,
          details: { config: getSafeConfigSummary() }
        };
      }
    } catch (fallbackError) {
      console.error('[WhatsApp Service] Fallback health check also failed:', fallbackError);
    }

    return {
      status: 'unreachable',
      message: `Open WA service is unreachable. Error: ${error.message || 'Connection failed'}`,
      endpoint,
      details: { 
        error: error.message,
        config: getSafeConfigSummary()
      },
    };
  }
}

/**
 * Send a message via Open WA HTTP API
 */
export async function sendWhatsAppMessage(
  target: string,
  messageText: string
): Promise<SendMessageResponse> {
  const config = getWhatsAppConfig();
  const timestamp = new Date().toISOString();

  // Validate configuration
  const validation = validateWhatsAppConfig(config);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error || 'WhatsApp is disabled.',
      timestamp,
    };
  }

  if (!target) {
    return {
      success: false,
      error: 'WhatsApp target (phone or group ID) is missing or empty.',
      timestamp,
    };
  }

  const formattedTarget = formatWhatsAppTarget(target);
  const sendUrl = `${config.baseUrl}/api/sendText`;

  console.log(`[WhatsApp Service] Sending message to ${formattedTarget} via ${sendUrl}`);

  // Construct a super-payload to cover all variants of the EASY API:
  // - 'to' or 'chatId' for recipient
  // - 'content' or 'message' for the message text
  const payload = {
    to: formattedTarget,
    chatId: formattedTarget,
    content: messageText,
    message: messageText,
  };

  try {
    // On send, we give it a longer timeout (15s) in case Render is warming up.
    // However, if Render is totally sleeping, it might exceed 15s.
    const response = await fetchWithTimeout(
      sendUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'x-api-key': config.apiKey,
        },
        body: JSON.stringify(payload),
      },
      15000
    );

    const responseBody = await response.json().catch(() => ({}));
    console.log(`[WhatsApp Service] Send API response:`, responseBody);

    if (response.ok && (responseBody.success !== false)) {
      return {
        success: true,
        messageId: responseBody.messageId || responseBody.id || 'unknown-id',
        timestamp,
        details: responseBody,
      };
    }

    return {
      success: false,
      error: responseBody.error || responseBody.message || `API error: HTTP ${response.status}`,
      timestamp,
      details: responseBody,
    };

  } catch (error: any) {
    console.error('[WhatsApp Service] Send message request failed:', error);

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Send request timed out. The Render instance might still be waking up, or the message is taking too long to send.',
        timestamp,
      };
    }

    return {
      success: false,
      error: `Failed to connect to Render Open WA service: ${error.message || 'Unknown error'}`,
      timestamp,
    };
  }
}
