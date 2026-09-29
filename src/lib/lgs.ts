import { prisma } from "@/lib/prisma";
import { LgsRole } from "@prisma/client";

export type LgsScope = "primary" | "all";

/**
 * User IDs the viewer should see, based on their LGS memberships.
 * Returns `null` when there's no filter to apply (anonymous viewer, viewer
 * with no memberships, or explicit scope=all).
 *
 * Default scope ("primary") includes users who share at least one LGS with
 * the viewer — since users can join multiple LGSs, we union across all of
 * them rather than restricting to a single primary.
 */
export async function getVisibleUserIds(
  viewerId: string | null,
  scope: LgsScope = "primary",
): Promise<string[] | null> {
  if (!viewerId || scope === "all") return null;

  const memberships = await prisma.lgsMembership.findMany({
    where: { userId: viewerId },
    select: { lgsId: true },
  });
  if (memberships.length === 0) return null;

  const lgsIds = memberships.map((m) => m.lgsId);
  const members = await prisma.lgsMembership.findMany({
    where: { lgsId: { in: lgsIds } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return members.map((m) => m.userId);
}

/**
 * Everything the nav needs to render the LGS switcher.
 */
export async function getViewerLgsContext(viewerId: string | null) {
  if (!viewerId) return { primary: null, memberships: [] as MembershipSummary[] };

  const memberships = await prisma.lgsMembership.findMany({
    where: { userId: viewerId },
    select: {
      id: true,
      isPrimary: true,
      role: true,
      lgs: { select: { id: true, slug: true, name: true, city: true } },
    },
    orderBy: [{ isPrimary: "desc" }, { joinedAt: "asc" }],
  });

  const primary =
    memberships.find((m) => m.isPrimary) ??
    memberships[0] ??
    null;

  return { primary, memberships };
}

export type MembershipSummary = {
  id: string;
  isPrimary: boolean;
  role: LgsRole;
  lgs: { id: string; slug: string; name: string; city: string | null };
};

export function parseLgsScope(raw: string | undefined): LgsScope {
  return raw === "all" ? "all" : "primary";
}
