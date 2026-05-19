# WhatsApp Action Testing Dashboard

A modern Next.js dashboard designed to trigger manual scenario test messages via a remote **Open WA EASY API** instance.

## 🏗️ Architecture Design & Decisions

This project is built using a decoupled, production-minded structure:
1. **Next.js Dashboard UI (Vercel):** A highly aesthetic glassmorphic dark UI that manages user interactions.
2. **Open WA EASY API Service (Render):** An always-on or semi-persistent Puppeteer browser runtime hosting the actual WhatsApp connection.

### 🛡️ Why HTTP was chosen over SocketClient for Vercel
Vercel's Serverless environment is ephemeral—functions spin up to serve a request and sleep immediately after. Maintaining a stateful WebSocket connection (`SocketClient`) in a serverless environment is an anti-pattern and highly unreliable, leading to dropped connection frames and thread freezing.

Instead, our Next.js Route Handlers call the Render Open WA instance over **stateless HTTP endpoints** (e.g. `POST /sendText`). This fits Vercel perfectly, keeps execution memory extremely thin, prevents socket disconnections, and allows graceful handling of Render free-tier wake-up cycles.

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
│       └── status-card.tsx         # Connection status & Render specs monitor
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

## 🚀 Deploying the Open WA EASY API to Render (WhatsApp Layer)

Render's standard Node environment lacks the system libraries required to run Puppeteer/headless Chrome. **Docker is the bulletproof solution** to ensure all Chromium dependencies are present.

### Step 1: Create a Render Web Service
1. Sign in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository containing this project.

### Step 2: Configure Build Settings
Under the service details, set the following options:
* **Runtime:** `Docker`
* **Docker Context:** `.` (root directory)
* **Dockerfile Path:** `Dockerfile.openwa` (This points to our preconfigured chromium container)
* **Instance Type:** `Free` (or higher)

### Step 3: Add Environment Variables
Click the **Environment** tab in your Render service and add:
* `PORT`: `8080` (Render defaults to routing here)
* `API_KEY`: `your_custom_secret_key` (This is the authorization key the Next.js app will use)

### Step 4: Scan the QR Code to Bootstrap WhatsApp
1. Once deployed, Open WA will attempt to boot Chrome and generate a QR Code.
2. Click the **Logs** tab in Render.
3. Look for the ASCII QR Code printed directly in the log screen.
4. Open WhatsApp on your phone -> Go to **Linked Devices** -> **Link a Device** -> Scan the ASCII QR code from your Render console.
5. Alternatively, if you enabled `--popup` or check logs, the session file will save inside the docker volume, keeping you logged in.

*Note: The first connection registers the session. On subsequent container spins (even after cold starts), Open WA will automatically restore your session!*

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
| `OPENWA_BASE_URL` | `https://your-openwa-service.onrender.com` | Exclude trailing slash (The URL of your Render Service) |
| `OPENWA_API_KEY` | `your_custom_secret_key` | Must exactly match `API_KEY` set on Render |
| `WHATSAPP_MY_NUMBER` | `1234567890` | Personal target number (numbers only, country code first) |
| `WHATSAPP_UPDATES_GROUP_ID` | `1234567890-14839284@g.us` | The group chat ID where updates go |
| `WHATSAPP_TEST_CLIENT_ID` | `1987654321` | Private message client target chat ID or phone number |

### Step 3: Deploy
Click **Deploy**. Next.js will build and configure the API routes dynamically.

---

## ❄️ Render Free Tier Cold Starts & Graceful Recovery

> [!NOTE]
> Render's free tier web services spin down after **15 minutes of inactivity**. When a new HTTP request is received, it triggers a cold start, which takes **50 to 90 seconds** to boot Chromium and start the API.

### How the Dashboard Handles This:
1. **Dynamic Health Indicator:** On page load, the dashboard pings Render. If Render is asleep, the request will hit a 5s timeout. The status card immediately turns orange, indicating **"Waking Up... (Render Cold Start)"**.
2. **User Guidance:** The status card displays instructions informing the user that Render is waking up and provides a **Check Status** button to let them recheck.
3. **Optimistic Retry Logs:** Pinging the service automatically boots the Render container. Once fully awake, refreshing the page turns the indicator green, showing **"Active & Connected"** with response latency stats.
4. **Thin Proxies:** The dashboard masks all target configurations, keeping keys server-side in Vercel to protect sensitive contact numbers from client inspection.

---

## 📋 Full Test Checklist
Before sharing with team members, complete these steps to verify your system:
- [ ] Run `npm run build` locally to verify TypeScript compilation.
- [ ] Deploy Render container and verify WhatsApp logs say "Session logged in".
- [ ] Deploy Next.js to Vercel and check that all environment variables are mapped.
- [ ] Access the Vercel Dashboard; verify the Status Card loads and shows the masked Render host.
- [ ] Click **System Ping Test** -> Verify WhatsApp message arrives on your phone within seconds.
- [ ] Click **Send Test Message to Me** -> Confirm delivery and dynamic timestamp layout.
- [ ] Click **Registration Alert Simulation** -> Confirm lead details format in chat.
- [ ] Click **Client Update Broadcast to Group** -> Confirm the message propagates to your client group channel.
- [ ] Click **Private Client Progress Update** -> Confirm isolated recipient delivery.
- [ ] Verify error states by changing the Render API Key to an invalid string and observing the card display "Unauthorized" error codes gracefully without crashing.
