
import "../src/config/env.js";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

function readCSV(path: string) {
  const content = readFileSync(path, "utf-8");

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  });
}

function nullableInt(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;

  const number = Number(value);

  if (!Number.isInteger(number)) {
    throw new Error(`Invalid integer value: ${value}`);
  }

  return number;
}

async function main() {
  console.log("Membaca dataset CSV...");

  const heroes = readCSV("data/heroes.csv");
  const skins = readCSV("data/skins.csv");

  console.log(`Ditemukan ${heroes.length} Hero`);
  console.log(`Ditemukan ${skins.length} Skin`);

  // Urutkan berdasarkan ID agar ID database sesuai heroId di CSV.
  heroes.sort((a: any, b: any) => Number(a.id) - Number(b.id));

  console.log("Membersihkan data lama...");

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "PlayerHero",
      "Player",
      "Skin",
      "Hero"
    RESTART IDENTITY CASCADE
  `);

  console.log("Memasukkan Hero...");

  await prisma.hero.createMany({
    data: heroes.map((hero: any) => ({
      name: hero.name,
      role: hero.primaryRole,
      lane: hero.primaryLane,
      releaseYear: Number(hero.releaseYear),
      priceBP: nullableInt(hero.priceBP),
      priceDiamond: nullableInt(hero.priceDiamond),
    })),
  });

  console.log("Memasukkan Skin...");

  await prisma.skin.createMany({
    data: skins.map((skin: any) => ({
      name: skin.name,
      rarity: skin.rarity,
      priceDiamond: nullableInt(skin.priceDiamond),
      heroId: Number(skin.heroId),
    })),
  });

  console.log("Membuat Player...");

  await prisma.player.createMany({
    data: [
      {
        nickname: "ArekITS",
        bp: 1500,
        diamond: 75,
      },
      {
        nickname: "SangPushRank",
        bp: 13000,
        diamond: 2892,
      },
      {
        nickname: "MageSurabaya",
        bp: 10000,
        diamond: 0,
      },
    ],
  });

  console.log("Memasukkan kepemilikan Hero...");

  await prisma.playerHero.createMany({
    data: [
      {
        playerId: 1,
        heroId: 18,
        currency: "BP",
        pricePaid: 2000,
      },
      {
        playerId: 1,
        heroId: 1,
        currency: "BP",
        pricePaid: 10800,
      },
      {
        playerId: 2,
        heroId: 84,
        currency: "DIAMOND",
        pricePaid: 599,
      },
      {
        playerId: 2,
        heroId: 56,
        currency: "BP",
        pricePaid: 32000,
      },
    ],
  });

  console.log("\nSeed berhasil!");

  console.log({
    heroes: await prisma.hero.count(),
    skins: await prisma.skin.count(),
    players: await prisma.player.count(),
    ownedHeroes: await prisma.playerHero.count(),
  });
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
