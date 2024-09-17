import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { Message, User } from "./models";
import {
  addMessageToQueue,
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
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());
app.use("/assets", express.static("public"));
const contributionMessage = (name, amount) =>
  `Hello! ${name}, \nYour contribution of ₹${amount} has been recorded you will be notified once it is verified`;
const bankMessage = (name, amount) =>
  `Hello! ${name}, \nUnfortunately we cant process Your contribution of ₹${amount} as this big amount is not acceptable through upi`;
const maxAmount = 100;

app.post("/new", async (req, res) => {
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

app.post("/bank-transfer", async (req, res) => {
  try {
    const { name, phone, email, amount, timestamp, reference } = req.body;
    if (!name || !phone || !email || !amount) throw Error("Form Invalid");

    console.log("Received Data : ", { name, phone, email, amount });

    const message = `Hello! ${name}, \nHere comes your bank details`
        
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

app.get("/data", async (req, res) => {
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
app.get("/public-contributors", async (req, res) => {
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

    // Add ranking to each user
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
app.put("/verify/:userId/:contributionId", async (req, res) => {
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

app.put("/edit-contribution/:userId/:contributionId", async (req, res) => {
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

app.put("/remove-contribution/:userId/:contributionId", async (req, res) => {
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
});

app.use((req, res) => {
  res.status(404).send("Not Found");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
