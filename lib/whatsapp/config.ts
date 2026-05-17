import { WhatsAppConfig } from './types';

export function getWhatsAppConfig(): WhatsAppConfig {
  const enabled = process.env.WHATSAPP_ENABLED === 'true';
  const baseUrl = process.env.OPENWA_BASE_URL || '';
  const apiKey = process.env.OPENWA_API_KEY || '';
  const myNumber = process.env.WHATSAPP_MY_NUMBER || '';
  const updatesGroupId = process.env.WHATSAPP_UPDATES_GROUP_ID || '';
  const testClientId = process.env.WHATSAPP_TEST_CLIENT_ID || '';

  return {
    enabled,
    baseUrl: baseUrl.replace(/\/$/, ''), // Strip trailing slash
    apiKey,
    myNumber,
    updatesGroupId,
    testClientId,
  };
}

export function validateWhatsAppConfig(config: WhatsAppConfig): { isValid: boolean; error?: string } {
  if (!config.enabled) {
    return { isValid: false, error: 'WhatsApp integration is disabled via WHATSAPP_ENABLED environment variable.' };
  }

  if (!config.baseUrl) {
    return { isValid: false, error: 'Missing OPENWA_BASE_URL environment variable.' };
  }

  if (!config.apiKey) {
    return { isValid: false, error: 'Missing OPENWA_API_KEY environment variable.' };
  }

  return { isValid: true };
}

export function maskString(str: string, keepChars = 4): string {
  if (!str) return '';
  if (str.length <= keepChars) return '*'.repeat(str.length);
  return str.substring(0, keepChars) + '*'.repeat(str.length - keepChars);
}

export function getSafeConfigSummary() {
  const config = getWhatsAppConfig();
  
  // Basic URL parsing to show host only
  let safeUrl = 'Not configured';
  if (config.baseUrl) {
    try {
      const url = new URL(config.baseUrl);
      safeUrl = `${url.protocol}//${url.hostname}`;
    } catch {
      safeUrl = 'Invalid URL';
    }
  }

  return {
    enabled: config.enabled,
    endpoint: safeUrl,
    hasMyNumber: !!config.myNumber,
    hasGroupId: !!config.updatesGroupId,
    hasClientId: !!config.testClientId,
    myNumberMasked: config.myNumber ? maskString(config.myNumber, 4) : 'Not Configured',
    groupIdMasked: config.updatesGroupId ? maskString(config.updatesGroupId, 5) : 'Not Configured',
    clientIdMasked: config.testClientId ? maskString(config.testClientId, 4) : 'Not Configured',
  };
}
