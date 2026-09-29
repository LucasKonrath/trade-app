import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";

const BRAND_ORANGE = 0xe89419;
const WEBHOOK_PREFIX_1 = "https://discord.com/api/webhooks/";
const WEBHOOK_PREFIX_2 = "https://discordapp.com/api/webhooks/";

export function looksLikeDiscordWebhook(url: string): boolean {
  return url.startsWith(WEBHOOK_PREFIX_1) || url.startsWith(WEBHOOK_PREFIX_2);
}

type Embed = {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

async function postEmbed(webhookUrl: string, embed: Embed): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Mulligan",
        embeds: [embed],
      }),
    });
  } catch (err) {
    // Fire-and-forget: log but don't throw.
    console.error("Discord webhook POST failed:", (err as Error).message);
  }
}

/**
 * Fetch the user's webhook and post an embed to it (if set).
 */
export async function notifyUser(userId: string, embed: Embed): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordWebhookUrl: true },
  });
  if (!user?.discordWebhookUrl) return;
  await postEmbed(user.discordWebhookUrl, embed);
}

type TradeParticipant = {
  handle: string | null;
  name: string | null;
};

function label(u: TradeParticipant): string {
  return u.handle ? `@${u.handle}` : u.name ?? "alguém";
}

function tradeUrl(baseUrl: string, tradeId: string): string {
  return `${baseUrl}/trades/${tradeId}`;
}

type TradeSummary = {
  id: string;
  cashCents: number | null;
  items: { direction: "FROM_REQUESTER" | "FROM_RESPONDER"; quantity: number }[];
};

function itemsSummary(trade: TradeSummary): {
  fromRequesterCount: number;
  fromResponderCount: number;
} {
  let fr = 0;
  let fp = 0;
  for (const it of trade.items) {
    if (it.direction === "FROM_REQUESTER") fr += it.quantity;
    else fp += it.quantity;
  }
  return { fromRequesterCount: fr, fromResponderCount: fp };
}

/* --- Templates ------------------------------------------------------------ */

export async function notifyTradeRequested(
  responderId: string,
  fromUser: TradeParticipant,
  trade: TradeSummary,
  baseUrl: string,
): Promise<void> {
  const { fromRequesterCount, fromResponderCount } = itemsSummary(trade);
  const cash = trade.cashCents ?? 0;
  const cashLine =
    cash > 0
      ? `Você paga ${formatBRL(Math.abs(cash))}`
      : cash < 0
        ? `Você recebe ${formatBRL(Math.abs(cash))}`
        : null;
  await notifyUser(responderId, {
    title: "Nova proposta de troca",
    description: `${label(fromUser)} quer trocar com você.`,
    color: BRAND_ORANGE,
    url: tradeUrl(baseUrl, trade.id),
    fields: [
      {
        name: "Você entrega",
        value: String(fromResponderCount || "—"),
        inline: true,
      },
      {
        name: "Você recebe",
        value: String(fromRequesterCount || "—"),
        inline: true,
      },
      ...(cashLine ? [{ name: "Dinheiro", value: cashLine, inline: false }] : []),
    ],
    footer: { text: "Mulligan" },
    timestamp: new Date().toISOString(),
  });
}

export async function notifyTradeCountered(
  targetUserId: string,
  fromUser: TradeParticipant,
  trade: TradeSummary,
  baseUrl: string,
): Promise<void> {
  const cash = trade.cashCents ?? 0;
  const cashLine =
    cash > 0
      ? `Nova proposta de dinheiro: você recebe ${formatBRL(Math.abs(cash))}`
      : cash < 0
        ? `Nova proposta de dinheiro: você paga ${formatBRL(Math.abs(cash))}`
        : "Sem dinheiro";
  await notifyUser(targetUserId, {
    title: "Contra-proposta recebida",
    description: `${label(fromUser)} enviou uma nova proposta.`,
    color: BRAND_ORANGE,
    url: tradeUrl(baseUrl, trade.id),
    fields: [{ name: "Ajuste", value: cashLine, inline: false }],
    footer: { text: "Mulligan" },
    timestamp: new Date().toISOString(),
  });
}

export async function notifyTradeAccepted(
  requesterId: string,
  responder: TradeParticipant,
  trade: TradeSummary,
  baseUrl: string,
): Promise<void> {
  await notifyUser(requesterId, {
    title: "Troca aceita",
    description: `${label(responder)} aceitou sua proposta. Combinem para trocar!`,
    color: 0x2ea043,
    url: tradeUrl(baseUrl, trade.id),
    footer: { text: "Mulligan" },
    timestamp: new Date().toISOString(),
  });
}

export async function notifyTradeDeleted(
  targetUserId: string,
  fromUser: TradeParticipant,
  trade: TradeSummary,
  baseUrl: string,
): Promise<void> {
  await notifyUser(targetUserId, {
    title: "Troca cancelada",
    description: `${label(fromUser)} cancelou a troca.`,
    color: 0xa04040,
    url: tradeUrl(baseUrl, trade.id),
    footer: { text: "Mulligan" },
    timestamp: new Date().toISOString(),
  });
}

export async function notifyTradeFinished(
  targetUserId: string,
  otherUser: TradeParticipant,
  trade: TradeSummary,
  baseUrl: string,
): Promise<void> {
  await notifyUser(targetUserId, {
    title: "Troca concluída",
    description: `Sua troca com ${label(otherUser)} foi finalizada. As cartas foram removidas dos anúncios de ambos.`,
    color: 0x2ea043,
    url: tradeUrl(baseUrl, trade.id),
    footer: { text: "Mulligan" },
    timestamp: new Date().toISOString(),
  });
}

export async function notifyFinishAwaiting(
  targetUserId: string,
  otherUser: TradeParticipant,
  trade: TradeSummary,
  baseUrl: string,
): Promise<void> {
  await notifyUser(targetUserId, {
    title: "Aguardando sua confirmação",
    description: `${label(otherUser)} confirmou o encerramento. Confirme para finalizar a troca.`,
    color: BRAND_ORANGE,
    url: tradeUrl(baseUrl, trade.id),
    footer: { text: "Mulligan" },
    timestamp: new Date().toISOString(),
  });
}

export async function notifyNewComment(
  targetUserId: string,
  fromUser: TradeParticipant,
  trade: { id: string },
  bodyPreview: string,
  baseUrl: string,
): Promise<void> {
  const preview =
    bodyPreview.length > 300 ? `${bodyPreview.slice(0, 300)}…` : bodyPreview;
  await notifyUser(targetUserId, {
    title: "Nova mensagem na conversa",
    description: `${label(fromUser)}: ${preview}`,
    color: 0x4470a0,
    url: tradeUrl(baseUrl, trade.id),
    footer: { text: "Mulligan" },
    timestamp: new Date().toISOString(),
  });
}

export async function sendTestNotification(userId: string): Promise<void> {
  await notifyUser(userId, {
    title: "🎉 Notificações do Mulligan ativadas",
    description:
      "Você vai receber alertas de propostas, contra-propostas, mensagens e trocas concluídas neste canal.",
    color: BRAND_ORANGE,
    footer: { text: "Mulligan" },
    timestamp: new Date().toISOString(),
  });
}
