import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import {
  formatCurrency,
  getInventoryText,
  getLevelSummary,
  getProfile,
  getRankForLevel,
  getShopText,
  getXpProgress,
  riftEconomy,
  SHOP_ITEMS,
} from "../../services/riftEconomy";

const eightBallResponses = [
  "It is certain.",
  "Without a doubt.",
  "Most likely.",
  "Ask again later.",
  "Better not tell you now.",
  "Outlook not so good.",
  "Signs point to yes.",
  "Very doubtful.",
  "Yes — absolutely.",
  "The RIFT gods say yes.",
];

export const eightBallCommand = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a question")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Your question for the crystal ball")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString("question", true);
    const answer = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];

    await interaction.reply(`🎱 Question: **${question}**\n\n**Answer:** ${answer}`);
  },
};

export const shipCommand = {
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Generate a completely fictional compatibility score")
    .addUserOption((option) => option.setName("user1").setDescription("First user").setRequired(true))
    .addUserOption((option) => option.setName("user2").setDescription("Second user").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const user1 = interaction.options.getUser("user1", true);
    const user2 = interaction.options.getUser("user2", true);
    const score = Math.floor(Math.random() * 101);

    const label = score >= 80 ? "Soulmates of the RIFT" : score >= 60 ? "Solid chemistry" : score >= 40 ? "Cute tension" : "Mostly a joke";

    await interaction.reply(`💘 **${user1.username} + ${user2.username}**\nCompatibility score: **${score}%**\nVerdict: **${label}**`);
  },
};

export const gayRateCommand = {
  data: new SlashCommandBuilder()
    .setName("gayrate")
    .setDescription("Random joke percentage for a member")
    .addUserOption((option) => option.setName("user").setDescription("User to rate").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const rating = Math.floor(Math.random() * 101);

    await interaction.reply(`😂 **${user.username}** is **${rating}%** “funny energy” according to the RIFT comedy meter.`);
  },
};

export const balanceCommand = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your RIFT balance and rank"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    const profile = await riftEconomy.ensureProfile(interaction.guildId, interaction.user.id, interaction.user.username);
    const summary = await getLevelSummary(interaction.guildId, interaction.user.id, interaction.user.username);
    await interaction.reply(
      `💰 **${interaction.user.username}**\nBalance: **${formatCurrency(profile.balance)}**\nRank: **${summary.rank}**\nXP: **${profile.xp}**`,
    );
  },
};

export const dailyCommand = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily RIFT reward"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    const result = await riftEconomy.claimDaily(interaction.guildId, interaction.user.id, interaction.user.username);
    await interaction.reply(result.message);
  },
};

export const workCommand = {
  data: new SlashCommandBuilder().setName("work").setDescription("Do a job and earn virtual RIFT cash"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    const result = await riftEconomy.doWork(interaction.guildId, interaction.user.id, interaction.user.username);
    await interaction.reply(result.message);
  },
};

export const gambleCommand = {
  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Stake a virtual amount for a chance to double it")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of RIFT to wager")
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    const result = await riftEconomy.gamble(interaction.guildId, interaction.user.id, interaction.user.username, amount);
    await interaction.reply(result.message);
  },
};

export const giveCommand = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Give another user some of your virtual RIFT")
    .addUserOption((option) => option.setName("user").setDescription("User to give RIFT to").setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of RIFT to give")
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    const user = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);
    const result = await riftEconomy.transferFunds(interaction.guildId, interaction.user.id, interaction.user.username, user.id, user.username, amount);
    await interaction.reply(result.message);
  },
};

export const richestCommand = {
  data: new SlashCommandBuilder().setName("richest").setDescription("See the richest RIFT members in the server"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    const list = await riftEconomy.listTopProfiles(interaction.guildId, 5);
    const content = list.length
      ? list
          .map((profile, index) => `${index + 1}. ${profile.username} — ${formatCurrency(profile.balance)}`)
          .join("\n")
      : "No one has any RIFT yet.";

    await interaction.reply(`🏆 **RIFT Rich List**\n\n${content}`);
  },
};

export const levelCommand = {
  data: new SlashCommandBuilder().setName("level").setDescription("Show your current RIFT rank and progression"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    const summary = await getLevelSummary(interaction.guildId, interaction.user.id, interaction.user.username);
    const progress = getXpProgress(summary.profile.xp);
    await interaction.reply(
      `📈 **${interaction.user.username}**\nRank: **${summary.rank}**\nLevel: **${summary.profile.level}**\nXP: **${summary.profile.xp}**\nProgress: **${Math.round(progress.progress * 100)}%**`,
    );
  },
};

export const xpCommand = {
  data: new SlashCommandBuilder().setName("xp").setDescription("Check your current XP and next rank progress"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    const profile = await getProfile(interaction.guildId, interaction.user.id, interaction.user.username);
    if (!profile) {
      await interaction.reply("You do not have a RIFT profile yet.");
      return;
    }

    const progress = getXpProgress(profile.xp);
    await interaction.reply(
      `✨ **XP Overview**\nCurrent XP: **${profile.xp}**\nCurrent Level: **${profile.level}**\nNext goal: **${progress.nextFloor} XP**\nProgress: **${Math.round(progress.progress * 100)}%**`,
    );
  },
};

export const riftEconomyCommands = [
  eightBallCommand,
  shipCommand,
  gayRateCommand,
  balanceCommand,
  dailyCommand,
  workCommand,
  gambleCommand,
  giveCommand,
  richestCommand,
  levelCommand,
  xpCommand,
];

export default riftEconomyCommands;
