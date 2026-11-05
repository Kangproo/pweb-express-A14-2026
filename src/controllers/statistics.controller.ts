import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { Role } from "../generated/prisma/enums.js";

const roles = Object.values(Role);

// GET /api/statistics
export async function getStatistics(_req: Request, res: Response) {
  const [totalPlayers, totalHeroesOwned, diamondAggregate, ownedHeroGroups, roleGroups] =
    await Promise.all([
      prisma.player.count(),
      prisma.playerHero.count(),
      prisma.player.aggregate({ _sum: { diamond: true } }),
      prisma.playerHero.groupBy({
        by: ["heroId"],
        _count: { heroId: true },
      }),
      prisma.hero.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
    ]);

  ownedHeroGroups.sort(
    (left, right) =>
      right._count.heroId - left._count.heroId || left.heroId - right.heroId,
  );

  const mostOwnedGroup = ownedHeroGroups[0];
  const mostOwnedRecord = mostOwnedGroup
    ? await prisma.hero.findUnique({ where: { id: mostOwnedGroup.heroId } })
    : null;

  const roleCounts = new Map(
    roleGroups.map((group) => [group.role, group._count._all]),
  );

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
              id: mostOwnedRecord.id,
              name: mostOwnedRecord.name,
              ownershipCount: mostOwnedGroup._count.heroId,
            }
          : null,
      heroesPerRole: roles.map((role) => ({
        role,
        count: roleCounts.get(role) ?? 0,
      })),
    },
  });
}
