"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function HeroSection() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col items-start"
    >
      {/* Eyebrow */}
      <motion.div variants={item} className="flex items-center gap-2">
        <span className="live-dot" />
        <span className="rift-eyebrow text-rift-red">Live Competitive Rankings</span>
      </motion.div>

      {/* Wordmark */}
      <motion.h1
        variants={item}
        className="mt-4 font-display text-[clamp(3.5rem,9vw,7rem)] font-extrabold uppercase leading-[0.9] tracking-tight text-foreground"
      >
        RIFT{" "}
        <span className="relative text-rift-red">
          CLAN
          {/* subtle text glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 blur-2xl opacity-40 text-rift-red-glow select-none"
          >
            CLAN
          </span>
        </span>
      </motion.h1>

      {/* Sub-headline */}
      <motion.p
        variants={item}
        className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground"
      >
        Compete. Challenge. Conquer. Climb the ranks across{" "}
        <span className="text-foreground/80">Valorant, CS2, Minecraft, Roblox,</span> and{" "}
        <span className="text-foreground/80">Brawlhalla</span> — synced live from Discord.
      </motion.p>

      {/* CTAs */}
      <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/leaderboards"
          id="hero-view-leaderboards"
          className="btn-primary group"
        >
          View Leaderboards
          <span className="ml-1.5 transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </motion.div>
    </motion.div>
  );
}
