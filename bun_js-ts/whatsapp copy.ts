import express, { type Request, type Response } from "express";
import puppeteer, { Browser, Page } from "puppeteer";
import { unlink, readFile, exists, mkdir, writeFile } from "node:fs/promises";
import path from "path";
// @ts-ignore
import QrCode from "qrcode-reader";
import { format, isAfter, parse } from "date-fns";
import { Message, User } from "./models";
import { Jimp } from "jimp";

const router = express.Router();

const screenshotPath: string = path.join(
  __dirname,
  "public",
  "whatsapp",
  "qr.png"
);

let isMessageProcessing = false;
let context: { browser?: Browser; page?: Page } = {};

export function getBrowserContext() {
  return context;
}
export function setBrowserContext({
  browser,
  page,
}: {
  browser?: Browser;
  page?: Page;
}) {
  if (browser) context.browser = browser;
  if (page) context.browser = browser;
  return context;
}

interface QueueItem {
  task: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const newMessage = async (content: {
  phoneNumber?: string;
  contactName?: string;
  message: string;
  userId: string;
}) => {
  try {
    const message = new Message({
      ...content,
      userId: content.userId,
      timestamp: new Date(),
    });
    await message.save();
    return message;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to save message");
  }
};

interface QueueItem {
  task: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class RequestQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private isLowPriority: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicChecks();
  }

  async pause() {
    while (this.isProcessing) {
      await delay(0);
    }
    this.isLowPriority = true;
  }

  async resume() {
    while (this.isProcessing) {
      await delay(0);
    }

    this.isLowPriority = false;
  }

  private startPeriodicChecks() {
    if (!this.intervalId) {
      this.intervalId = setInterval(async () => {
        await this.performChecksAndTasks();
      }, 2000) as NodeJS.Timeout;
    }
  }

  private async performChecksAndTasks() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // await fetchUnreadMessages();

      if (this.queue.length > 0) {
        console.log("--- check task : start");
        await this.processNextTask();
        console.log("--- check task : end");
      }
    } catch (error) {
      console.error("Error in performChecksAndTasks:", error);
      await context.page?.reload({ waitUntil: "networkidle0" });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processNextTask() {
    if (this.queue.length === 0) return;

    const { task, resolve, reject } = this.queue.shift()!;

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  enqueue(task: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
    });
  }

  stopPeriodicChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

const requestQueue = new RequestQueue();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const production = process.env.ENV === "production";
async function initializeBrowser(): Promise<void> {
  try {
    context.browser = await puppeteer.launch({
      headless: production,
      userDataDir: production ? "./data" : "../browserData",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      executablePath: production ? "/usr/bin/google-chrome-stable" : undefined,
    });

    context.page = await context.browser?.newPage();
    await context.page.emulateTimezone("Asia/Calcutta");
    await context.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    );
    await context.page?.setViewport({
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
    });
    await context.page?.goto("https://web.whatsapp.com");
    console.log("Browser initialized and whatsapp Web loaded");
  } catch (error) {
    console.error("Error initializing browser:", error);
    throw error;
  }
}
let whatsappInitialized = false;

async function init() {
  if (!whatsappInitialized) {
    console.log(`Whatsapp Server is starting`);
    try {
      await initializeBrowser();
      console.log("Browser Started");
      whatsappInitialized = true;
      requestQueue;
    } catch (error) {
      console.error("Failed to start the browser:", error);
      process.exit(1);
    }
  }
}

function getCurrentDateTime(): string {
  return new Date().toLocaleString();
}

function getIPAddress(req: Request): string {
  return req.ip || req.socket.remoteAddress || "Unknown";
}

