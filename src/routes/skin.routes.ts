
import { Router } from "express";
import {
  getSkins,
  getSkinById,
} from "../controllers/skin.controller.js";

const router = Router();

router.get("/", getSkins);
router.get("/:skin_id", getSkinById);

export default router;
