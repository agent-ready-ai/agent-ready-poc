FROM --platform=linux/arm64 node:22-bookworm-slim

# System dependencies (no libasound2 — not needed for headless Chromium)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    jq \
  && rm -rf /var/lib/apt/lists/*

# Install gitleaks (arm64 build, hardcoded — host is Apple Silicon)
RUN curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v8.18.4/gitleaks_8.18.4_linux_arm64.tar.gz \
    | tar -xzf - -C /usr/local/bin gitleaks \
  && chmod +x /usr/local/bin/gitleaks

# Tell Puppeteer/Lighthouse to use the system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium \
    CHROME_FLAGS="--no-sandbox --disable-dev-shm-usage --disable-gpu"

# Wrangler installed globally
RUN npm install -g wrangler@latest

WORKDIR /workspace

EXPOSE 8080

CMD ["bash"]
