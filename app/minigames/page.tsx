import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MiniGamesArcade from "@/components/MiniGamesArcade";

export const metadata = {
  title: "MiniGames",
  description: "Play RIFT mini-games on the web and in Discord.",
};

export default function MiniGamesPage() {
  return (
    <main className="relative min-h-screen">
      <div className="bg-rift-glow pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="relative z-10 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Navbar />

          <header className="mt-12 mb-8">
            <p className="rift-eyebrow text-rift-red"><span className="live-dot mr-2" />RIFT Arcade</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold uppercase tracking-wide">MiniGames</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Quick games for the moments between matches. Play RiftBall here in the browser.
            </p>
          </header>

          <section className="mb-10">
            <MiniGamesArcade />
          </section>

          <section className="mb-10">
            <article className="glass-panel relative overflow-hidden rounded-2xl p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden />
              <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
                <div className="max-w-xl">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300">Playable in browser</p>
                  <h2 className="mt-2 font-display text-3xl font-bold uppercase">RiftBall</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    A fast 2D football arena. Control your player, outplay the AI, and score before the clock runs out.
                  </p>
                </div>
                <Link href="/riftball" className="btn-primary shrink-0">Play RiftBall <span className="ml-2">→</span></Link>
              </div>
            </article>
          </section>

          <Footer />
        </div>
      </div>
    </main>
  );
}