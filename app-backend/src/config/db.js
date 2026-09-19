import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "finance_companion";

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  mongoose.connection.on("connected", () => {
    console.log(`Database connected: ${mongoose.connection.name}`);
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error", error);
  });

  await mongoose.connect(mongoUri, { dbName });
};

export default connectDB;
