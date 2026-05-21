export interface WhatsAppConfig {
  enabled: boolean;
  sessionDataPath: string;
  headless: boolean;
  myNumber: string;
  updatesGroupId: string;
  testClientId: string;
}

export type WhatsAppStatus = 'connected' | 'waking_up' | 'unreachable' | 'disabled' | 'authenticating' | 'offline';

export interface WhatsAppStatusResponse {
  status: WhatsAppStatus;
  message: string;
  qr?: string;
  endpoint?: string;
  details?: {
    version?: string;
    waVersion?: string;
    uptime?: number;
    platform?: string;
    error?: string;
    config?: {
      enabled: boolean;
      hasMyNumber: boolean;
      hasGroupId: boolean;
      hasClientId: boolean;
      myNumberMasked?: string;
      groupIdMasked?: string;
      clientIdMasked?: string;
    };
  };
}

export interface SendMessagePayload {
  to: string;
  content: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
  details?: any;
}

export interface TestScenario {
  id: string;
  title: string;
  description: string;
  targetType: 'personal' | 'registration' | 'group' | 'private' | 'ping';
  targetLabel: string;
  exampleTemplate: string;
  actionName: string;
}
