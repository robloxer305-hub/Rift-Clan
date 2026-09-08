import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  type AudioPlayer,
  type VoiceConnection,
} from "@discordjs/voice";
import { type TextBasedChannel, type VoiceBasedChannel } from "discord.js";
import { spawn, execFileSync, type ChildProcess } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// FFmpeg — required by @discordjs/voice (prism-media) for audio transcoding
// ---------------------------------------------------------------------------

function findFfmpeg(): string {
  const envPath = process.env.FFMPEG_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  const candidates = [
    "ffmpeg",
    "ffmpeg.exe",
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
  ];

  // Search WinGet packages directory for any version of FFmpeg
  const winGetDir = join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages");
  if (existsSync(winGetDir)) {
    try {
      for (const entry of readdirSync(winGetDir)) {
        if (entry.toLowerCase().includes("ffmpeg")) {
          const binPath = join(winGetDir, entry, "ffmpeg-*", "bin", "ffmpeg.exe");
          // Try to find the actual binary with glob-like search
          const entryPath = join(winGetDir, entry);
          if (existsSync(entryPath)) {
            try {
              for (const sub of readdirSync(entryPath)) {
                if (sub.startsWith("ffmpeg-")) {
                  const exePath = join(entryPath, sub, "bin", "ffmpeg.exe");
                  if (existsSync(exePath)) candidates.push(exePath);
                }
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  for (const candidate of candidates) {
    if (candidate === "ffmpeg" || candidate === "ffmpeg.exe") {
      try {
        execFileSync(candidate, ["-version"], { stdio: "ignore", timeout: 5000 });
        return candidate;
      } catch {
        continue;
      }
    }
    if (existsSync(candidate)) return candidate;
  }

  return "ffmpeg";
}

const ffmpegPath = findFfmpeg();
if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
  console.log(`[music] Using FFmpeg at: ${ffmpegPath}`);
}

// ---------------------------------------------------------------------------
// yt-dlp — used for search + streaming
// ---------------------------------------------------------------------------

function findYtdlp(): string {
  const envPath = process.env.YTDLP_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  const candidates = [
    "yt-dlp",
    "yt-dlp.exe",
    "C:\\ProgramData\\chocolatey\\bin\\yt-dlp.exe",
    join(process.env.APPDATA || "", "Python", "Python314", "Scripts", "yt-dlp.exe"),
    join(process.env.APPDATA || "", "Python", "Python313", "Scripts", "yt-dlp.exe"),
    join(process.env.APPDATA || "", "Python", "Python312", "Scripts", "yt-dlp.exe"),
    join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python314", "Scripts", "yt-dlp.exe"),
    join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python313", "Scripts", "yt-dlp.exe"),
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
  ];

  for (const candidate of candidates) {
    if (candidate === "yt-dlp" || candidate === "yt-dlp.exe") {
      try {
        execFileSync(candidate, ["--version"], { stdio: "ignore", timeout: 5000 });
        return candidate;
      } catch {
        continue;
      }
    }
    if (existsSync(candidate)) return candidate;
  }

  return "yt-dlp";
}

const YTDLP_PATH = findYtdlp();
console.log(`[music] Using yt-dlp at: ${YTDLP_PATH}`);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Song = {
  title: string;
  url: string;
  duration: string;
  thumbnail?: string;
  requester: string;
};

export type QueueState = {
  songs: Song[];
  paused: boolean;
};

type GuildMusicState = {
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: Song[];
  current?: Song;
  paused: boolean;
};

export type PlayResult = {
  success: boolean;
  song?: Song;
  error?: string;
};

const guildStates = new Map<string, GuildMusicState>();

// ---------------------------------------------------------------------------
// yt-dlp helpers
// ---------------------------------------------------------------------------

function runYtdlp(args: string[], timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YTDLP_PATH, args);
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("yt-dlp timed out"));
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
        return;
      }
      resolve(stdout.trim());
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function searchYouTube(query: string): Promise<Song> {
  const SEP = "|||";
  const output = await runYtdlp([
    "ytsearch1:" + query,
    "--no-warnings",
    "--skip-download",
    "--no-playlist",
    `--print=%(title)s${SEP}%(webpage_url)s${SEP}%(duration_string)s${SEP}%(thumbnail)s`,
  ], 15000);

  const firstLine = output.split("\n")[0] || "";
  const parts = firstLine.split(SEP);

  if (parts.length < 2 || !parts[1] || parts[1] === "NA") {
    console.error(`[music] Search parse failed. Raw output: ${JSON.stringify(output)}`);
    throw new Error("No results were found for that search query.");
  }

  return {
    title: parts[0] || "Unknown",
    url: parts[1],
    duration: parts[2] || "Live",
    thumbnail: parts[3] && parts[3] !== "NA" ? parts[3] : undefined,
    requester: "",
  };
}

async function getSongInfo(url: string): Promise<Song> {
  const SEP = "|||";
  const output = await runYtdlp([
    url,
    "--no-warnings",
    "--skip-download",
    "--no-playlist",
    `--print=%(title)s${SEP}%(duration_string)s${SEP}%(thumbnail)s`,
  ], 15000);

  const firstLine = output.split("\n")[0] || "";
  const parts = firstLine.split(SEP);

  return {
    title: parts[0] || "Unknown",
    url,
    duration: parts[1] || "Live",
    thumbnail: parts[2] && parts[2] !== "NA" ? parts[2] : undefined,
    requester: "",
  };
}

async function resolveSong(query: string, requester: string): Promise<Song> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Please provide a valid song name or URL.");
  }

  const isUrl = /^https?:\/\//i.test(trimmed);

  try {
    let song: Song;
    if (isUrl) {
      song = await getSongInfo(trimmed);
    } else {
      song = await searchYouTube(trimmed);
    }
    song.requester = requester;
    return song;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown music error";
    if (/timed out/i.test(message)) {
      throw new Error("The request timed out. Please try again.");
    }
    throw new Error(message || "Could not resolve that song.");
  }
}

function createYtdlpStream(url: string): ChildProcess {
  const proc = spawn(YTDLP_PATH, [
    url,
    "--no-warnings",
    "-f", "bestaudio/best[acodec=opus]/bestaudio",
    "-o", "-",
    "--no-playlist",
    "--quiet",
  ]);

  proc.stderr.on("data", () => {});

  return proc;
}

// ---------------------------------------------------------------------------
// Guild state + playback
// ---------------------------------------------------------------------------

function ensureGuildState(voiceChannel: VoiceBasedChannel): GuildMusicState {
  const existing = guildStates.get(voiceChannel.guild.id);
  if (existing) return existing;

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 1,
    },
  });

  const state: GuildMusicState = {
    connection,
    player,
    queue: [],
    paused: false,
  };

  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    playNextFromQueue(state);
  });

  player.on(AudioPlayerStatus.Error, (_error) => {
    console.error("[music] AudioPlayer error, playing next song");
    state.current = undefined;
    state.paused = false;
    playNextFromQueue(state);
  });

  connection.on("error", (error) => {
    console.error("[music] Voice connection error:", error.message);
  });

  guildStates.set(voiceChannel.guild.id, state);
  return state;
}

