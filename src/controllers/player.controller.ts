
import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/http-error.js";

function parsePlayerId(value: string | string[]): number {
  if (typeof value !== "string") {
    throw new HttpError(400, "ID Player tidak valid");
  }

  const playerId = Number(value);

  if (!Number.isSafeInteger(playerId) || playerId < 1) {
    throw new HttpError(400, "ID Player tidak valid");
  }

  return playerId;
}

function getBodyObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Body request harus berupa object JSON");
  }

  return body as Record<string, unknown>;
}

// POST /api/players
export async function createPlayer(req: Request, res: Response) {
  const { nickname } = getBodyObject(req.body);

  if (typeof nickname !== "string" || !nickname.trim()) {
    throw new HttpError(400, "Nickname wajib diisi");
  }

  const existing = await prisma.player.findUnique({
    where: { nickname: nickname.trim() },
  });

  if (existing) {
    throw new HttpError(409, "Nickname sudah digunakan");
  }

  const player = await prisma.player.create({
    data: { nickname: nickname.trim() },
  });

  res.status(201).json({
    status: true,
    message: "Berhasil membuat player",
    data: player,
  });
}

// GET /api/players/:player_id
export async function getPlayerById(req: Request, res: Response) {
  const playerId = parsePlayerId(req.params.player_id);

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      playerHeroes: {
        include: {
          hero: true,
        },
      },
    },
  });

  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  const { playerHeroes, ...playerData } = player;

  res.status(200).json({
    status: true,
    message: "Berhasil mengambil data player",
    data: {
      ...playerData,
      heroes: playerHeroes.map((ph) => ({
        heroId: ph.heroId,
        name: ph.hero.name,
        currency: ph.currency,
        pricePaid: ph.pricePaid,
      })),
    },
  });
}

// PATCH /api/players/:player_id
export async function updatePlayer(req: Request, res: Response) {
  const playerId = parsePlayerId(req.params.player_id);

  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  const { nickname } = getBodyObject(req.body);

  if (typeof nickname !== "string" || !nickname.trim()) {
    throw new HttpError(400, "Nickname tidak boleh kosong");
  }

  const existing = await prisma.player.findUnique({
    where: { nickname: nickname.trim() },
  });

  if (existing && existing.id !== playerId) {
    throw new HttpError(409, "Nickname sudah digunakan");
  }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { nickname: nickname.trim() },
  });

  res.status(200).json({
    status: true,
    message: "Berhasil mengubah nickname player",
    data: updated,
  });
}

// DELETE /api/players/:player_id
export async function deletePlayer(req: Request, res: Response) {
  const playerId = parsePlayerId(req.params.player_id);

  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  await prisma.player.delete({
    where: { id: playerId },
  });

  res.status(200).json({
    status: true,
    message: "Berhasil menghapus player",
    data: player,
  });
}
