"use client";

import { motion } from "framer-motion";
import GameCard from "@/components/GameCard";

type Game = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  themeColor: string | null;
  _count: { leaderboardEntries: number };
};

type Props = { games: Game[] };

export default function GameCardGrid({ games }: Props) {
  return (
    <div className="game-grid">
      {games.map((game, i) => (
        <motion.div
          key={game.id}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * 0.08,
            duration: 0.45,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <GameCard
            title={game.name}
            slug={game.slug}
            description={game.description ?? ""}
            players={game._count.leaderboardEntries}
            themeColor={game.themeColor}
          />
        </motion.div>
      ))}
    </div>
  );
}
