import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { Button, Message, User } from "./models";
import {
  addMessageToQueue,
  generateQRCode,
  initializeBrowser,
  isLoggedIn,
  retryFailedMessages,
  sendWhatsappMessage,
} from "./whatsapp";

const app = express();
const port = 3000;

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/myapp";

mongoose.connect(MONGODB_URI);
initializeBrowser().then(console.log);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());
app.use("/api/assets", express.static("public"));
const contributionMessage = (name, amount) =>
  `Hello! ${name}, \nYour contribution of ₹${amount} has been recorded you will be notified once it is verified`;
const bankMessage = (name, amount) =>
  `Hello! ${name}, \nUnfortunately we cant process Your contribution of ₹${amount} as this big amount is not acceptable through upi`;
const maxAmount = 100;

app.post("/api/new", async (req, res) => {
  try {
    const { name, phone, email, amount, timestamp, reference } = req.body;
    if (!name || !phone || !email || !amount) throw Error("Form Invalid");
    console.log("Received Data : ", { name, phone, email, amount });

    const message =
      amount < maxAmount
        ? contributionMessage(name, amount)
        : bankMessage(name, amount);

    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ name, email, phone });
      await user.save();
    }

    await User.updateOne(
      { _id: user._id },
      {
        $push: {
          contributions: {
            amount,
            timestamp,
            reference,
          },
        },
      }
    );

    await addMessageToQueue({
      message,
      userId: user._id.toString(),
    });

    res.status(201).json(user.contributions[user.contributions.length - 1]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/bank-transfer", async (req, res) => {
  try {
    const { name, phone, email, amount, timestamp, reference } = req.body;
    if (!name || !phone || !email || !amount) throw Error("Form Invalid");

    console.log("Received Data : ", { name, phone, email, amount });

    const message = `Hello! ${name}, \nHere comes your bank details`;

    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ name, email, phone });
      await user.save();
    }

    await addMessageToQueue({
      message,
      userId: user._id.toString(),
    });

    res.status(201).json(user.contributions[user.contributions.length - 1]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/login", async (req, res) => {
  try {
    if (await isLoggedIn()) {
      res.json({ message: "Already Loggedin" });
      return;
    } else {
      const qrCode = await generateQRCode();
      res.json({ qrCode });
    }
  } catch (e: any) {
    res.json({ message: e.message });
  }
});
app.post("/api/buttons", async (req, res) => {
  try {
    const { label, action } = req.body;
    const newButton = new Button({ label, action });
    await newButton.save();
    res.status(201).json(newButton);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/buttons", async (req, res) => {
  try {
    const buttons = await Button.find();
    res.json(buttons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/buttons/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Button.findByIdAndDelete(id);
    res.json({ message: "Button deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get("/api/data", async (req, res) => {
  try {
    const allUsers = await User.find();
    const allData = allUsers.flatMap((user) =>
      user.contributions
        .filter((contribution) => !contribution.removed)
        .map((contribution) => ({
          _id: contribution._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          amount: contribution.amount,
          timestamp: contribution.timestamp,
          verified: contribution.verified,
          reference: contribution.reference,
          userId: user._id,
        }))
    );
    res.json(allData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/public-contributors", async (req, res) => {
  try {
    const users = await User.aggregate([
      { $unwind: "$contributions" },
      {
        $match: {
          "contributions.verified": true,
          "contributions.removed": false,
        },
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          totalAmount: { $sum: "$contributions.amount" },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const rankedUsers = users.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    res.json(rankedUsers);
  } catch (error) {
    console.error("Error fetching public contributors:", error);
    res.status(500).json({ error: "Failed to fetch public contributors" });
  }
});
app.put("/api/verify/:userId/:contributionId", async (req, res) => {
  try {
    const { userId, contributionId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const contribution = user.contributions.id(contributionId);
    if (!contribution) {
      return res.status(404).json({ error: "Contribution not found" });
    }
    contribution.verified = true;
    await user.save();
    res.json(contribution);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/edit-contribution/:userId/:contributionId", async (req, res) => {
  try {
    const { userId, contributionId } = req.params;
    const { amount, reference } = req.body; // Add reference here
    console.log(amount, reference);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const contribution = user.contributions.id(contributionId);
    if (!contribution) {
      return res.status(404).json({ error: "Contribution not found" });
    }

    contribution.amount = amount;
    contribution.reference = reference; // Add this line
    await user.save();

    res.json({ success: true, message: "Contribution updated successfully" });
  } catch (error) {
    console.error("Error editing contribution:", error);
    res.status(500).json({ error: "Failed to edit contribution" });
  }
});

app.put(
  "/api/remove-contribution/:userId/:contributionId",
  async (req, res) => {
    try {
      const { userId, contributionId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const contribution = user.contributions.id(contributionId);
      if (!contribution) {
        return res.status(404).json({ error: "Contribution not found" });
      }

      contribution.removed = true;
      await user.save();

      res.json({ success: true, message: "Contribution marked as removed" });
    } catch (error) {
      console.error("Error marking contribution as removed:", error);
      res.status(500).json({ error: "Failed to mark contribution as removed" });
    }
  }
);
app.get("/api/failed-messages", async (req, res) => {
  try {
    const failedMessages = await Message.find({ failed: true }).populate(
      "userId"
    );

    res.json(failedMessages);
  } catch (error) {
    console.error("Error fetching failed messages:", error);
    res.status(500).json({ error: "Failed to fetch failed messages" });
  }
});

// New endpoint for retrying a single failed message
app.post("/api/retry-message/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    try {
      await addMessageToQueue({
        message: message.message,
        userId: message.userId.toString(),
        messageId: message._id.toString(),
      });
    } catch (e: any) {
      throw Error("Could not send message : " + error.message);
    }

    res.json({ success: true, message: "Message retry initiated" });
  } catch (error) {
    console.error("Error retrying message:", error);
    res.status(500).json({ error: "Failed to retry message" });
  }
});

app.use((req, res) => {
  res.status(404).send("Not Found");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
