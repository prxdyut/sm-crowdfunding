import puppeteer, { Browser, Page } from "puppeteer";
import { Message, User } from "./models";

let context: { browser?: Browser; page?: Page } = {};

// Improved RequestQueue with better error handling and logging
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;

  async enqueue(task: () => Promise<void>): Promise<void> {
    this.queue.push(task);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error("Error processing task:", error);
          // Implement retry logic or error reporting here
        }
      }
    }

    this.isProcessing = false;
  }
}

const requestQueue = new RequestQueue();

// Improved browser initialization with retry logic
async function initializeBrowser(retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const production = process.env.ENV === "production";
      context.browser = await puppeteer.launch({
        headless: production,
        userDataDir: production ? "./data" : "../browserData",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
        executablePath: production
          ? "/usr/bin/google-chrome-stable"
          : undefined,
      });
      context.page = await context.browser.newPage();
      await context.page.goto("https://web.whatsapp.com", {
        waitUntil: "networkidle0",
      });
      context.page.on("dialog", async (dialog) => {
        console.log(dialog.message());
        await dialog.accept();
      });
      console.log("Browser initialized and WhatsApp Web loaded");
      return;
    } catch (error) {
      console.error(`Error initializing browser (attempt ${i + 1}):`, error);
      if (i === retries - 1) throw error;
    }
  }
}

// Improved login check with timeout
async function isLoggedIn(timeout = 5000): Promise<boolean> {
  if (!context.page) return false;
  try {
    await context.page.waitForSelector('[aria-label="Chats"]', { timeout });
    return true;
  } catch {
    return false;
  }
}

// Improved QR code generation with error handling
async function generateQRCode(): Promise<string> {
  if (!context.page) throw new Error("Page not initialized");
  try {
    await context.page.waitForSelector("canvas", {
      timeout: 30000,
    });
    await context.page.screenshot({ path: "./public/whatsapp/qr.png" });
    return `/assets/whatsapp/qr.png`;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

const delay = (delayInms) => {
  return new Promise((resolve) => setTimeout(resolve, delayInms));
};

// Improved message sending function with retry logic
async function sendWhatsappMessage(
  phoneNumber: string,
  message: string,
  retries = 3
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      if (!context.page) throw new Error("Page not initialized");
      await context.page.goto(
        `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(
          message
        )}`,
        { waitUntil: "networkidle0" }
      );
      await context.page.waitForSelector(
        '[aria-placeholder="Type a message"]',
        { timeout: 5000 }
      );
      await delay(2000);
      await context.page.type('[aria-placeholder="Type a message"]', "\n");
      await context.page.waitForNetworkIdle();
      await delay(10000);
      console.log(`Message sent to ${phoneNumber}`);
      return;
    } catch (error) {
      console.error(`Error sending message (attempt ${i + 1}):`, error);
      if (i === retries - 1) throw error;
    }
  }
}

// Improved addMessageToQueue function with better error handling
export async function addMessageToQueue(data: {
  message: string;
  userId: string;
}): Promise<void> {
  await requestQueue.enqueue(async () => {
    const savedMessage = await new Message({
      ...data,
      timestamp: new Date(),
    }).save();

    try {
      const user = await User.findById(data.userId);

      if (!user || !user.phone)
        throw new Error("User not found or phone number missing");

      await sendWhatsappMessage(user.phone, data.message);

      savedMessage.failed = false;
      await savedMessage.save();
    } catch (error: any) {
      console.error("Error sending message:", error);
      savedMessage.failed = true;
      savedMessage.error = error.message || String(error);
      await savedMessage.save();
      // Implement notification or alerting system here
    }
  });
}

// Improved logout function
async function logout(): Promise<void> {
  if (!context.page) throw new Error("Not logged in");
  try {
    await context.page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("wawc");
    });
    await context.browser?.close();
    context = {};
    console.log("Logged out successfully");
  } catch (error) {
    console.error("Error during logout:", error);
    throw error;
  }
}

// Function to retry failed messages
async function retryFailedMessages(): Promise<{
  success: number;
  failed: number;
}> {
  const failedMessages = await Message.find({ failed: true }).populate(
    "userId"
  );
  let success = 0;
  let failed = 0;

  for (const message of failedMessages) {
    try {
      if (!message.userId || !message.userId.phone) {
        throw new Error("User or phone number missing");
      }
      await sendWhatsappMessage(message.userId.phone, message.message);
      message.failed = false;
      await message.save();
      success++;
    } catch (error) {
      console.error(`Failed to retry message ${message._id}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

export {
  initializeBrowser,
  isLoggedIn,
  generateQRCode,
  sendWhatsappMessage,
  logout,
  retryFailedMessages,
};
