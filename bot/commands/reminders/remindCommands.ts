import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

const reminderTimers = new Map<string, NodeJS.Timeout>();

function parseDuration(input: string): number | null {
  const match = input.match(/^((?:\d+\.?\d*)\s*(ms|s|m|h|d))$/i);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "ms": return value;
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

export const remindCommand = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder for yourself")
    .addStringOption((option) =>
      option.setName("time").setDescription("Example: 10m, 2h, 30s").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("message").setDescription("Reminder message").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const timeText = interaction.options.getString("time", true);
    const messageText = interaction.options.getString("message", true);

    const delayMs = parseDuration(timeText);
    if (!delayMs || delayMs <= 0) {
      return interaction.reply({
        content: "Use a valid duration like `10s`, `5m`, `2h`, or `1d`.",
        ephemeral: true,
      });
    }

    const reminderId = `${interaction.user.id}:${Date.now()}`;
    const timer = setTimeout(async () => {
      const channel = interaction.channel;
      if (channel) {
        await channel.send(`⏰ Reminder for <@${interaction.user.id}>: ${messageText}`);
      }
      reminderTimers.delete(reminderId);
    }, delayMs);

    reminderTimers.set(reminderId, timer);

    const embed = new EmbedBuilder()
      .setColor("#F59E0B")
      .setTitle("⏰ Reminder set")
      .setDescription(`I will remind you about: **${messageText}**\n\nTime: **${timeText}**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const reminderCommands = [remindCommand];

export default remindCommand;
