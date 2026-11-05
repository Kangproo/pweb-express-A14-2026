import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
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

  if (
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount < 1
  ) {
    throw new HttpError(400, "Amount harus berupa bilangan bulat positif");
  }

  if (amount > MAX_INT32) {
    throw new HttpError(400, "Amount melebihi batas maksimum saldo Int32");
  }

  const update = await prisma.player.updateMany({
    where: {
      id: playerId,
      diamond: { lte: MAX_INT32 - amount },
    },
    data: { diamond: { increment: amount } },
  });

  if (update.count === 0) {
    const playerExists = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true },
    });

    if (!playerExists) {
      throw new HttpError(404, "Player tidak ditemukan");
    }

    throw new HttpError(
      400,
      "Top-up akan melampaui batas maksimum saldo Diamond Int32",
    );
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });

  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  res.status(200).json({
    status: true,
    message: "Top-up Diamond berhasil",
    data: player,
  });
}

// POST /api/players/:player_id/matches
export async function playMatch(req: Request, res: Response) {
  const playerId = parsePlayerId(req.params.player_id);
  const { result } = getBodyObject(req.body);

  if (result !== "WIN" && result !== "LOSE") {
    throw new HttpError(400, "Result harus WIN atau LOSE");
  }

  const bpEarned = result === "WIN" ? 300 : 100;
  const update = await prisma.player.updateMany({
    where: {
      id: playerId,
      bp: { lte: MAX_INT32 - bpEarned },
    },
    data: { bp: { increment: bpEarned } },
  });

  if (update.count === 0) {
    const playerExists = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true },
    });

    if (!playerExists) {
      throw new HttpError(404, "Player tidak ditemukan");
    }

    throw new HttpError(
      400,
      "Hadiah BP akan melampaui batas maksimum saldo Int32",
    );
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });

  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  res.status(200).json({
    status: true,
    message: `Match ${result} berhasil, ${bpEarned} BP ditambahkan`,
    data: { player, result, bpEarned },
  });
}

// POST /api/players/:player_id/heroes
export async function buyHero(req: Request, res: Response) {
  const playerId = parsePlayerId(req.params.player_id);
  const body = getBodyObject(req.body);
  const { heroId, currency: requestedCurrency } = body;

  if (!Number.isSafeInteger(heroId) || typeof heroId !== "number" || heroId < 1) {
    throw new HttpError(400, "Hero ID harus berupa bilangan bulat positif");
  }

  if (requestedCurrency !== "BP" && requestedCurrency !== "DIAMOND") {
    throw new HttpError(400, "Currency harus BP atau DIAMOND");
  }

  const currency: Currency = requestedCurrency;

  try {
    const purchase = await prisma.$transaction(async (transaction) => {
      const [player, hero] = await Promise.all([
        transaction.player.findUnique({ where: { id: playerId } }),
        transaction.hero.findUnique({ where: { id: heroId } }),
      ]);

      if (!player) {
        throw new HttpError(404, "Player tidak ditemukan");
      }

      if (!hero) {
        throw new HttpError(404, "Hero tidak ditemukan");
      }

      const price = currency === "BP" ? hero.priceBP : hero.priceDiamond;

      if (price === null) {
        throw new HttpError(400, `Hero ini tidak dapat dibeli dengan ${currency}`);
      }

      if (price < 0) {
        throw new HttpError(400, "Harga Hero tidak valid");
      }

      const existingOwnership = await transaction.playerHero.findUnique({
        where: {
          playerId_heroId: { playerId, heroId },
        },
      });

      if (existingOwnership) {
        throw new HttpError(409, "Player sudah memiliki Hero ini");
      }

      const balance = currency === "BP" ? player.bp : player.diamond;

      if (balance < price) {
        throw new HttpError(400, `Saldo ${currency} tidak mencukupi`);
      }

      const debit = currency === "BP"
        ? await transaction.player.updateMany({
            where: { id: playerId, bp: { gte: price } },
            data: { bp: { decrement: price } },
          })
        : await transaction.player.updateMany({
            where: { id: playerId, diamond: { gte: price } },
            data: { diamond: { decrement: price } },
          });

      if (debit.count === 0) {
        const [currentPlayer, currentOwnership] = await Promise.all([
          transaction.player.findUnique({ where: { id: playerId } }),
          transaction.playerHero.findUnique({
            where: { playerId_heroId: { playerId, heroId } },
          }),
        ]);

        if (!currentPlayer) {
          throw new HttpError(404, "Player tidak ditemukan");
        }

        if (currentOwnership) {
          throw new HttpError(409, "Player sudah memiliki Hero ini");
        }

        throw new HttpError(400, `Saldo ${currency} tidak mencukupi`);
      }

      const playerHero = await transaction.playerHero.create({
        data: { playerId, heroId, currency, pricePaid: price },
      });
      const updatedPlayer = await transaction.player.findUnique({
        where: { id: playerId },
      });

      if (!updatedPlayer) {
        throw new HttpError(404, "Player tidak ditemukan");
      }

      return { player: updatedPlayer, ownership: playerHero, hero };
    });

    res.status(201).json({
      status: true,
      message: "Hero berhasil dibeli",
      data: purchase,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpError(409, "Player sudah memiliki Hero ini");
      }

      if (error.code === "P2034") {
        throw new HttpError(409, "Terjadi konflik transaksi, silakan coba kembali");
      }
    }

    throw error;
  }
}
