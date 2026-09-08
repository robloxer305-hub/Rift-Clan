import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RiftBallGameWrapper from "@/components/RiftBallGameWrapper";

export default async function RiftBallPage() {
  return (
    <main className="relative min-h-screen">
      <div className="bg-rift-glow pointer-events-none fixed inset-0 z-0" aria-hidden />

      <div className="relative z-10 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Navbar />

          <section className="relative mt-12 mb-12">
            <div className="pointer-events-none absolute -left-8 top-12 h-24 w-24 rounded-full bg-rift-red/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 top-20 h-28 w-28 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-10 bottom-0 h-32 rounded-full bg-cyan-400/5 blur-3xl" />
            <div className="relative z-10">
              <RiftBallGameWrapper />
            </div>
          </section>

          <section className="mx-auto mt-12 mb-12 w-full max-w-2xl">
            <div className="glass-panel overflow-hidden rounded-2xl border border-border/60">
              <div className="border-b border-border/60 bg-secondary/40 px-6 py-5">
                <p className="rift-eyebrow text-rift-red">About</p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
                  The Game
                </h2>
              </div>

              <div className="p-6 text-sm leading-relaxed text-muted-foreground">
                <p className="mb-4">
                  RiftBall is a fast-paced 2D football arena game where you compete against AI opponents.
                  Control your player, dodge defenders, and score goals to win.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="mb-2 font-semibold text-foreground">Game Rules</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• You play as Home Team (Red), defending the left goal and attacking the right goal</li>
                      <li>• Opponent (Purple) defends the right goal and attacks the left goal</li>
                      <li>• Standard 90-second match clock with kickoff resets after each goal</li>
                      <li>• Realistic elastic player tackles and ball bounce physics</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-foreground">Pro Controls & Tips</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• <span className="font-mono text-foreground font-semibold">WASD / Arrow Keys</span> — Analog dribbling; touching the ball takes active possession</li>
                      <li>• <span className="font-mono text-cyan-400 font-semibold">HOLD SHIFT</span> — Sprint turbo (+45% speed with stamina recharge)</li>
                      <li>• <span className="font-mono text-amber-400 font-semibold">HOLD & RELEASE SPACE (WITH BALL)</span> — Charge up shot power up to 100% and release to strike the ball with speed proportional to hold duration</li>
                      <li>• <span className="font-mono text-emerald-400 font-semibold">HOLD SPACE (WITHOUT BALL)</span> — Enters Defending Stance (player is slowed to 55% speed); coming near the ball carrier immediately tackles and steals the ball away!</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6">
                  <Link href="/" className="text-rift-red hover:underline">
                    ← Back to home
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <Footer />
        </div>
      </div>
    </main>
  );
}
