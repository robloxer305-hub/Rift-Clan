"use client";

import dynamic from "next/dynamic";

const RiftBallGameCanvas = dynamic(
  () => import("@/components/RiftBallGameCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="glass-panel rounded-xl border border-border/60 px-6 py-12 text-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    ),
  }
);

export default function RiftBallGameWrapper() {
  return <RiftBallGameCanvas />;
}
