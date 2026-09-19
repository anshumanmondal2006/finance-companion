import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import investmentRoutes from "./routes/investmentRoutes.js";
import retirementRoutes from './routes/retirementRoutes.js';
import nominationRoutes from './routes/nominationRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  }),
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/investments", investmentRoutes);
app.use('/api/retirement-plan', retirementRoutes);
app.use('/api/nominations', nominationRoutes);
app.use('/api/games', gameRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
