import { REST, Routes } from "discord.js";
import { env } from "../lib/env";
import { commands } from "./commands";

export async function deployCommands(): Promise<void> {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_CLIENT_ID || !env.DISCORD_GUILD_ID) {
    console.warn("Skipping slash-command deployment because Discord env vars are missing.");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);
  const payload = commands.map((command) => command.data.toJSON());

  try {
    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
      { body: payload }
    );

    console.log(`✅ Registered ${payload.length} slash commands to guild ${env.DISCORD_GUILD_ID}`);
  } catch (error) {
    console.error("Failed to deploy slash commands:", error);
  }
}
