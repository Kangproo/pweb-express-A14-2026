
import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { Lane, Role } from "../generated/prisma/enums.js";
import { HttpError } from "../utils/http-error.js";

const validRoles: ReadonlySet<string> = new Set(Object.values(Role));
const validLanes: ReadonlySet<string> = new Set(Object.values(Lane));
const MAX_INT32 = 2_147_483_647;

function isRole(value: string): value is Role {
  return validRoles.has(value);
}

function isLane(value: string): value is Lane {
  return validLanes.has(value);
}

function isRequestBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalPrice(value: unknown): value is number | null | undefined {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= MAX_INT32)
  );
}

// GET /api/heroes
export async function getHeroes(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const search = String(req.query.search ?? "");
  const requestedRole = req.query.role
    ? String(req.query.role).toUpperCase()
    : undefined;

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1
  ) {
    throw new HttpError(400, "Page dan limit harus berupa bilangan positif");
  }

  let role: Role | undefined;

  if (requestedRole) {
    if (!isRole(requestedRole)) {
      throw new HttpError(400, "Role tidak valid");
    }

    role = requestedRole;
  }

  const where = {
    ...(search && {
      name: {
        contains: search,
        mode: "insensitive" as const,
      },
    }),
    ...(role && { role }),
  };

  const [heroes, totalItems] = await Promise.all([
    prisma.hero.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
    }),
    prisma.hero.count({ where }),
  ]);

  res.status(200).json({
    status: true,
    message: "Berhasil mengambil data hero",
    data: heroes,
    metadata: {
      currentPage: page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  });
}

// GET /api/heroes/:hero_id
export async function getHeroById(req: Request, res: Response) {
  const heroId = Number(req.params.hero_id);

  if (!Number.isInteger(heroId) || heroId < 1) {
    throw new HttpError(400, "ID Hero tidak valid");
  }

  const hero = await prisma.hero.findUnique({
    where: { id: heroId },
    include: { skins: true },
  });

  if (!hero) {
    throw new HttpError(404, "Hero tidak ditemukan");
  }

  res.status(200).json({
    status: true,
    message: "Berhasil mengambil detail hero",
    data: hero,
  });
}

// POST /api/heroes
export async function createHero(req: Request, res: Response) {
  const requestBody: unknown = req.body;

  if (!isRequestBody(requestBody)) {
    throw new HttpError(400, "Body request harus berupa object JSON");
  }

  const { name, role, lane, releaseYear, priceBP, priceDiamond } = requestBody;

  // Validasi field wajib
  if (
    name === undefined ||
    name === null ||
    name === "" ||
    role === undefined ||
    role === null ||
    role === "" ||
    lane === undefined ||
    lane === null ||
    lane === "" ||
    releaseYear === undefined ||
    releaseYear === null ||
    releaseYear === ""
  ) {
    throw new HttpError(400, "Field name, role, lane, dan releaseYear wajib diisi");
  }

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof role !== "string" ||
    !isRole(role) ||
    typeof lane !== "string" ||
    !isLane(lane) ||
    typeof releaseYear !== "number" ||
    !Number.isInteger(releaseYear) ||
    releaseYear < 1 ||
    releaseYear > MAX_INT32
  ) {
    throw new HttpError(400, "Data Hero tidak valid");
  }

  if (!isOptionalPrice(priceBP) || !isOptionalPrice(priceDiamond)) {
    throw new HttpError(
      400,
      "Harga harus berupa integer JSON antara 0 dan 2147483647, atau null",
    );
  }

  // Periksa nama duplikat
  const existingHero = await prisma.hero.findUnique({
    where: { name: name.trim() },
  });

  if (existingHero) {
    throw new HttpError(409, "Nama Hero sudah digunakan");
  }

  const hero = await prisma.hero.create({
    data: {
      name: name.trim(),
      role,
      lane,
      releaseYear,
      priceBP: priceBP ?? null,
      priceDiamond: priceDiamond ?? null,
    },
  });

  res.status(201).json({
    status: true,
    message: "Berhasil menambahkan hero",
    data: hero,
  });
}