function playNextFromQueue(state: GuildMusicState): void {
  if (state.queue.length === 0) {
    state.current = undefined;
    state.paused = false;
    return;
  }

  const nextSong = state.queue.shift();
  if (!nextSong) {
    state.current = undefined;
    state.paused = false;
    return;
  }

  state.current = nextSong;
  state.paused = false;

  try {
    const proc = createYtdlpStream(nextSong.url);
    const resource = createAudioResource(proc.stdout);
    state.player.play(resource);
  } catch (error) {
    console.error("[music] Failed to play queued song:", error);
    state.current = undefined;
    state.paused = false;
    playNextFromQueue(state);
  }
}

function playSong(state: GuildMusicState, song: Song): void {
  const proc = createYtdlpStream(song.url);
  const resource = createAudioResource(proc.stdout);
  state.current = song;
  state.paused = false;
  state.player.play(resource);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const musicPlayer = {
  play: async (
    voiceChannel: VoiceBasedChannel,
    _textChannel: TextBasedChannel,
    query: string,
    requester: string
  ): Promise<PlayResult> => {
    try {
      const song = await resolveSong(query, requester);
      const state = ensureGuildState(voiceChannel);

      playSong(state, song);
      return { success: true, song };
    } catch (error) {
      console.error("[music] Play error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to play requested song.",
      };
    }
  },

  queue: async (
    voiceChannel: VoiceBasedChannel,
    _textChannel: TextBasedChannel,
    query: string,
    requester: string
  ): Promise<PlayResult> => {
    try {
      const song = await resolveSong(query, requester);
      const state = ensureGuildState(voiceChannel);

      if (!state.current) {
        playSong(state, song);
        return { success: true, song };
      }

      state.queue.push(song);
      return { success: true, song };
    } catch (error) {
      console.error("[music] Queue error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add to queue.",
      };
    }
  },

  pause: (guildId: string): boolean => {
    const state = guildStates.get(guildId);
    if (!state || !state.current) return false;

    state.paused = true;
    state.player.pause();
    return true;
  },

  resume: (guildId: string): boolean => {
    const state = guildStates.get(guildId);
    if (!state || !state.current) return false;

    state.paused = false;
    state.player.unpause();
    return true;
  },

  skip: (guildId: string): Song | false => {
    const state = guildStates.get(guildId);
    if (!state) return false;

    const skipped = state.current ?? state.queue[0];
    if (!skipped) return false;

    if (state.queue.length > 0) {
      const nextSong = state.queue.shift();
      if (nextSong) {
        state.current = nextSong;
        try {
          playSong(state, nextSong);
        } catch {
          state.current = undefined;
        }
        return skipped;
      }
    }

    state.current = undefined;
    state.player.stop();
    return skipped;
  },

  getQueue: (guildId: string): QueueState | null => {
    const state = guildStates.get(guildId);
    if (!state) return null;

    const songs = state.current ? [state.current, ...state.queue] : [...state.queue];
    return {
      songs,
      paused: state.paused,
    };
  },

  stop: (guildId: string): boolean => {
    const state = guildStates.get(guildId);
    if (!state) return false;

    state.queue = [];
    state.current = undefined;
    state.paused = false;
    state.player.stop();
    state.connection.destroy();
    guildStates.delete(guildId);
    return true;
  },
};
