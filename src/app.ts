import heroRoutes from "./routes/hero.routes.js";
import express from "express";
import { logger } from "./middlewares/logger.js";
import { notFound } from "./middlewares/not-found.js";
import { errorHandler } from "./middlewares/error-handler.js";
import skinRoutes from "./routes/skin.routes.js";
import playerRoutes from "./routes/player.routes.js";
import statisticsRoutes from "./routes/statistics.routes.js";

const app = express();

app.set("json spaces", 2);
app.use(express.json());

// Logger untuk semua request
app.use(logger);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: true,
    message: "MLBB Shop API is running",
  });
});

app.use("/api/heroes", heroRoutes);
app.use("/api/skins", skinRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/statistics", statisticsRoutes);

// Middleware 404 dan error handler harus berada paling bawah
app.use(notFound);
app.use(errorHandler);

export default app;
