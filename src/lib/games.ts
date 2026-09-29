import { GameSlug } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AVAILABLE_GAMES } from "@/lib/config";

/**
 * Games the viewer currently cares about.
 * - Anonymous → every available game (they haven't opted in yet).
 * - Signed-in with picks → their subset.
 * - Signed-in but no picks yet → every available game (safe default, prompt
 *   them to pick via the /me/listings preferences section).
 *
 * The result is always intersected with AVAILABLE_GAMES so a stale pick for
 * a game we removed from the app doesn't leak.
 */
export async function getViewerGameSlugs(viewerId: string | null): Promise<GameSlug[]> {
  if (!viewerId) return AVAILABLE_GAMES;

  const interests = await prisma.userGameInterest.findMany({
    where: { userId: viewerId },
    select: { game: { select: { slug: true } } },
  });
  if (interests.length === 0) return AVAILABLE_GAMES;

  const set = new Set(AVAILABLE_GAMES as string[]);
  const filtered = interests
    .map((i) => i.game.slug)
    .filter((slug) => set.has(slug));
  return filtered.length > 0 ? filtered : AVAILABLE_GAMES;
}
