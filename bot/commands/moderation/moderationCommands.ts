import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

function hasModeratorPermission(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers) ?? false;
}

export const kickCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to kick").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for the kick").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !hasModeratorPermission(interaction)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: "That user is not a member of this server.",
        ephemeral: true,
      });
    }

    await member.kick(reason);
    await interaction.reply(`✅ Kicked **${user.tag}** for: ${reason}`);
  },
};

export const banCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason for the ban").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        content: "You do not have permission to ban users.",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    await interaction.guild.members.ban(user, { reason });
    await interaction.reply(`✅ Banned **${user.tag}** for: ${reason}`);
  },
};

export const moderationCommands = [kickCommand, banCommand];

export default { kickCommand, banCommand };