async function detectAndCropQRCode(path: string, req: Request): Promise<void> {
  try {
    const image = await Jimp.read(path);
    console.log(
      `Image dimensions: ${image.bitmap.width}x${image.bitmap.height}`
    );

    const qr = new QrCode();

    const qrResult = await new Promise<QrCode.QrCodeResult>(
      (resolve, reject) => {
        qr.callback = (err: any, value: any) =>
          err != null ? reject(err) : resolve(value);
        qr.decode(image.bitmap);
      }
    );

    if (qrResult) {
      console.log("QR Code detected!");
      console.log("Content:", qrResult.result);
      console.log("QR Code points:", JSON.stringify(qrResult.points));

      const padding = 50;
      const minX = Math.min(
        ...qrResult.points.map((p: { x: number; y: number }) => p.x)
      );
      const minY = Math.min(
        ...qrResult.points.map((p: { x: number; y: number }) => p.y)
      );
      const maxX = Math.max(
        ...qrResult.points.map((p: { x: number; y: number }) => p.x)
      );
      const maxY = Math.max(
        ...qrResult.points.map((p: { x: number; y: number }) => p.y)
      );

      const x = Math.max(0, minX - padding);
      const y = Math.max(0, minY - padding);
      const width = Math.min(image.bitmap.width - x, maxX - minX + 2 * padding);
      const height = Math.min(
        image.bitmap.height - y,
        maxY - minY + 2 * padding
      );

      console.log(
        `Crop dimensions: x=${x}, y=${y}, width=${width}, height=${height}`
      );

      if (width <= 0 || height <= 0) {
        throw new Error(
          `Invalid crop dimensions: width=${width}, height=${height}`
        );
      }

      const croppedImage = image.clone().crop({ x, y, w: width, h: height });

      const extraSpace = 50;
      const newHeight = croppedImage.bitmap.height + extraSpace;
      const finalImage = new Jimp(
        croppedImage.bitmap.width,
        newHeight,
        0xffffffff
      );
      finalImage.composite(croppedImage, 0, 0);

      const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
      const dateTime = getCurrentDateTime();
      const ipAddress = getIPAddress(req);
      const text = `${dateTime} - IP: ${ipAddress}`;
      finalImage.print(font, 10, newHeight - 40, text);

      await finalImage.writeAsync(path);
      console.log("Cropped QR code with additional info saved to:", path);
    } else {
      console.log("No QR code detected in the image.");
    }
  } catch (error: any) {
    console.error("An error occurred:", error?.message);
  }
}

async function isLoggedIn(): Promise<boolean> {
  if (!context.page) return false;
  await context.page?.waitForNetworkIdle({ timeout: 5000 });
  try {
    await context.page?.waitForSelector('[aria-label="Chats"]', {
      timeout: 500,
    });
    return true;
  } catch {
    return false;
  }
}

async function waitForQRLogin(req: Request): Promise<boolean> {
  let lastQRCode = "";
  while (true) {
    try {
      if (!context.page) throw new Error("Page not initialized");
      const qrCodeSelector = "div[data-ref]:has(canvas)";
      await context.page?.waitForSelector(qrCodeSelector, { timeout: 5000 });
      const currentQRCode = await context.page?.$eval(
        qrCodeSelector,
        (el: Element) => (el as HTMLDivElement).dataset.ref || ""
      );
      if (currentQRCode !== lastQRCode) {
        lastQRCode = currentQRCode;
        await takeQRCode(req);
        console.log("New QR code detected, updated screenshot");
      }
    } catch (error) {
      console.log("QR code not found, checking if logged in : ", error);
      if (await isLoggedIn()) {
        console.log("Successfully logged in via QR code");
        await deleteScreenshot();
        return true;
      }
    }
    await delay(1000);
  }
}

