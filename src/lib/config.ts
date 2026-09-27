import { GameSlug } from "@prisma/client";

/**
 * Games currently visible in the app. Nothing is deleted from the DB —
 * queries and UI just filter to this list. To re-enable Pokémon, add it here.
 */
export const ENABLED_GAMES: GameSlug[] = [GameSlug.riftbound];

export const IS_MULTI_GAME = ENABLED_GAMES.length > 1;

export function isGameEnabled(slug: GameSlug | string | undefined | null): boolean {
  return !!slug && (ENABLED_GAMES as string[]).includes(slug);
}
