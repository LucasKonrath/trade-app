"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ListingKind, CardCondition, OfferType } from "@prisma/client";

const ConditionEnum = z.nativeEnum(CardCondition);
const KindEnum = z.nativeEnum(ListingKind);
const OfferTypeEnum = z.nativeEnum(OfferType);

const UpsertSchema = z
  .object({
    cardId: z.string().cuid(),
    kind: KindEnum,
    quantity: z.coerce.number().int().min(1).max(999).default(1),
    condition: ConditionEnum.optional(),
    note: z.string().max(280).optional(),
    offerType: OfferTypeEnum.default(OfferType.TRADE_ONLY),
    priceCents: z.coerce.number().int().min(0).max(10_000_000).optional(),
  })
  .refine(
    (v) => v.offerType === OfferType.TRADE_ONLY || (v.priceCents !== undefined && v.priceCents > 0),
    { message: "Price is required for cash listings", path: ["priceCents"] },
  );

export async function upsertListing(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const raw = Object.fromEntries(formData);
  const cleaned = {
    cardId: raw.cardId,
    kind: raw.kind,
    quantity: raw.quantity || 1,
    condition: raw.condition || undefined,
    note: raw.note || undefined,
    offerType: raw.offerType || OfferType.TRADE_ONLY,
    priceCents: raw.priceCents ? Number(raw.priceCents) : undefined,
  };
  const parsed = UpsertSchema.parse(cleaned);

  const priceCents = parsed.offerType === OfferType.TRADE_ONLY ? null : parsed.priceCents ?? null;

  await prisma.listing.upsert({
    where: {
      userId_cardId_kind: {
        userId: session.user.id,
        cardId: parsed.cardId,
        kind: parsed.kind,
      },
    },
    update: {
      quantity: parsed.quantity,
      condition: parsed.condition ?? null,
      note: parsed.note ?? null,
      offerType: parsed.offerType,
      priceCents,
    },
    create: {
      userId: session.user.id,
      cardId: parsed.cardId,
      kind: parsed.kind,
      quantity: parsed.quantity,
      condition: parsed.condition ?? null,
      note: parsed.note ?? null,
      offerType: parsed.offerType,
      priceCents,
    },
  });

  revalidatePath("/me/listings");
  revalidatePath("/browse");
  revalidatePath("/matches");
}

const PriceSchema = z.object({
  cardId: z.string().cuid(),
  kind: KindEnum,
  priceCents: z.coerce.number().int().min(1).max(10_000_000),
});

/**
 * One-shot cash add for /cards tiles.
 * - If no listing exists → create CASH_ONLY with the price
 * - If TRADE_ONLY exists → upgrade to TRADE_OR_CASH with the price
 * - If CASH_ONLY / TRADE_OR_CASH exists → just update the price
 */
export async function addPriceToListing(input: {
  cardId: string;
  kind: ListingKind;
  priceCents: number;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const { cardId, kind, priceCents } = PriceSchema.parse(input);

  const existing = await prisma.listing.findUnique({
    where: { userId_cardId_kind: { userId: session.user.id, cardId, kind } },
  });

  const nextOfferType: OfferType = existing
    ? existing.offerType === OfferType.TRADE_ONLY
      ? OfferType.TRADE_OR_CASH
      : existing.offerType
    : OfferType.CASH_ONLY;

  await prisma.listing.upsert({
    where: { userId_cardId_kind: { userId: session.user.id, cardId, kind } },
    update: { priceCents, offerType: nextOfferType },
    create: {
      userId: session.user.id,
      cardId,
      kind,
      offerType: nextOfferType,
      priceCents,
      quantity: 1,
    },
  });

  revalidatePath("/cards");
  revalidatePath("/me/listings");
  revalidatePath("/browse");
  revalidatePath("/matches");
}

const RemovePriceSchema = z.object({
  cardId: z.string().cuid(),
  kind: KindEnum,
});

/**
 * Inverse of addPriceToListing.
 * - CASH_ONLY listing → delete entirely (nothing left to keep)
 * - TRADE_OR_CASH → drop the price, keep as TRADE_ONLY
 * - Anything else → no-op
 */
export async function removePriceFromListing(input: { cardId: string; kind: ListingKind }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { cardId, kind } = RemovePriceSchema.parse(input);

  const existing = await prisma.listing.findUnique({
    where: { userId_cardId_kind: { userId: session.user.id, cardId, kind } },
  });
  if (!existing) return;

  if (existing.offerType === OfferType.CASH_ONLY) {
    await prisma.listing.delete({ where: { id: existing.id } });
  } else if (existing.offerType === OfferType.TRADE_OR_CASH) {
    await prisma.listing.update({
      where: { id: existing.id },
      data: { offerType: OfferType.TRADE_ONLY, priceCents: null },
    });
  }

  revalidatePath("/cards");
  revalidatePath("/me/listings");
  revalidatePath("/browse");
  revalidatePath("/matches");
}

const SaveListingSchema = z.object({
  cardId: z.string().cuid(),
  kind: KindEnum,
  priceCents: z.number().int().min(1).max(10_000_000).nullable(),
  acceptTrades: z.boolean(),
});

/**
 * Unified save for the compact card-tile chip.
 * offerType is derived from (acceptTrades, price):
 *   accept + no price   → TRADE_ONLY
 *   accept + price      → TRADE_OR_CASH
 *   no accept + price   → CASH_ONLY
 *   no accept + no price → error (nothing to save)
 * Existing listing's quantity/condition/note are preserved.
 */
export async function saveListing(input: {
  cardId: string;
  kind: ListingKind;
  priceCents: number | null;
  acceptTrades: boolean;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const parsed = SaveListingSchema.parse(input);

  if (!parsed.acceptTrades && parsed.priceCents == null) {
    throw new Error("Set a price or enable trades");
  }

  const offerType: OfferType =
    parsed.acceptTrades && parsed.priceCents != null
      ? OfferType.TRADE_OR_CASH
      : parsed.acceptTrades
        ? OfferType.TRADE_ONLY
        : OfferType.CASH_ONLY;

  await prisma.listing.upsert({
    where: {
      userId_cardId_kind: {
        userId: session.user.id,
        cardId: parsed.cardId,
        kind: parsed.kind,
      },
    },
    update: { offerType, priceCents: parsed.priceCents },
    create: {
      userId: session.user.id,
      cardId: parsed.cardId,
      kind: parsed.kind,
      offerType,
      priceCents: parsed.priceCents,
      quantity: 1,
    },
  });

  revalidatePath("/cards");
  revalidatePath("/me/listings");
  revalidatePath("/browse");
  revalidatePath("/matches");
}

const DeleteSchema = z.object({ listingId: z.string().cuid() });

export async function deleteListing(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { listingId } = DeleteSchema.parse({
    listingId: formData.get("listingId"),
  });

  await prisma.listing.deleteMany({
    where: { id: listingId, userId: session.user.id },
  });

  revalidatePath("/me/listings");
  revalidatePath("/browse");
  revalidatePath("/matches");
}
