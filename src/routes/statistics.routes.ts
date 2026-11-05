import { Router } from "express";
import { getStatistics } from "../controllers/statistics.controller.js";

const router = Router();

router.get("/", getStatistics);

export default router;
