# WhatsApp Action Testing Dashboard

A modern Next.js dashboard designed to trigger manual scenario test messages via a remote **Open WA EASY API** instance.

## 🏗️ Architecture Design & Decisions

This project is built using a decoupled, production-minded structure:
1. **Next.js Dashboard UI (Vercel):** A highly aesthetic glassmorphic dark UI that manages user interactions.
2. **Open WA EASY API Service (Node Backend):** A local or self-hosted persistent Node backend running the embedded runtime with a Puppeteer browser hosting the actual WhatsApp connection.

### 🛡️ Why HTTP was chosen over SocketClient for Vercel
Vercel's Serverless environment is ephemeral—functions spin up to serve a request and sleep immediately after. Maintaining a stateful WebSocket connection (`SocketClient`) in a serverless environment is an anti-pattern and highly unreliable, leading to dropped connection frames and thread freezing.

Instead, our Next.js Route Handlers call the Node Backend Open WA instance over **stateless HTTP endpoints** (e.g. `POST /sendText`). This fits Vercel perfectly, keeps execution memory extremely thin, prevents socket disconnections, and allows graceful handling of backend initialization states.

---

## 📁 File Structure

```
├── app/
│   ├── api/
│   │   ├── whatsapp/
│   │   │   ├── send/
│   │   │   │   └── route.ts        # Serverless route mapping scenarios to targets
│   │   │   └── status/
│   │   │       └── route.ts        # Health check router with forced dynamic check
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── page.tsx                # Glassmorphic client-side dashboard UI
├── components/
│   └── dashboard/
│       ├── action-card.tsx         # Trigger card with loading & feedback logic
│       └── status-card.tsx         # Connection status & Node Backend specs monitor
├── lib/
│   └── whatsapp/
│       ├── config.ts               # Env loading, validation, and string masking
│       ├── service.ts              # Fetch wrapper with timeouts & wake-up helpers
│       ├── templates.ts            # Message payload compiler with dynamic timestamp
│       └── types.ts                # TypeScript interfaces & status states
├── .env.example                    # Sample configurations for developers
├── Dockerfile.openwa               # Render-ready Puppeteer container
└── README.md                       # Comprehensive deployment & setup playbook
```

---

## 🚀 Running the Open WA EASY API (Node Backend WhatsApp Layer)

The Node backend is a standalone Express service located in the `openwa-service` directory. It wraps `@open-wa/wa-automate` and Puppeteer/headless Chrome to execute the embedded runtime.

### Local Setup & Execution
1. Navigate to the backend directory:
   ```bash
   cd openwa-service
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run the service (set your preferred `PORT` and `API_KEY`):
   ```bash
   PORT=8080 API_KEY=your_secure_api_key npm start
   ```
   *(Alternatively, run in development mode with `npm run dev`)*

### Verify the Node Backend is Running
Open another terminal or browser tab and check:
```bash
curl http://localhost:8080/ping
curl http://localhost:8080/status
```

Expected behavior:
* `/ping` returns a simple `{ "status": "ok" }` or similar backend status.
* `/status` returns the connection state of the WhatsApp client (e.g. `'authenticating'`, `'connected'`, `'unreachable'`).

### Scan the QR Code to Bootstrap WhatsApp
1. On its first run, the Node backend launches Puppeteer and attempts to authenticate with WhatsApp.
2. Look at the terminal stdout where you started `openwa-service`. An ASCII QR Code will be printed directly in the console.
3. Open WhatsApp on your phone -> Go to **Linked Devices** -> **Link a Device** -> Scan the ASCII QR code from your terminal.
4. Once scanned, the session credentials will be saved in the `openwa-service/session` folder, keeping you logged in for future server restarts.

*(Note: Docker configuration is available via `Dockerfile.openwa` for production containerization.)*

---

## ⚡ Deploying the Next.js Dashboard to Vercel (UI Layer)

Vercel is optimized to host the Next.js dashboard completely serverless.

### Step 1: Initialize Vercel Project
1. Log into [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your Git repository.

### Step 2: Configure Environment Variables
Under **Environment Variables**, add the following keys:
| Environment Variable | Example Value | Description |
| :--- | :--- | :--- |
| `WHATSAPP_ENABLED` | `true` | Enables/Disables dashboard actions |
| `OPENWA_BASE_URL` | `http://localhost:8080` | Exclude trailing slash. Must point to the Node Backend Open WA service root, not your Next.js frontend URL. |
| `OPENWA_API_KEY` | `your_custom_secret_key` | Must exactly match `API_KEY` set on the Node Backend |
| `WHATSAPP_MY_NUMBER` | `1234567890` | Personal target number (numbers only, country code first) |
| `WHATSAPP_UPDATES_GROUP_ID` | `1234567890-14839284@g.us` | The group chat ID where updates go |
| `WHATSAPP_TEST_CLIENT_ID` | `1987654321` | Private message client target chat ID or phone number |

### Step 3: Deploy
Click **Deploy**. Next.js will build and configure the API routes dynamically.

---

## ⚡ WhatsApp Session Management & Graceful Recovery

> [!NOTE]
> When the Node Backend starts up, it takes a few moments to initialize the Puppeteer/Chromium instance and establish a connection to WhatsApp.

### How the Dashboard Handles This:
1. **Dynamic Health Indicator:** On page load, the dashboard pings the backend. If the backend is initializing, the status card turns orange, indicating **"Waking Up / Initializing"**.
2. **User Guidance:** The status card displays notices that the Node backend is launching the WhatsApp client browser and prompts the user to refresh status.
3. **Status Sync:** Once the client connects to WhatsApp, refreshing the page updates the status card to green, showing **"Active & Connected"** with response latency stats.
4. **Thin Proxies:** The dashboard masks all target configurations, keeping keys server-side in Next.js to protect sensitive contact numbers from client inspection.

---

## 📋 Full Test Checklist
Before sharing with team members, complete these steps to verify your system:
- [ ] Run `npm run build` in both the root folder and `openwa-service` to verify TypeScript compilation.
- [ ] Start the backend service (`npm start` or `npm run dev`) and scan the ASCII QR code if prompt is shown.
- [ ] Start the Next.js frontend and verify that all environment variables are mapped correctly.
- [ ] Access the frontend dashboard; verify the Status Card loads and shows the masked Node Backend URL.
- [ ] Click **System Ping Test** -> Verify WhatsApp message arrives on your phone within seconds.
- [ ] Click **Send Test Message to Me** -> Confirm delivery and dynamic timestamp layout.
- [ ] Click **Registration Alert Simulation** -> Confirm lead details format in chat.
- [ ] Click **Client Update Broadcast to Group** -> Confirm the message propagates to your client group channel.
- [ ] Click **Private Client Progress Update** -> Confirm isolated recipient delivery.
- [ ] Verify error states by changing the `OPENWA_API_KEY` to an invalid string and observing the card display "Unauthorized" or connection errors gracefully.
