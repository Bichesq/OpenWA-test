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
  
  // Try several candidate paths in order of preference to verify the server is alive
  const candidatePaths = [
    '/api-docs/',
    '/',
    '/ping'
  ];

  console.log(`[WhatsApp Service] Initiating health check on Open WA service at: ${endpoint}`);

  const startTime = Date.now();
  let lastError: any = null;
  let lastResponseStatus: number | null = null;

  for (const path of candidatePaths) {
    const testUrl = `${endpoint}${path}`;
    try {
      console.log(`[WhatsApp Service] Pinging path: ${path}`);
      const response = await fetchWithTimeout(
        testUrl,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'x-api-key': config.apiKey,
          },
        },
        5000 // 5 seconds timeout per request
      );

      const duration = Date.now() - startTime;
      console.log(`[WhatsApp Service] Ping to ${path} completed in ${duration}ms with status ${response.status}`);

      // 200 OK means active and healthy.
      // 401/403 means the server is awake and actively rejecting unauthorized requests, which is "reachable"!
      if (response.ok || response.status === 401 || response.status === 403) {
        let extraInfo: any = {};
        try {
          const body = await response.json();
          extraInfo = body.details || body || {};
        } catch {
          // No json body or not JSON, that's fine (e.g. HTML from /api-docs/)
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
      
      lastResponseStatus = response.status;
    } catch (err: any) {
      console.warn(`[WhatsApp Service] Ping to ${path} failed:`, err.message || err);
      lastError = err;
      
      // If we timed out (AbortError), it's likely a cold start on Render's free tier.
      // We immediately return 'waking_up' to avoid waiting through other candidates.
      if (err.name === 'AbortError') {
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
    }
  }

  // If we got here, none of our candidate pings resulted in 200, 401, or 403.
  const duration = Date.now() - startTime;
  
  if (lastResponseStatus !== null) {
    return {
      status: 'unreachable',
      message: `Service returned unexpected HTTP status: ${lastResponseStatus}`,
      endpoint,
      details: { config: getSafeConfigSummary() }
    };
  }

  return {
    status: 'unreachable',
    message: `Open WA service is unreachable. Error: ${lastError?.message || 'Connection failed'}`,
    endpoint,
    details: { 
      error: lastError?.message,
      config: getSafeConfigSummary()
    },
  };
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
  // - 'text', 'content', or 'message' for the message text
  const payload = {
    to: formattedTarget,
    chatId: formattedTarget,
    text: messageText,
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
          'api_key': config.apiKey,
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
