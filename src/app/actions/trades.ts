"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TradeDirection, TradeStatus } from "@prisma/client";

async function currentUser() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (!session.user.handle) redirect("/onboarding");
  return session.user;
}

function assertParticipant(trade: { requesterId: string; responderId: string }, userId: string) {
  if (trade.requesterId !== userId && trade.responderId !== userId) {
    throw new Error("You are not a participant in this trade");
  }
}

const CreateTradeSchema = z.object({
  responderId: z.string().cuid(),
  iGiveIds: z.array(z.string().cuid()).default([]),
  iReceiveIds: z.array(z.string().cuid()).default([]),
});

/**
 * Create an OPEN trade with items prefilled. Called from /matches.
 */
export async function createTrade(input: {
  responderId: string;
  iGiveIds: string[];
  iReceiveIds: string[];
}) {
  const me = await currentUser();
  const parsed = CreateTradeSchema.parse(input);

  if (parsed.responderId === me.id) {
    throw new Error("You cannot trade with yourself");
  }

  const trade = await prisma.trade.create({
    data: {
      requesterId: me.id,
      responderId: parsed.responderId,
      status: TradeStatus.OPEN,
      items: {
        createMany: {
          data: [
            ...parsed.iGiveIds.map((cardId) => ({ cardId, direction: TradeDirection.FROM_REQUESTER })),
            ...parsed.iReceiveIds.map((cardId) => ({ cardId, direction: TradeDirection.FROM_RESPONDER })),
          ],
        },
      },
    },
  });

  revalidatePath("/trades");
  redirect(`/trades/${trade.id}`);
}

const AddItemSchema = z.object({
  tradeId: z.string().cuid(),
  cardId: z.string().cuid(),
  direction: z.nativeEnum(TradeDirection),
});

/**
 * Add a card to an OPEN trade. Only requester can edit.
 */
export async function addTradeItem(formData: FormData) {
  const me = await currentUser();
  const { tradeId, cardId, direction } = AddItemSchema.parse({
    tradeId: formData.get("tradeId"),
    cardId: formData.get("cardId"),
    direction: formData.get("direction"),
  });

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) throw new Error("Trade not found");
  if (trade.requesterId !== me.id) throw new Error("Only the requester can edit trade items");
  if (trade.status !== TradeStatus.OPEN) throw new Error("Trade is no longer editable");

  await prisma.tradeItem.upsert({
    where: { tradeId_cardId_direction: { tradeId, cardId, direction } },
    update: {},
    create: { tradeId, cardId, direction },
  });

  revalidatePath(`/trades/${tradeId}`);
}

const RemoveItemSchema = z.object({ itemId: z.string().cuid() });

export async function removeTradeItem(formData: FormData) {
  const me = await currentUser();
  const { itemId } = RemoveItemSchema.parse({ itemId: formData.get("itemId") });

  const item = await prisma.tradeItem.findUnique({
    where: { id: itemId },
    include: { trade: true },
  });
  if (!item) throw new Error("Item not found");
  if (item.trade.requesterId !== me.id) throw new Error("Only the requester can edit trade items");
  if (item.trade.status !== TradeStatus.OPEN) throw new Error("Trade is no longer editable");

  await prisma.tradeItem.delete({ where: { id: itemId } });

  revalidatePath(`/trades/${item.tradeId}`);
}

const TradeIdSchema = z.object({ tradeId: z.string().cuid() });

/**
 * OPEN → REQUESTED. Only requester.
 */
export async function sendTrade(formData: FormData) {
  const me = await currentUser();
  const { tradeId } = TradeIdSchema.parse({ tradeId: formData.get("tradeId") });

  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { items: true },
  });
  if (!trade) throw new Error("Trade not found");
  if (trade.requesterId !== me.id) throw new Error("Only the requester can send this trade");
  if (trade.status !== TradeStatus.OPEN) throw new Error("Trade is not in OPEN state");

  const gives = trade.items.filter((i) => i.direction === TradeDirection.FROM_REQUESTER).length;
  const receives = trade.items.filter((i) => i.direction === TradeDirection.FROM_RESPONDER).length;
  if (gives === 0 || receives === 0) {
    throw new Error("Both sides of the trade must have at least one card");
  }

  await prisma.trade.update({
    where: { id: tradeId },
    data: { status: TradeStatus.REQUESTED },
  });

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/trades");
}

/**
 * REQUESTED → ACCEPTED. Only responder.
 */
