import { spawn, execFileSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

function findYtdlp(): string {
  const candidates = [
    "yt-dlp",
    "yt-dlp.exe",
    join(process.env.APPDATA || "", "Python", "Python314", "Scripts", "yt-dlp.exe"),
    join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python314", "Scripts", "yt-dlp.exe"),
  ];
  for (const c of candidates) {
    if (c === "yt-dlp" || c === "yt-dlp.exe") {
      try { execFileSync(c, ["--version"], { stdio: "ignore", timeout: 5000 }); return c; } catch { continue; }
    }
    if (existsSync(c)) return c;
  }
  return "yt-dlp";
}

const YTDLP_PATH = findYtdlp();
console.log("Using:", YTDLP_PATH);

function run(args: string[], timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_PATH, args);
    let out = "", err = "";
    const timer = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error("timeout")); }, timeoutMs);
    proc.stdout.on("data", (c: Buffer) => { out += c; });
    proc.stderr.on("data", (c: Buffer) => { err += c; });
    proc.on("close", (code) => { clearTimeout(timer); code === 0 ? resolve(out.trim()) : reject(new Error(err.trim())); });
    proc.on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

async function test() {
  // Test 1: Search
  console.log("=== Test 1: Search (ytsearch) ===");
  const searchOut = await run([
    "ytsearch1:Never Gonna Give You Up",
    "--no-warnings", "--skip-download", "--no-playlist",
    "--print", "%(title)s",
    "--print", "%(webpage_url)s",
    "--print", "%(duration_string)s",
    "--print", "%(thumbnail)s",
  ]);
  const sLines = searchOut.split("\n");
  console.log("Title:", sLines[0]);
  console.log("URL:", sLines[1]);
  console.log("Duration:", sLines[2]);
  console.log("Thumbnail:", sLines[3]);

  if (!sLines[1] || sLines[1] === "NA") {
    console.error("FAIL: search returned no URL");
    return;
  }

  // Test 2: Stream from URL
  console.log("\n=== Test 2: Stream ===");
  const proc = spawn(YTDLP_PATH, [
    sLines[1],
    "--no-warnings",
    "-f", "bestaudio/best[acodec=opus]/bestaudio",
    "-o", "-",
    "--no-playlist",
    "--quiet",
  ]);
  proc.stderr.on("data", () => {});

  let bytes = 0, chunks = 0;
  proc.stdout.on("data", (c: Buffer) => {
    bytes += c.length;
    chunks++;
    if (chunks <= 3) console.log(`Chunk #${chunks}: ${c.length} bytes`);
    if (chunks === 3) {
      console.log(`\nStream working! ${chunks} chunks, ${bytes} bytes`);
      console.log("ALL TESTS PASSED");
      proc.kill();
    }
  });

  proc.on("close", () => console.log("Stream closed"));
}

test().catch(console.error);
