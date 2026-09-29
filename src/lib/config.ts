import { GameSlug } from "@prisma/client";

/**
 * Games globally available in the app. Each user picks a subset via
 * UserGameInterest; queries filter to the intersection of "available" and
 * "what the viewer chose".
 *
 * Add a game here (and seed its cards) to make it selectable everywhere.
 */
export const AVAILABLE_GAMES: GameSlug[] = [
  GameSlug.pokemon,
  GameSlug.riftbound,
  GameSlug.mtg,
];

// Alias for legacy call sites — points to the same list.
export const ENABLED_GAMES = AVAILABLE_GAMES;

export const IS_MULTI_GAME = AVAILABLE_GAMES.length > 1;

export function isGameEnabled(slug: GameSlug | string | undefined | null): boolean {
  return !!slug && (AVAILABLE_GAMES as string[]).includes(slug);
}

export const GAME_LABELS: Record<GameSlug, string> = {
  [GameSlug.pokemon]: "Pokémon",
  [GameSlug.riftbound]: "Riftbound",
  [GameSlug.mtg]: "Magic: The Gathering",
};
