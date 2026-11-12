import "../src/config/env.js";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { readFileSync } from "node:fs";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

function readJSON<T>(path: string): T {
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content) as T;
}

async function main() {
  console.log("Membaca dataset JSON...");

  const heroes = readJSON<any[]>("data/heroes.json");
  const skins = readJSON<any[]>("data/skins.json");

  console.log(`Ditemukan ${heroes.length} Hero`);
  console.log(`Ditemukan ${skins.length} Skin`);

  console.log("Membersihkan data lama...");

  // 1. Kosongkan semua tabel dengan raw query
  await prisma.$executeRawUnsafe(
    `TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE`,
  );

  // 2. Masukkan semua hero dengan createMany
  console.log("Memasukkan Hero...");

  await prisma.hero.createMany({
    data: heroes.map((hero) => ({
      name: hero.name,
      role: hero.primaryRole,
      lane: hero.primaryLane,
      releaseYear: Number(hero.releaseYear),
      priceBP: hero.priceBP ?? null,
      priceDiamond: hero.priceDiamond ?? null,
    })),
  });

  // 3. Masukkan semua skin dengan createMany
  console.log("Memasukkan Skin...");

  await prisma.skin.createMany({
    data: skins.map((skin) => ({
      name: skin.name,
      rarity: skin.rarity,
      priceDiamond: skin.priceDiamond ?? null,
      heroId: Number(skin.heroId),
    })),
  });

  // 4. Masukkan 3 player dan data PlayerHero dari tabel
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
