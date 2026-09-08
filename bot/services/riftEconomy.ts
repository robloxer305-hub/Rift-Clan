import { db } from "../../lib/db";

export const RIFT_RANKS = [
  "Rookie",
  "Member",
  "Veteran",
  "Elite",
  "Champion",
  "RIFT Legend",
] as const;

export type RiftRank = (typeof RIFT_RANKS)[number];

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  description: string;
};

export type UserProfile = {
  userId: string;
  username: string;
  balance: number;
  xp: number;
  level: number;
  lastDaily: number | null;
  inventory: string[];
};

const levelThresholds = [0, 100, 250, 500, 900, 1500, 2400];

export const SHOP_ITEMS: ShopItem[] = [
  { id: "rift-badge", name: "Rift Badge", price: 125, description: "A shiny badge that marks you as a true RIFT member." },
  { id: "xp-boost", name: "XP Boost", price: 300, description: "A permanent little burst of grind energy for future levels." },
  { id: "team-crest", name: "Team Crest", price: 450, description: "A dramatic crest for your clan identity." },
  { id: "legend-pack", name: "Legend Pack", price: 650, description: "The elite starter pack for the most legendary players." },
  { id: "vip-lounge", name: "VIP Lounge Access", price: 900, description: "A fancy perk for those living like champions." },
];

export function getRankForLevel(level: number): RiftRank {
  const index = Math.min(level, RIFT_RANKS.length - 1);
  return RIFT_RANKS[index];
}

export function getLevelFromXp(xp: number): number {
  let level = 0;

  while (level < levelThresholds.length - 1 && xp >= levelThresholds[level + 1]) {
    level += 1;
  }

  return level;
}

export function getXpProgress(xp: number): {
  currentLevel: number;
  currentFloor: number;
  nextFloor: number;
  progress: number;
} {
  const currentLevel = getLevelFromXp(xp);
  const currentFloor = levelThresholds[currentLevel];
  const nextFloor = levelThresholds[currentLevel + 1] ?? currentFloor;
  const progress = nextFloor === currentFloor ? 1 : (xp - currentFloor) / (nextFloor - currentFloor);

  return { currentLevel, currentFloor, nextFloor, progress };
}

export async function ensureProfile(guildId: string, userId: string, username: string): Promise<UserProfile> {
  const existing = await db.riftProfile.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });

  if (existing) {
    if (existing.username !== username) {
      const updated = await db.riftProfile.update({
        where: { guildId_userId: { guildId, userId } },
        data: { username },
      });

      return { userId, username: updated.username, balance: updated.balance, xp: updated.xp, level: updated.level, lastDaily: updated.lastDaily?.getTime() ?? null, inventory: updated.inventory ?? [] };
    }

    return {
      userId,
      username: existing.username,
      balance: existing.balance,
      xp: existing.xp,
      level: existing.level,
      lastDaily: existing.lastDaily?.getTime() ?? null,
      inventory: existing.inventory ?? [],
    };
  }

  const created = await db.riftProfile.create({
    data: {
      guildId,
      userId,
      username,
      balance: 150,
      xp: 0,
      level: 1,
      inventory: [],
    },
  });

  return {
    userId,
    username: created.username,
    balance: created.balance,
    xp: created.xp,
    level: created.level,
    lastDaily: created.lastDaily?.getTime() ?? null,
    inventory: created.inventory ?? [],
  };
}

