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
        <span className="relative inline-block text-rift-red">
          CLAN
          {/* Glow blur */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none blur-3xl opacity-50 text-rift-red"
          >
            CLAN
          </span>
          {/* Animated underline */}
          <motion.span
            aria-hidden
            className="absolute bottom-0 left-0 h-[3px] rounded-full bg-gradient-to-r from-rift-red via-rift-red-glow to-transparent"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.55, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ width: "100%" }}
          />
        </span>
      </motion.h1>

      {/* Sub-headline */}
      <motion.p
        variants={item}
        className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground"
      >
        Compete. Challenge. Conquer. Climb the ranks across{" "}
        <strong className="font-semibold text-foreground/90">Valorant, CS2, Minecraft, Roblox,</strong>{" "}
        and{" "}
        <strong className="font-semibold text-foreground/90">Brawlhalla</strong>{" "}
        — synced live from Discord.
      </motion.p>

      {/* Feature pills */}
      <motion.div variants={item} className="mt-5 flex flex-wrap gap-2">
        {["Real-time sync", "Discord-native", "Multi-game"].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </motion.div>

      {/* CTAs */}
      <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/leaderboards"
          id="hero-view-leaderboards"
          className="btn-primary group px-5 py-2.5 text-sm"
        >
          View Leaderboards
          <span className="ml-1.5 transition-transform group-hover:translate-x-1">→</span>
        </Link>

        <Link
          href="/members"
          id="hero-view-members"
          className="btn-ghost group px-5 py-2.5 text-sm"
        >
          Meet the Clan
          <span className="ml-1.5 opacity-60 transition-opacity group-hover:opacity-100">↓</span>
        </Link>
      </motion.div>
    </motion.div>
  );
}
