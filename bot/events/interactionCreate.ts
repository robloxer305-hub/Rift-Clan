import type { Interaction } from "discord.js";

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  console.log(`Slash command used: ${interaction.commandName}`);
}