export async function getProfile(guildId: string, userId: string, username?: string): Promise<UserProfile | undefined> {
  const record = await db.riftProfile.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });

  if (!record) {
    if (!username) return undefined;
    return ensureProfile(guildId, userId, username);
  }

  return {
    userId,
    username: record.username,
    balance: record.balance,
    xp: record.xp,
    level: record.level,
    lastDaily: record.lastDaily?.getTime() ?? null,
    inventory: record.inventory ?? [],
  };
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()} RIFT`;
}

export async function addXp(guildId: string, userId: string, username: string, amount: number): Promise<UserProfile> {
  const profile = await ensureProfile(guildId, userId, username);
  const next = await db.riftProfile.update({
    where: { guildId_userId: { guildId, userId } },
    data: {
      xp: profile.xp + amount,
      level: getLevelFromXp(profile.xp + amount) + 1,
    },
  });

  return {
    userId,
    username: next.username,
    balance: next.balance,
    xp: next.xp,
    level: next.level,
    lastDaily: next.lastDaily?.getTime() ?? null,
    inventory: next.inventory ?? [],
  };
}

export async function addBalance(guildId: string, userId: string, username: string, amount: number): Promise<UserProfile> {
  const profile = await ensureProfile(guildId, userId, username);
  const next = await db.riftProfile.update({
    where: { guildId_userId: { guildId, userId } },
    data: { balance: profile.balance + amount },
  });

  return {
    userId,
    username: next.username,
    balance: next.balance,
    xp: next.xp,
    level: next.level,
    lastDaily: next.lastDaily?.getTime() ?? null,
    inventory: next.inventory ?? [],
  };
}

export async function claimDaily(guildId: string, userId: string, username: string): Promise<{ success: boolean; message: string; profile: UserProfile }> {
  const profile = await ensureProfile(guildId, userId, username);
  const now = Date.now();
  const cooldownMs = 24 * 60 * 60 * 1000;

  if (profile.lastDaily && now - profile.lastDaily < cooldownMs) {
    const remaining = cooldownMs - (now - profile.lastDaily);
    const hours = Math.ceil(remaining / (60 * 60 * 1000));
    return {
      success: false,
      message: `Daily already claimed. Try again in about ${hours} hour(s).`,
      profile,
    };
  }

  const reward = 150 + Math.max(0, profile.level * 10);
  const next = await db.riftProfile.update({
    where: { guildId_userId: { guildId, userId } },
    data: {
      balance: profile.balance + reward,
      xp: profile.xp + 25,
      level: getLevelFromXp(profile.xp + 25) + 1,
      lastDaily: new Date(now),
    },
  });

  const updatedProfile = {
    userId,
    username: next.username,
    balance: next.balance,
    xp: next.xp,
    level: next.level,
    lastDaily: next.lastDaily?.getTime() ?? null,
    inventory: next.inventory ?? [],
  };

  return {
    success: true,
    message: `Daily reward claimed! +${formatCurrency(reward)} and +25 XP.`,
    profile: updatedProfile,
  };
}

export async function doWork(guildId: string, userId: string, username: string): Promise<{ success: boolean; message: string; profile: UserProfile }> {
  const profile = await ensureProfile(guildId, userId, username);
  const payout = Math.floor(Math.random() * 90) + 35;

  const next = await db.riftProfile.update({
    where: { guildId_userId: { guildId, userId } },
    data: {
      balance: profile.balance + payout,
      xp: profile.xp + 15,
      level: getLevelFromXp(profile.xp + 15) + 1,
    },
  });

  const updatedProfile = {
    userId,
    username: next.username,
    balance: next.balance,
    xp: next.xp,
    level: next.level,
    lastDaily: next.lastDaily?.getTime() ?? null,
    inventory: next.inventory ?? [],
  };

  return {
    success: true,
    message: `Work complete. You earned ${formatCurrency(payout)} and +15 XP.`,
    profile: updatedProfile,
  };
}

export async function gamble(guildId: string, userId: string, username: string, amount: number): Promise<{ success: boolean; message: string; profile: UserProfile }> {
  const profile = await ensureProfile(guildId, userId, username);

  if (amount <= 0) {
    return { success: false, message: "You need to wager a positive amount.", profile };
  }

  if (profile.balance < amount) {
    return { success: false, message: "You do not have enough RIFT to gamble that much.", profile };
  }

  const win = Math.random() < 0.5;
  const next = await db.riftProfile.update({
    where: { guildId_userId: { guildId, userId } },
    data: {
      balance: win ? profile.balance + amount * 2 : profile.balance - amount,
      xp: profile.xp + (win ? 30 : 10),
      level: getLevelFromXp(profile.xp + (win ? 30 : 10)) + 1,
    },
  });

  const updatedProfile = {
    userId,
    username: next.username,
    balance: next.balance,
    xp: next.xp,
    level: next.level,
    lastDaily: next.lastDaily?.getTime() ?? null,
    inventory: next.inventory ?? [],
  };

  return {
    success: true,
    message: win
      ? `Lucky! You won ${formatCurrency(amount * 2)} and gained +30 XP.`
      : `Bad luck. You lost ${formatCurrency(amount)} and gained +10 XP for the try.`,
    profile: updatedProfile,
  };
}

export async function listTopProfiles(guildId: string, limit = 5): Promise<UserProfile[]> {
  const records = await db.riftProfile.findMany({
    where: { guildId },
    orderBy: { balance: "desc" },
    take: limit,
  });

  return records.map((record) => ({
    userId: record.userId,
    username: record.username,
    balance: record.balance,
    xp: record.xp,
    level: record.level,
    lastDaily: record.lastDaily?.getTime() ?? null,
    inventory: record.inventory ?? [],
  }));
}

export async function transferFunds(
  guildId: string,
  fromUserId: string,
  fromUsername: string,
  toUserId: string,
  toUsername: string,
  amount: number,
): Promise<{ success: boolean; message: string }> {
  if (fromUserId === toUserId) {
    return { success: false, message: "You cannot give RIFT to yourself." };
  }

  if (amount <= 0) {
    return { success: false, message: "Give a positive amount of RIFT." };
  }

  const fromProfile = await ensureProfile(guildId, fromUserId, fromUsername);
  if (fromProfile.balance < amount) {
    return { success: false, message: "You do not have enough RIFT to give that much." };
  }

  const toProfile = await ensureProfile(guildId, toUserId, toUsername);

  await db.riftProfile.update({
    where: { guildId_userId: { guildId, userId: fromUserId } },
    data: { balance: fromProfile.balance - amount },
  });

  await db.riftProfile.update({
    where: { guildId_userId: { guildId, userId: toUserId } },
    data: { balance: toProfile.balance + amount },
  });

  return { success: true, message: `Transferred ${formatCurrency(amount)} to <@${toUserId}>.` };
}

export async function purchaseItem(guildId: string, userId: string, username: string, itemId: string): Promise<{ success: boolean; message: string; profile: UserProfile }> {
  const profile = await ensureProfile(guildId, userId, username);
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);

  if (!item) {
    return { success: false, message: "That item does not exist in the shop.", profile };
  }

  if (profile.balance < item.price) {
    return { success: false, message: `You need ${formatCurrency(item.price)} to buy ${item.name}.`, profile };
  }

  const nextInventory = profile.inventory.includes(item.id) ? profile.inventory : [...profile.inventory, item.id];

  const next = await db.riftProfile.update({
    where: { guildId_userId: { guildId, userId } },
    data: {
      balance: profile.balance - item.price,
      inventory: nextInventory,
    },
  });

  const updatedProfile = {
    userId,
    username: next.username,
    balance: next.balance,
    xp: next.xp,
    level: next.level,
    lastDaily: next.lastDaily?.getTime() ?? null,
    inventory: next.inventory ?? [],
  };

  return {
    success: true,
    message: `You bought ${item.name} for ${formatCurrency(item.price)}.`,
    profile: updatedProfile,
  };
}

export function getShopText(): string {
  return SHOP_ITEMS.map((item) => `• ${item.name} — ${formatCurrency(item.price)} | ${item.description}`).join("\n");
}

export async function getInventoryText(guildId: string, userId: string, username: string): Promise<string> {
  const profile = await ensureProfile(guildId, userId, username);

  if (profile.inventory.length === 0) {
    return "Your inventory is empty. Visit the shop to start collecting RIFT gear.";
  }

  return profile.inventory
    .map((itemId) => SHOP_ITEMS.find((item) => item.id === itemId)?.name ?? itemId)
    .join(", ");
}

export async function getLevelSummary(guildId: string, userId: string, username: string): Promise<{ profile: UserProfile; rank: RiftRank; progress: ReturnType<typeof getXpProgress> }> {
  const profile = await ensureProfile(guildId, userId, username);
  const rank = getRankForLevel(profile.level);
  const progress = getXpProgress(profile.xp);

  return { profile, rank, progress };
}

export const riftEconomy = {
  ensureProfile,
  getProfile,
  listTopProfiles,
  claimDaily,
  doWork,
  gamble,
  transferFunds,
  purchaseItem,
  getInventoryText,
  getShopText,
  getLevelSummary,
};
