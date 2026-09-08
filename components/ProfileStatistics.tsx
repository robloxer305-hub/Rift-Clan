type GameStats = {
  gameName: string;
  themeColor: string | null;
  played: number;
  won: number;
  lost: number;
  winRate: number;
  lossRate: number;
};

type Props = { stats: GameStats[] };

export default function ProfileStatistics({ stats }: Props) {
  return (
    <section>
      <p className="rift-eyebrow mb-4">Statistics</p>
      {stats.length === 0 ? (
        <div className="glass-panel rounded-xl py-10 text-center text-sm text-muted-foreground">
          Match statistics will appear here after this player has completed a logged match.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((game) => (
            <article
              key={game.gameName}
              className="glass-panel rounded-xl p-4"
              style={game.themeColor ? { borderColor: `${game.themeColor}44` } : undefined}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold uppercase">{game.gameName}</h2>
                <span className="h-2 w-2 rounded-full" style={{ background: game.themeColor ?? "hsl(var(--primary))" }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Played" value={game.played} />
                <Stat label="Won" value={game.won} valueClass="text-emerald-400" />
                <Stat label="Lost" value={game.lost} valueClass="text-rift-red" />
              </div>
              <div className="mt-4 flex justify-between border-t border-border/40 pt-3 font-mono text-[10px]">
                <span className="text-emerald-400">Win rate {game.winRate}%</span>
                <span className="text-rift-red">Loss rate {game.lossRate}%</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, valueClass = "text-foreground" }: { label: string; value: number; valueClass?: string }) {
  return (
    <div className="rounded-md bg-secondary/60 px-2 py-2">
      <p className={`font-display text-xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