export async function sendWhatsappMessage(data: {
  message: string;
  phoneNumber: string;
}): Promise<void> {
  const { message, phoneNumber } = data;

  if (!phoneNumber) {
    throw new Error("Either contactName or phoneNumber is required");
  }

  if (!(await isLoggedIn())) {
    throw new Error("WhatsApp not logged in");
  }

  try {
    await openPhone(phoneNumber);
    await sendMessage(message);
    console.log("Message sent successfully!");
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

async function openPhone(phoneNumber?: string): Promise<void> {
  if (!phoneNumber) return;
  try {
    if (!context.page) throw new Error("Page not initialized");
    const url = `https://web.whatsapp.com/send?phone=${phoneNumber}`;
    await context.page?.goto(url, { waitUntil: "networkidle0" });
    await context.page?.waitForNavigation();
    await context.page?.waitForNetworkIdle();
  } catch (error) {
    console.log(error);
    throw new Error("Cannot open Phone Number.");
  }
}

async function sendMessage(message: string): Promise<void> {
  try {
    if (!context.page) throw new Error("Page not initialized");
    await context.page?.waitForSelector('[aria-placeholder="Type a message"]');
    await context.page?.type('[aria-placeholder="Type a message"]', message, {
      delay: 5,
    });
    await context.page?.keyboard.press("Enter");
    await context.page?.waitForNetworkIdle({ timeout: 2000 });
  } catch (error) {
    console.log(error);
    throw new Error("Message was not sent.");
  }
}

async function deleteScreenshot(): Promise<void> {
  try {
    await unlink(screenshotPath);
    console.log("QR code screenshot deleted");
  } catch (error) {
    console.error("Couldn't delete screenshot");
  }
}

async function takeQRCode(req: Request): Promise<string> {
  try {
    if (!context.page) throw new Error("Page not initialized");
    await context.page?.waitForSelector(".landing-main", { timeout: 15000 });
    await context.page?.waitForSelector("canvas", { timeout: 10000 });
    console.log("Taking Screenshot");
    await context.page?.screenshot({ path: screenshotPath });
    console.log("Took screenshot");
    await detectAndCropQRCode(screenshotPath, req);
    return "/whatsapp/qr.png";
  } catch (error) {
    console.log(error);
    throw error;
  }
}

router.get("/login", async (req: Request, res: Response) => {
  try {
    console.log("Is Logging in!");
    if (await isLoggedIn()) {
      console.log("Log in done");
      res.json({
        success: false,
        message: "Already logged in",
        data: { isLoggedIn: true },
      });
      return;
    }

    console.log("Log in unsuccessfull");

    const qrCodeUrl = await takeQRCode(req);

    console.log("took QR Code");
    res.json({
      success: true,
      message: "Log via QR code",
      data: { qrCodeUrl },
    });
    await waitForQRLogin(req);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export function addMessageToQueue(data: {
  message: string;
  userId: string;
}): void {
  requestQueue.enqueue(async () => {
    const savedMessage = await newMessage(data);
    try {
      const user = await User.findById(data.userId);
      if (!user) return;
      const phoneNumber = user.phone as string;

      await sendWhatsappMessage({
        phoneNumber,
        message: data.message,
      });
      savedMessage.failed = false;
      await savedMessage.save();
    } catch (error: any) {
      console.error("Error sending message:", error);
      const screenshot = "/" + Date.now() + ".png";
      const screenshotPath = "./public/whatsapp/errors/" + screenshot;
      await context.page?.screenshot({ path: screenshotPath });
      savedMessage.screen = screenshot;
      savedMessage.error = error.message || String(error);
      await savedMessage.save();
      await context.page?.reload({ waitUntil: "networkidle0" });
    }
  });
}

router.get("/failed-messages", async (req: Request, res: Response) => {
  const failedMessages = await Message.find({ failed: true }).populate(
    "userId"
  );
  res.json({ success: true, data: { failedMessages } });
});

router.post("/retry-failed-messages", async (req: Request, res: Response) => {
  let messages = { failed: 0, success: 0 };
  let failedMessages = [];
  try {
    failedMessages = (await Message.find({
      failed: true,
    })) as any[];

    for (const failedMessage of failedMessages) {
      try {
        await sendWhatsappMessage({
          message: failedMessage.message,
          phoneNumber: failedMessage.phoneNumber,
        });
        messages.success++;
        failedMessage.failed = false;
        await failedMessage.save();
        console.log(`Message ${failedMessage._id} sent successfully on retry!`);
      } catch (error: any) {
        messages.failed++;
        console.error(
          `Error sending failed message ${failedMessage._id} on retry:`,
          error
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Finished retrying all failed messages");
    res.json({
      success: true,
      message:
        "Retried All; recieved success : " +
        messages.success +
        ", failed : " +
        messages.failed,
      data: { totalMessages: failedMessages.length },
    });
  } catch (error: any) {
    console.error("Error in retry-failed-messages route:", error);
    res.json({
      success: true,
      message: "Couldn't retry all failed messages",
      data: { totalMessages: failedMessages.length },
    });
  }
});

router.get("/api-status", async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API is operational",
    data: {
      whatsappInitialized,
      isLoggedIn: await isLoggedIn(),
    },
  });
});

router.post("/logout", async (req: Request, res: Response) => {
  try {
    if (!context.page) {
      res.status(400).json({ success: false, message: "Not logged in" });
      return;
    }
    await context.page?.waitForNetworkIdle({ timeout: 10000 });
    await context.page?.waitForSelector('div[aria-label="Menu"]', {
      timeout: 1000,
    });
    await context.page?.click('div[aria-label="Menu"]');
    await delay(1000);
    await context.page?.waitForSelector('div[aria-label="Log out"]', {
      timeout: 1000,
    });
    await context.page?.click('div[aria-label="Log out"]');
    await delay(1000);
    await context.page?.waitForSelector(
      'div[aria-label="Log out?"] button:nth-of-type(2)',
      { timeout: 1000 }
    );
    await context.page?.click(
      'div[aria-label="Log out?"] button:nth-of-type(2)'
    );
    await context.page?.waitForNetworkIdle({ timeout: 10000 });
    whatsappInitialized = false;
    await context.browser?.close();
    context = {};

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ success: false, message: "Couldn't logout" });
  }
});

router.post("/reload", async (req: Request, res: Response) => {
  try {
    if (context.page) {
      await context.page?.reload({ waitUntil: "networkidle0" });
      res.json({ success: true, message: "Page reloaded successfully" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "No active page to reload" });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/send-test-message", async (req: Request, res: Response) => {
  const { phoneNumber, contactName, message } = req.body;

  if (!phoneNumber && !contactName) {
    res.status(400).json({
      success: false,
      message: "Phone number or contact name is required",
    });
    return;
  }

  if (!(await isLoggedIn())) {
    res.status(400).json({ success: false, message: "WhatsApp not logged in" });
    return;
  }

  try {
    let userId = "";
    const alreadyUser = await User.findOne({ phone: phoneNumber });

    if (alreadyUser) {
      userId = alreadyUser._id.toString();
    } else {
      const user = new User({
        phone: phoneNumber,
      });
      await user.save();
      userId = user._id.toString();
    }
    addMessageToQueue({ message, userId });
    res.json({ success: true, message: "Sent test message." });
  } catch (error: any) {
    res.json({
      success: true,
      message: `Failed to send test message : ${error.message}`,
    });
    await context.page?.reload({ waitUntil: "networkidle0" });
  } finally {
  }
});

router.get("/screenshot", async (req: Request, res: Response) => {
  try {
    context.page?.evaluate(() => {
      document.body.style.zoom = "0.75";
    });
    const screenshotPath = "/whatsapp/screenshot.png";
    await context.page?.screenshot({ path: `./public${screenshotPath}` });

    res.send({ success: true, data: { screenshotPath } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

process.on("SIGINT", async () => {
  console.log("Closing browser and shutting down server...");
  requestQueue.stopPeriodicChecks();
  if (context.browser) {
    try {
      await context.browser.close();
      console.log("Browser closed successfully");
    } catch (error) {
      console.error("Error closing browser:", error);
    }
  }
  process.exit();
});

init();

export default router;
