# Use the Bun.js image
FROM oven/bun:latest

# Install required packages
RUN apt-get update && \
    apt-get install -y wget gnupg

# Install Google Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lockb if you have it
COPY package.json /app

# Install dependencies using Bun
RUN bun install
RUN bun add -g nodemon

# Copy the rest of the application code
COPY . .

# Expose port 6969
EXPOSE 3000

# Set environment variables for Puppeteer and Chrome
ENV CHROME_PATH=/usr/bin/google-chrome-stable
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Run the application
CMD ["bun", "run", "start"]
