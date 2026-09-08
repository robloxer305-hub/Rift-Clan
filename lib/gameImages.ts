const gameImages: Record<string, string> = {
  valorant: "/images/Valorant%20BG.jpg",
  roblox: "/images/Roblox%20BG.jpg",
  minecraft: "/images/Minecraft%20BG.jpg",
  cs2: "/images/CS%202%20BG.jpg",
  brawlhalla: "/images/Brawlhalla%20BG.jpg",
};

export function getGameImage(slug: string): string | undefined {
  return gameImages[slug];
}
