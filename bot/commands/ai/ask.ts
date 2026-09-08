import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { aiChatbot } from "../../services/aiChatbot";

export const askCommand = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the RIFT assistant a quick question")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Your question for the bot")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString("question", true);

    await interaction.deferReply();

    const response = await aiChatbot.ask(question);

    const embed = new EmbedBuilder()
      .setColor("#4F46E5")
      .setTitle("AI Assistant")
      .setDescription(response)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export const aiCommands = [askCommand];

export default askCommand;
