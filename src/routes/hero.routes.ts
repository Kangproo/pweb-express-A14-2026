
import { Router } from "express";
import {
  getHeroes,
  getHeroById,
  createHero,
} from "../controllers/hero.controller.js";

const router = Router();

router.get("/", getHeroes);
router.get("/:hero_id", getHeroById);
router.post("/", createHero);

export default router;
