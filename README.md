# WhatsApp Action Testing Dashboard

A modern Next.js dashboard with a single persistent Node.js/TypeScript backend running an **embedded WhatsApp runtime** powered by `@open-wa/wa-automate`.

---

## 🏗️ Architecture Design & Decisions

This project is built using a consolidated, single-process architecture:
1. **Embedded Runtime:** The WhatsApp automation engine and the Puppeteer/headless browser run directly in-memory within the Next.js Node.js server process.
2. **In-Memory Communication:** Message sending and status tracking occur via direct function calls, eliminating intermediate HTTP hops, API gateways, or Webhook delays.
3. **Development Hot-Reload Protection:** Uses a `globalThis` singleton guard to prevent Next.js developmental compile events from spawning multiple browser instances and leaking system memory.

### 🛡️ Why Persistent Hosting is Required (Instead of Vercel)
Vercel is a serverless platform where functions are ephemeral, short-lived, and lack persistent storage. An embedded runtime requires:
* Spawning a long-running, persistent headless Chromium process.
* Direct access to system libraries (`libxss1`, etc.) to run Chrome.
* Persistent storage volumes to save session credential JSON files so that QR codes do not need to be scanned on every boot.

Therefore, this application **must** be deployed on a persistent container or VM host (such as Render, Railway, Fly.io, or any VPS) using the provided root [Dockerfile](file:///e:/OpenWA-test/Dockerfile).

---

## 📁 File Structure

```
├── app/
│   ├── api/
│   │   └── whatsapp/
│   │       ├── send/
│   │       │   └── route.ts        # Route handler for direct in-process message dispatching
│   │       └── status/
│   │           └── route.ts        # Health check & lazy-bootstrap trigger endpoint
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                    # Glassmorphic client-side dashboard UI
├── components/
│   └── dashboard/
│       ├── action-card.tsx         # Scenario trigger card with loading & feedback logic
│       └── status-card.tsx         # Connection status & embedded engine specs monitor
├── lib/
│   └── whatsapp/
│       ├── bootstrap.ts            # Client lifecycle, event attachment & process signal hooks
│       ├── client.ts               # Core singleton wrapper with globalThis guard
│       ├── config.ts               # Env loading, config parsing & string masking
│       ├── handlers.ts             # Inbound text message responder & outbound dispatcher
│       ├── session-store.ts        # Session persistence config
│       ├── templates.ts            # Message templates with dynamic UTC timestamps
│       └── types.ts                # TypeScript interfaces and Status unions
├── .env.example                    # Sample configurations for developers
├── Dockerfile                      # Production multi-stage build (Next.js + Puppeteer-Chrome)
└── README.md                       # Complete configuration & execution guide
```

---

## 🚀 Local Setup & Execution

### 1. Configure Environment Variables
Copy `.env.example` into a new file `.env` at the root directory:
```bash
cp .env.example .env
```

Edit the `.env` file with your config:
```ini
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_HEADLESS=true

# Test Target Numbers (Numbers only, country code first, e.g., 447700900077)
WHATSAPP_MY_NUMBER=your_personal_phone_number
WHATSAPP_UPDATES_GROUP_ID=your_target_group_chat_id
WHATSAPP_TEST_CLIENT_ID=your_test_client_phone_number
```

### 2. Install Dependencies
Install all package dependencies in the workspace root:
```bash
npm install --legacy-peer-deps
```

### 3. Run in Development Mode
Start the Next.js local development server:
```bash
npm run dev
```

### 4. Trigger Initialization & Scan QR Code
1. Open the dashboard at `http://localhost:3000`.
2. On page load, the frontend will call `/api/whatsapp/status`, which dynamically triggers the WhatsApp initialization process in the background.
3. Check your terminal: an **ASCII QR Code** will be printed directly in the console. Alternatively, the status card on the UI will display a renderable QR Code image once loaded.
4. Open WhatsApp on your phone -> Go to **Linked Devices** -> **Link a Device** -> Scan the QR code.
5. Once scanned, session keys are stored locally (in `./sessions`), keeping you logged in across restarts.

---

## 🐳 Docker Production Deployment

To package and deploy the consolidated application:

1. **Build the Docker Image:**
   ```bash
   docker build -t whatsapp-dashboard .
   ```
2. **Run the Container with Persistent Sessions:**
   Mount a local directory to preserve WhatsApp logins across container rebuilds:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v $(pwd)/sessions:/app/sessions \
     --env-file .env \
     --name whatsapp-dashboard-app \
     whatsapp-dashboard
   ```

The root [Dockerfile](file:///e:/OpenWA-test/Dockerfile) uses a multi-stage compilation pipeline, installs all necessary Debian system libraries for headless Chromium execution, and sets `PUPPETEER_EXECUTABLE_PATH` to ensure Puppeteer runs correctly inside Linux.

---

## 🚀 Hosting on Render (Production Deployment)

Render is an excellent hosting platform that allows you to deploy Docker containers directly. Because our application spawns an in-process Puppeteer browser, you must deploy using Render's **Docker** environment (which automatically builds using the root `Dockerfile`).

### Step-by-Step Render Setup

1. **Create a New Web Service:**
   * Go to your [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
   * Connect your GitHub repository containing this project.

2. **Configure Service Settings:**
   * **Name:** `whatsapp-action-dashboard`
   * **Runtime:** Select **Docker** (Render will automatically detect and build the root `Dockerfile`).
   * **Instance Type:** Select **Starter** or higher (running headless Puppeteer/Chromium reliably requires at least 512MB-1GB RAM. We recommend 1GB RAM minimum).

3. **Configure Environment Variables:**
   Under the **Environment** tab, add the following variables:
   * `WHATSAPP_ENABLED` = `true`
   * `WHATSAPP_SESSION_PATH` = `/app/sessions` (Must match the container path)
   * `WHATSAPP_HEADLESS` = `true`
   * `WHATSAPP_MY_NUMBER` = `[your phone number]`
   * `WHATSAPP_UPDATES_GROUP_ID` = `[your target group ID]`
   * `WHATSAPP_TEST_CLIENT_ID` = `[your test client ID]`
   * `PORT` = `3000`

4. **Set Up a Persistent Disk (Crucial for Session Storage):**
   Render containers have ephemeral filesystems. If you do not attach a persistent volume, your WhatsApp login state will be deleted every time your service restarts or redeploys, forcing you to scan the QR code again.
   * Go to the **Disks** tab of your Render Web Service.
   * Click **Add Disk**.
   * **Name:** `whatsapp-sessions-volume`
   * **Mount Path:** `/app/sessions`
   * **Size:** `1 GB` (More than enough for storing text session keys)

5. **Deploy the Web Service:**
   * Click **Create Web Service**. Render will pull the code, execute the multi-stage Docker build, set up the Chromium libraries, mount the persistent disk, and start the app.
   * Once live, navigate to the web service URL, open the dashboard to trigger lazy-bootstrap, and scan the QR code to authenticate.

---

## 📋 Full Test Checklist

Verify the consolidated implementation using the checklist below:
- [x] Run `npx tsc --noEmit` in the root folder to verify complete TypeScript type safety.
- [ ] Start the Next.js development server (`npm run dev`) and monitor console logs.
- [ ] Access the dashboard at `http://localhost:3000`; confirm that the status card transition moves to `'authenticating'` and displays the QR code.
- [ ] Scan the QR code with your phone and ensure the status card turns green, reading `"Active & Connected"`.
- [ ] Restart your development server; confirm that the client logs in automatically without requiring another QR scan.
- [ ] Click **Send Test Message to Me** -> Confirm delivery and dynamic timestamp layout on your phone.
- [ ] Click **Registration Alert Simulation** -> Confirm lead details format in chat.
- [ ] Click **Client Update Broadcast to Group** -> Confirm the message propagates to your client group channel.
- [ ] Click **Private Client Progress Update** -> Confirm isolated recipient delivery.
- [ ] Send `ping` to your WhatsApp account from another device -> Confirm that the automatic event listener responds with `pong`.
