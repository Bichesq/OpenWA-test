import { WhatsAppConfig } from './types';
import path from 'path';

export function getWhatsAppConfig(): WhatsAppConfig {
  const enabled = process.env.WHATSAPP_ENABLED === 'true';
  
  // Resolve session data path: defaults to a local 'sessions' directory in root
  const rawSessionPath = process.env.WHATSAPP_SESSION_PATH || './sessions';
  const sessionDataPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawSessionPath);

  const headless = process.env.WHATSAPP_HEADLESS !== 'false';
  const myNumber = process.env.WHATSAPP_MY_NUMBER || '';
  const updatesGroupId = process.env.WHATSAPP_UPDATES_GROUP_ID || '';
  const testClientId = process.env.WHATSAPP_TEST_CLIENT_ID || '';

  return {
    enabled,
    sessionDataPath,
    headless,
    myNumber,
    updatesGroupId,
    testClientId,
  };
}

export function validateWhatsAppConfig(config: WhatsAppConfig): { isValid: boolean; error?: string } {
  if (!config.enabled) {
    return { isValid: false, error: 'WhatsApp integration is disabled via WHATSAPP_ENABLED environment variable.' };
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
  
  return {
    enabled: config.enabled,
    hasMyNumber: !!config.myNumber,
    hasGroupId: !!config.updatesGroupId,
    hasClientId: !!config.testClientId,
    myNumberMasked: config.myNumber ? maskString(config.myNumber, 4) : 'Not Configured',
    groupIdMasked: config.updatesGroupId ? maskString(config.updatesGroupId, 5) : 'Not Configured',
    clientIdMasked: config.testClientId ? maskString(config.testClientId, 4) : 'Not Configured',
  };
}
