import {
  ChannelType,
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { ticketManager } from "../../services/ticketManager";

export const ticketCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open or close a support ticket")
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Open or close")
        .setRequired(true)
        .addChoices(
          { name: "Open", value: "open" },
          { name: "Close", value: "close" },
        ),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Ticket reason").setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
    }

    const action = interaction.options.getString("action", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    if (action === "open") {
      await interaction.deferReply();

      const channel = await ticketManager.createTicket(interaction.guild, interaction.user.id, reason);

      const embed = new EmbedBuilder()
        .setColor("#10B981")
        .setTitle("🎫 Support Ticket")
        .setDescription(`**Opened by:** <@${interaction.user.id}>\n**Reason:** ${reason}`)
        .setTimestamp();

      await channel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [embed],
      });

      return interaction.editReply({
        content: `✅ Created a ticket: <#${channel.id}>`,
      });
    }

    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: "This channel is not a valid ticket channel.",
        ephemeral: true,
      });
    }

    const existing = ticketManager.getTicket(channel.id);
    if (!existing) {
      return interaction.reply({
        content: "This channel is not currently a tracked support ticket.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    await ticketManager.closeTicket(channel, interaction.user.id, reason);
    await interaction.editReply({
      content: "✅ Ticket closed.",
    });
  },
};

export const ticketCommands = [ticketCommand];

export default ticketCommand;
