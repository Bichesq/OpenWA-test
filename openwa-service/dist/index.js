"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY || 'defaultkey';
const SESSION_DATA_PATH = process.env.SESSION_DATA_PATH || '/app/sessions';
// Ensure session directory exists
if (!fs_1.default.existsSync(SESSION_DATA_PATH)) {
    fs_1.default.mkdirSync(SESSION_DATA_PATH, { recursive: true });
    console.log(`[INIT] Created session directory: ${SESSION_DATA_PATH}`);
}
app.use(express_1.default.json());
// ==================== Message Templates ====================
function getTimestampString() {
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
const messageTemplates = {
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
// ==================== Global State ====================
let client = null;
let clientInitializing = false;
let clientAuthStatus = 'offline'; // 'offline' | 'authenticating' | 'connected'
let latestQrCode = null;
let startTime = Date.now();
let lastError = null;
// ==================== API Key Middleware ====================
const apiKeyAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'] || req.headers['api_key'];
    // Check Bearer token or direct API key header
    const tokenValid = (authHeader && authHeader.replace('Bearer ', '') === API_KEY) ||
        apiKeyHeader === API_KEY;
    if (!tokenValid) {
        console.warn(`[AUTH] Unauthorized attempt`);
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Invalid API key',
        });
    }
    next();
};
// ==================== Initialize wa-automate Client ====================
async function initializeClient() {
    if (client || clientInitializing) {
        console.log('[CLIENT] Client already initialized or initializing');
        return;
    }
    clientInitializing = true;
    clientAuthStatus = 'authenticating';
    latestQrCode = null;
    lastError = null;
    try {
        console.log('[CLIENT] Starting wa-automate initialization...');
        // Import wa-automate only when needed
        const waAutomate = require('@open-wa/wa-automate');
        const { create, ev } = waAutomate;
        // Listen for QR code and state change events BEFORE calling create
        ev.on('qr.**', (qrcode, sessionId) => {
            console.log(`[QR CODE] New QR code generated for session: ${sessionId}`);
            latestQrCode = qrcode;
            clientAuthStatus = 'authenticating';
            lastError = null;
        });
        ev.on('change_state.**', (state, sessionId) => {
            console.log(`[STATE] WhatsApp state changed for session ${sessionId}: ${state}`);
            if (state === 'CONNECTED') {
                clientAuthStatus = 'connected';
                latestQrCode = null;
                lastError = null;
            }
            else if (state === 'DISCONNECTED' || state === 'UNPAIRED' || state === 'CONFLICT') {
                clientAuthStatus = 'offline';
                latestQrCode = null;
                lastError = `WhatsApp state changed to ${state}`;
            }
            else if (state === 'PAIRING' || state === 'SYNCING') {
                clientAuthStatus = 'authenticating';
            }
        });
        // Get session data path
        const sessionPath = path_1.default.join(SESSION_DATA_PATH, 'whatsapp-session.json');
        // Configuration options for wa-automate
        const config = {
            sessionDataPath: SESSION_DATA_PATH,
            sessionDataPathCustom: sessionPath,
            headless: true,
            browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
            useChrome: true,
            chromiumLaunchConfig: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
            logLevel: 'info',
            executablePath: '/usr/bin/google-chrome-stable',
            qrTimeout: 0, // Don't timeout waiting for QR
        };
        // Create the client
        const newClient = await create(config);
        // Set up general error handler on client
        newClient.onError((error) => {
            console.error('[ERROR] wa-automate error:', error.message);
            lastError = error.message;
            clientAuthStatus = 'offline';
        });
        client = newClient;
        clientAuthStatus = 'connected';
        latestQrCode = null;
        console.log('[CLIENT] ✓ wa-automate client initialized successfully');
    }
    catch (error) {
        clientInitializing = false;
        clientAuthStatus = 'offline';
        latestQrCode = null;
        lastError = error.message || String(error);
        console.error('[INIT ERROR] Failed to initialize wa-automate:', error);
        throw error;
    }
    finally {
        clientInitializing = false;
    }
}
// ==================== HTTP Endpoints ====================
// Health check - no auth required
app.get('/ping', (req, res) => {
    const uptime = Date.now() - startTime;
    res.status(200).json({
        status: clientAuthStatus === 'connected' ? 'healthy' : 'initializing',
        uptime,
        message: `Service is ${clientAuthStatus}`,
    });
});
// Status endpoint - no auth required (frontend needs to check status without credentials)
app.get('/status', async (req, res) => {
    const uptime = Date.now() - startTime;
    // Try to initialize if not already done
    if (!client && !clientInitializing) {
        initializeClient().catch((e) => {
            console.error('[STATUS] Failed to initialize on status check:', e.message);
        });
    }
    res.status(200).json({
        status: clientAuthStatus,
        message: clientAuthStatus === 'connected'
            ? 'WhatsApp is ready'
            : clientAuthStatus === 'authenticating'
                ? 'Waiting for WhatsApp authentication'
                : 'WhatsApp offline or initializing',
        authenticated: clientAuthStatus === 'connected',
        uptime,
        error: lastError,
        qr: latestQrCode || undefined,
    });
});
// Send text message - requires auth
app.post('/sendText', apiKeyAuth, async (req, res) => {
    try {
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, message',
                timestamp: new Date().toISOString(),
            });
        }
        // Initialize client if not already done
        if (!client) {
            if (clientInitializing) {
                return res.status(503).json({
                    success: false,
                    error: 'Service initializing, please retry',
                    timestamp: new Date().toISOString(),
                });
            }
            console.log('[SENDTEXT] Client not initialized, initializing now...');
            await initializeClient();
        }
        if (!client || clientAuthStatus !== 'connected') {
            return res.status(503).json({
                success: false,
                error: `WhatsApp not connected. Status: ${clientAuthStatus}`,
                timestamp: new Date().toISOString(),
            });
        }
        console.log(`[SENDTEXT] Sending message to ${to}`);
        const result = await client.sendText(to, message);
        res.status(200).json({
            success: true,
            messageId: result,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[SENDTEXT ERROR]', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send message',
            timestamp: new Date().toISOString(),
        });
    }
});
// ==================== Graceful Shutdown ====================
async function gracefulShutdown(signal) {
    console.log(`\n[SHUTDOWN] Received ${signal}, gracefully shutting down...`);
    if (client) {
        try {
            console.log('[SHUTDOWN] Closing wa-automate client...');
            await client.close();
            console.log('[SHUTDOWN] wa-automate client closed');
        }
        catch (error) {
            console.error('[SHUTDOWN] Error closing client:', error);
        }
    }
    server.close(() => {
        console.log('[SHUTDOWN] Server closed');
        process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => {
        console.error('[SHUTDOWN] Forced exit after timeout');
        process.exit(1);
    }, 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// ==================== Start Server ====================
const server = app.listen(PORT, async () => {
    console.log(`\n[START] OpenWA Service listening on port ${PORT}`);
    console.log(`[START] Session data path: ${SESSION_DATA_PATH}`);
    console.log('[START] Initializing wa-automate client...\n');
    try {
        await initializeClient();
    }
    catch (error) {
        console.error('[START] Failed to initialize client:', error);
        console.log('[START] Service will retry on first request to /sendText');
    }
});
//# sourceMappingURL=index.js.map