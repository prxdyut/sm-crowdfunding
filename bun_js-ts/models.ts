import mongoose from "mongoose";
const { Schema } = mongoose;

const DataSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  amount: Number,
  verified: { type: Boolean, default: false },
});

export const Data = mongoose.model("Data", DataSchema);

const contributionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  removed: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  reference: { type: String, default: '' }
});

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  contributions: [contributionSchema],
});

export const User = mongoose.model("User", UserSchema);

const MessageSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  message: { type: String, required: true },
  failed: { type: Boolean, default: true },
  screen: { type: String, required: false },
  error: { type: String, required: false },
});

export const Message = mongoose.model("Message", MessageSchema);
