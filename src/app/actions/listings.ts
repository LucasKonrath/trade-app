"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ListingKind, CardCondition } from "@prisma/client";

const ConditionEnum = z.nativeEnum(CardCondition);
const KindEnum = z.nativeEnum(ListingKind);

const UpsertSchema = z.object({
  cardId: z.string().cuid(),
  kind: KindEnum,
  quantity: z.coerce.number().int().min(1).max(999).default(1),
  condition: ConditionEnum.optional(),
  note: z.string().max(280).optional(),
});

export async function upsertListing(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");

  const raw = Object.fromEntries(formData);
  // Zod converts empty strings to undefined for optional fields
  const cleaned = {
    cardId: raw.cardId,
    kind: raw.kind,
    quantity: raw.quantity || 1,
    condition: raw.condition || undefined,
    note: raw.note || undefined,
  };
  const parsed = UpsertSchema.parse(cleaned);

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
    },
    create: {
      userId: session.user.id,
      cardId: parsed.cardId,
      kind: parsed.kind,
      quantity: parsed.quantity,
      condition: parsed.condition ?? null,
      note: parsed.note ?? null,
    },
  });

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
