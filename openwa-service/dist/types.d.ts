export interface SendTextPayload {
    to: string;
    message: string;
}
export interface SendTextResponse {
    success: boolean;
    messageId?: string;
    error?: string;
    timestamp: string;
}
export interface StatusResponse {
    status: 'connected' | 'authenticating' | 'offline' | 'error';
    message: string;
    authenticated?: boolean;
    uptime?: number;
    error?: string;
    qr?: string;
}
export interface HealthResponse {
    status: 'healthy' | 'initializing';
    uptime: number;
    message: string;
}
//# sourceMappingURL=types.d.ts.map