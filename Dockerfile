# Stage 1: Build the Next.js application
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Production runtime environment
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies required for headless Chromium/Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome Stable to run WhatsApp automation
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to bypass downloading Chromium and use the installed package
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy files required to run Next.js
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/app ./app

# Create session persistence volume
RUN mkdir -p /app/sessions
ENV WHATSAPP_SESSION_PATH=/app/sessions
VOLUME /app/sessions

EXPOSE 3000

# Start Next.js server in persistent mode
CMD ["npm", "start"]
