import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

// GET /api/statistics
export async function getStatistics(_req: Request, res: Response) {
  const [
    totalPlayers,
    totalHeroesOwned,
    diamondAggregate,
    ownedHeroGroups,
    roleGroups,
  ] = await Promise.all([
    prisma.player.count(),
    prisma.playerHero.count(),
    prisma.player.aggregate({ _sum: { diamond: true } }),
    prisma.playerHero.groupBy({
      by: ["heroId"],
      _count: { heroId: true },
      orderBy: [
        { _count: { heroId: "desc" } },
        { heroId: "asc" },
      ],
      take: 1,
    }),
    prisma.hero.groupBy({
      by: ["role"],
      _count: { role: true },
      orderBy: {
        _count: { role: "desc" },
      },
    }),
  ]);

  const mostOwnedGroup = ownedHeroGroups[0];
  const mostOwnedRecord = mostOwnedGroup
    ? await prisma.hero.findUnique({ where: { id: mostOwnedGroup.heroId } })
    : null;

  res.status(200).json({
    status: true,
    message: "Berhasil mengambil statistik",
    data: {
      totalPlayers,
      totalHeroesOwned,
      totalDiamond: diamondAggregate._sum.diamond ?? 0,
      mostOwnedHero:
        mostOwnedGroup && mostOwnedRecord
          ? {
              heroId: mostOwnedRecord.id,
              name: mostOwnedRecord.name,
              owners: mostOwnedGroup._count.heroId,
            }
          : null,
      heroesPerRole: roleGroups.map((group) => ({
        role: group.role,
        total: group._count.role,
      })),
    },
  });
}
