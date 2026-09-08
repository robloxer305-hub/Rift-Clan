import { EmbedBuilder, type EmbedData } from "discord.js";

export function createRiftEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("#4F46E5")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

export function createErrorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor("#EF4444")
    .setTitle("⚠️ Error")
    .setDescription(description)
    .setTimestamp();
}

export function buildEmbed(data: EmbedData): EmbedBuilder {
  return new EmbedBuilder(data);
}
