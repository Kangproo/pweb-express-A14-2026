
import { Router } from "express";
import {
  createPlayer,
  getPlayerById,
  updatePlayer,
  deletePlayer,
} from "../controllers/player.controller.js";
import {
  buyHero,
  playMatch,
  topUpPlayer,
} from "../controllers/player-action.controller.js";

const router = Router();

router.post("/", createPlayer);
router.get("/:player_id", getPlayerById);
router.patch("/:player_id", updatePlayer);
router.delete("/:player_id", deletePlayer);
router.post("/:player_id/topup", topUpPlayer);
router.post("/:player_id/matches", playMatch);
router.post("/:player_id/heroes", buyHero);

export default router;
