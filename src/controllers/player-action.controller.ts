import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import type { Currency } from "../generated/prisma/enums.js";
import { HttpError } from "../utils/http-error.js";

const MAX_INT32 = 2_147_483_647;

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

// POST /api/players/:player_id/topup
export async function topUpPlayer(req: Request, res: Response) {
  const playerId = parsePlayerId(req.params.player_id);
  const { amount } = getBodyObject(req.body);

  // 1. amount bukan bilangan bulat lebih dari 0 -> 400
  if (
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > MAX_INT32
  ) {
    throw new HttpError(400, "Amount harus berupa bilangan bulat lebih dari 0");
  }

  // 2. Player tidak ditemukan -> 404
  const existingPlayer = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!existingPlayer) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  // 3. Berhasil: tambah diamond player dengan increment, lalu balas 200 berisi saldo Diamond terbaru
  const updatedPlayer = await prisma.player.update({
    where: { id: playerId },
    data: {
      diamond: {
        increment: amount,
      },
    },
  });

  res.status(200).json({
    status: true,
    message: "Top up berhasil",
    data: {
      playerId: updatedPlayer.id,
      amount,
      diamond: updatedPlayer.diamond,
    },
  });
}

// POST /api/players/:player_id/matches
export async function playMatch(req: Request, res: Response) {
  const playerId = parsePlayerId(req.params.player_id);
  const { result } = getBodyObject(req.body);

  // 1. result bukan WIN/LOSE -> 400
  if (result !== "WIN" && result !== "LOSE") {
    throw new HttpError(400, "Result harus WIN atau LOSE");
  }

  // 2. Player tidak ditemukan -> 404
  const existingPlayer = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!existingPlayer) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  // 3. Berhasil: tambah bp player (WIN 300, LOSE 100) dengan increment
  const bpEarned = result === "WIN" ? 300 : 100;

  const updatedPlayer = await prisma.player.update({
    where: { id: playerId },
    data: {
      bp: {
        increment: bpEarned,
      },
    },
  });

  res.status(200).json({
    status: true,
    message: "Hadiah match berhasil ditambahkan",
    data: {
      playerId: updatedPlayer.id,
      result,
      bpEarned,
      bp: updatedPlayer.bp,
    },
  });
}

// POST /api/players/:player_id/heroes
export async function buyHero(req: Request, res: Response) {
  const playerId = parsePlayerId(req.params.player_id);
  const body = getBodyObject(req.body);
  const { heroId, currency: requestedCurrency } = body;

  // 1. heroId kosong, atau currency bukan BP/DIAMOND -> 400
  if (
    heroId === undefined ||
    heroId === null ||
    heroId === "" ||
    typeof heroId !== "number" ||
    !Number.isSafeInteger(heroId) ||
    heroId < 1 ||
    (requestedCurrency !== "BP" && requestedCurrency !== "DIAMOND")
  ) {
    throw new HttpError(
      400,
      "heroId wajib diisi dan currency harus BP atau DIAMOND",
    );
  }

  const currency: Currency = requestedCurrency;

  // 2. Player tidak ditemukan -> 404
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  // 3. Hero tidak ditemukan -> 404
  const hero = await prisma.hero.findUnique({
    where: { id: heroId },
  });

  if (!hero) {
    throw new HttpError(404, "Hero tidak ditemukan");
  }

  // 4. Harga hero untuk currency tersebut kosong -> 400
  const pricePaid = currency === "BP" ? hero.priceBP : hero.priceDiamond;

  if (pricePaid === null) {
    throw new HttpError(
      400,
      `Hero ${hero.name} tidak bisa dibeli dengan ${currency}`,
    );
  }

  // 5. Player sudah memiliki hero tersebut -> 409
  const existingOwnership = await prisma.playerHero.findUnique({
    where: {
      playerId_heroId: { playerId, heroId },
    },
  });

  if (existingOwnership) {
    throw new HttpError(409, "Player sudah memiliki hero tersebut");
  }

  // 6. Saldo player kurang dari harga hero -> 400
  const currentBalance = currency === "BP" ? player.bp : player.diamond;

  if (currentBalance < pricePaid) {
    throw new HttpError(400, `Saldo ${currency} tidak mencukupi`);
  }

  // Simpan dengan transaction: prisma.$transaction([ ... ])
  const [updatedPlayer] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data:
        currency === "BP"
          ? { bp: { decrement: pricePaid } }
          : { diamond: { decrement: pricePaid } },
    }),
    prisma.playerHero.create({
      data: {
        playerId,
        heroId,
        currency,
        pricePaid,
      },
    }),
  ]);

  res.status(201).json({
    status: true,
    message: "Hero berhasil dibeli",
    data: {
      hero: {
        id: hero.id,
        name: hero.name,
      },
      currency,
      pricePaid,
      balance: {
        bp: updatedPlayer.bp,
        diamond: updatedPlayer.diamond,
      },
    },
  });
}
