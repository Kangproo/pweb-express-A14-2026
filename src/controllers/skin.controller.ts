
import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { Rarity } from "../generated/prisma/enums.js";
import { HttpError } from "../utils/http-error.js";

const validRarities: ReadonlySet<string> = new Set(Object.values(Rarity));

function isRarity(value: string): value is Rarity {
  return validRarities.has(value);
}

// GET /api/skins
export async function getSkins(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const heroId = req.query.heroId
    ? Number(req.query.heroId)
    : undefined;

  const requestedRarity = req.query.rarity
    ? String(req.query.rarity).toUpperCase()
    : undefined;

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1
  ) {
    throw new HttpError(400, "Page dan limit harus berupa bilangan positif");
  }

  if (
    heroId !== undefined &&
    (!Number.isInteger(heroId) || heroId < 1)
  ) {
    throw new HttpError(400, "Hero ID tidak valid");
  }

  let rarity: Rarity | undefined;

  if (requestedRarity) {
    if (!isRarity(requestedRarity)) {
      throw new HttpError(400, "Rarity tidak valid");
    }

    rarity = requestedRarity;
  }

  const where = {
    ...(heroId !== undefined && { heroId }),
    ...(rarity && { rarity }),
  };

  const [skins, totalItems] = await Promise.all([
    prisma.skin.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      include: {
        hero: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.skin.count({ where }),
  ]);

  res.status(200).json({
    status: true,
    message: "Berhasil mengambil data skin",
    data: skins,
    metadata: {
      currentPage: page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  });
}

// GET /api/skins/:skin_id
export async function getSkinById(req: Request, res: Response) {
  const skinId = Number(req.params.skin_id);

  if (!Number.isInteger(skinId) || skinId < 1) {
    throw new HttpError(400, "ID Skin tidak valid");
  }

  const skin = await prisma.skin.findUnique({
    where: { id: skinId },
    include: {
      hero: true,
    },
  });

  if (!skin) {
    throw new HttpError(404, "Skin tidak ditemukan");
  }

  res.status(200).json({
    status: true,
    message: "Berhasil mengambil detail skin",
    data: skin,
  });
}