export async function acceptTrade(formData: FormData) {
  const me = await currentUser();
  const { tradeId } = TradeIdSchema.parse({ tradeId: formData.get("tradeId") });

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) throw new Error("Trade not found");
  if (trade.responderId !== me.id) throw new Error("Only the responder can accept this trade");
  if (trade.status !== TradeStatus.REQUESTED) throw new Error("Trade is not awaiting your response");

  await prisma.trade.update({
    where: { id: tradeId },
    data: { status: TradeStatus.ACCEPTED },
  });

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/trades");
}

/**
 * Mark caller's side as ready to finish. Only transitions to FINISHED
 * (and removes listings) when BOTH parties have confirmed. Otherwise
 * the trade stays in ACCEPTED with one confirmation recorded.
 */
export async function confirmFinish(formData: FormData) {
  const me = await currentUser();
  const { tradeId } = TradeIdSchema.parse({ tradeId: formData.get("tradeId") });

  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { items: true },
  });
  if (!trade) throw new Error("Trade not found");
  assertParticipant(trade, me.id);
  if (trade.status !== TradeStatus.ACCEPTED) throw new Error("Trade is not in ACCEPTED state");

  const now = new Date();
  const iAmRequester = trade.requesterId === me.id;
  const myField = iAmRequester ? "requesterFinishedAt" : "responderFinishedAt";
  const otherAlreadyConfirmed = iAmRequester
    ? trade.responderFinishedAt !== null
    : trade.requesterFinishedAt !== null;

  if (!otherAlreadyConfirmed) {
    // Just record my confirmation. Trade stays ACCEPTED.
    await prisma.trade.update({
      where: { id: tradeId },
      data: { [myField]: now },
    });
    revalidatePath(`/trades/${tradeId}`);
    revalidatePath("/trades");
    return;
  }

  // Both parties are now confirmed — finalize.
  const requesterGiveCardIds = trade.items
    .filter((i) => i.direction === TradeDirection.FROM_REQUESTER)
    .map((i) => i.cardId);
  const responderGiveCardIds = trade.items
    .filter((i) => i.direction === TradeDirection.FROM_RESPONDER)
    .map((i) => i.cardId);

  await prisma.$transaction([
    prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: TradeStatus.FINISHED,
        finishedAt: now,
        [myField]: now,
      },
    }),
    prisma.listing.deleteMany({
      where: { userId: trade.requesterId, cardId: { in: requesterGiveCardIds }, kind: "HAVE" },
    }),
    prisma.listing.deleteMany({
      where: { userId: trade.responderId, cardId: { in: requesterGiveCardIds }, kind: "WANT" },
    }),
    prisma.listing.deleteMany({
      where: { userId: trade.responderId, cardId: { in: responderGiveCardIds }, kind: "HAVE" },
    }),
    prisma.listing.deleteMany({
      where: { userId: trade.requesterId, cardId: { in: responderGiveCardIds }, kind: "WANT" },
    }),
  ]);

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/trades");
  revalidatePath("/me/listings");
  revalidatePath("/matches");
  revalidatePath("/browse");
}

/**
 * Retract your finish confirmation while the trade is still ACCEPTED.
 */
export async function unconfirmFinish(formData: FormData) {
  const me = await currentUser();
  const { tradeId } = TradeIdSchema.parse({ tradeId: formData.get("tradeId") });

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) throw new Error("Trade not found");
  assertParticipant(trade, me.id);
  if (trade.status !== TradeStatus.ACCEPTED) throw new Error("Trade is not in ACCEPTED state");

  const myField = trade.requesterId === me.id ? "requesterFinishedAt" : "responderFinishedAt";

  await prisma.trade.update({
    where: { id: tradeId },
    data: { [myField]: null },
  });

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/trades");
}

/**
 * Hard-delete a trade. Requester can delete OPEN; either party can decline REQUESTED
 * or cancel ACCEPTED. FINISHED trades cannot be deleted (history).
 */
export async function deleteTrade(formData: FormData) {
  const me = await currentUser();
  const { tradeId } = TradeIdSchema.parse({ tradeId: formData.get("tradeId") });

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) throw new Error("Trade not found");
  assertParticipant(trade, me.id);
  if (trade.status === TradeStatus.FINISHED) {
    throw new Error("Cannot delete a finished trade");
  }
  if (trade.status === TradeStatus.OPEN && trade.requesterId !== me.id) {
    throw new Error("Only the requester can delete an open trade");
  }

  await prisma.trade.delete({ where: { id: tradeId } });

  revalidatePath("/trades");
  redirect("/trades");
}
