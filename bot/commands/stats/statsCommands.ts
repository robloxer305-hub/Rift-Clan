import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

export const statsCommand = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("View your or another member's Discord stats")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to inspect").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const embed = new EmbedBuilder()
      .setColor("#8B5CF6")
      .setTitle(`Stats for ${targetUser.username}`)
      .setDescription(
        `**ID:** ${targetUser.id}\n` +
          `**Tag:** ${targetUser.tag}\n` +
          `**Joined:** ${member?.joinedAt?.toUTCString() ?? "Unknown"}\n` +
          `**Roles:** ${member?.roles.cache.size ?? 0}`
      )
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const statsCommands = [statsCommand];

export default statsCommand;
