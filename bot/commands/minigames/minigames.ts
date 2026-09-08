import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

export const coinflipCommand = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin and reveal the result"),

  async execute(interaction: ChatInputCommandInteraction) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    await interaction.reply(`🪙 Coinflip result: **${result}**`);
  },
};

export const rpsCommand = {
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play rock-paper-scissors against the bot")
    .addStringOption((option) =>
      option
        .setName("choice")
        .setDescription("Choose rock, paper, or scissors")
        .setRequired(true)
        .addChoices(
          { name: "Rock", value: "rock" },
          { name: "Paper", value: "paper" },
          { name: "Scissors", value: "scissors" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const choice = interaction.options.getString("choice", true) as "rock" | "paper" | "scissors";
    const options = ["rock", "paper", "scissors"] as const;
    const botChoice = options[Math.floor(Math.random() * options.length)];

    const outcomes: Record<string, string> = {
      rock: { rock: "Tie", paper: "Bot wins", scissors: "You win" },
      paper: { rock: "You win", paper: "Tie", scissors: "Bot wins" },
      scissors: { rock: "Bot wins", paper: "You win", scissors: "Tie" },
    };

    const result = outcomes[choice][botChoice];

    await interaction.reply(
      `✊ You picked **${choice}**\n🤖 Bot picked **${botChoice}**\n
Result: **${result}**`
    );
  },
};

export const minigameCommands = [coinflipCommand, rpsCommand];

export default { coinflipCommand, rpsCommand };
