export function getTimestampString(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    hour12: true,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' UTC';
}

export const messageTemplates = {
  personal: () => {
    return `TEST: Manual dashboard trigger to my personal WhatsApp at ${getTimestampString()}`;
  },
  registration: () => {
    return `NEW REGISTRATION: Jane Doe just registered for Robotics Bootcamp at ${getTimestampString()}`;
  },
  group: () => {
    return `UPDATE: New lesson materials are now available. Please review before tomorrow's class. Sent at ${getTimestampString()}`;
  },
  private: () => {
    return `Hello! This is a private progress update from the dashboard test sent at ${getTimestampString()}`;
  },
  ping: () => {
    return `PING TEST from deployed dashboard at ${getTimestampString()}`;
  },
};

export type TemplateKey = keyof typeof messageTemplates;
