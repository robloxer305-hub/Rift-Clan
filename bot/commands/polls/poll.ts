import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";

const activePolls = new Map<string, {
  id: string;
  question: string;
  choices: string[];
  votes: Map<string, number>;
  voters: Map<string, number>;
  authorId: string;
}>();

const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"];

function buildPollEmbed(poll: { question: string; choices: string[]; votes: Map<string, number> }) {
  const totalVotes = Array.from(poll.votes.values()).reduce((a, b) => a + b, 0);

  const description = poll.choices
    .map((choice, index) => {
      const count = poll.votes.get(String(index)) ?? 0;
      const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const bar = totalVotes > 0 ? "█".repeat(Math.round(percent / 10)) + "░".repeat(10 - Math.round(percent / 10)) : "░░░░░░░░░░";
      return `${numberEmojis[index] ?? ""} **${choice}**\n${bar} ${count} vote${count !== 1 ? "s" : ""} (${percent}%)`;
    })
    .join("\n\n");

  return new EmbedBuilder()
    .setColor("#22C55E")
    .setTitle("📊 Poll")
    .setDescription(`**${poll.question}**\n\n${description}`)
    .setFooter({ text: `${totalVotes} total vote${totalVotes !== 1 ? "s" : ""}` });
}

function buildPollButtons(pollId: string, choiceCount: number, disabled = false) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  const firstRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...Array.from({ length: Math.min(choiceCount, 5) }, (_, i) =>
      new ButtonBuilder()
        .setCustomId(`poll:${pollId}:${i}`)
        .setLabel(`${i + 1}`)
        .setEmoji(numberEmojis[i]!)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
    ),
  );
  rows.push(firstRow);

  if (choiceCount > 5) {
    const secondRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...Array.from({ length: choiceCount - 5 }, (_, i) =>
        new ButtonBuilder()
          .setCustomId(`poll:${pollId}:${i + 5}`)
          .setLabel(`${i + 6}`)
          .setEmoji(numberEmojis[i + 5]!)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled),
      ),
    );
    rows.push(secondRow);
  }

  return rows;
}

export const pollCommand = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create an interactive poll with vote buttons")
    .addStringOption((option) =>
      option.setName("question").setDescription("Poll question").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("options")
        .setDescription("Poll options separated by a pipe, e.g. Yes|No|Maybe")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString("question", true);
    const rawOptions = interaction.options.getString("options", true);

    const choices = rawOptions
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (choices.length < 2) {
      return interaction.reply({
        content: "Please provide at least 2 options separated by `|`.",
        flags: 64,
      });
    }

    const pollId = `${interaction.user.id}-${Date.now()}`;
    const votes = new Map<string, number>();
    for (let i = 0; i < choices.length; i++) {
      votes.set(String(i), 0);
    }

    const poll = {
      id: pollId,
      question,
      choices,
      votes,
      voters: new Map<string, number>(),
      authorId: interaction.user.id,
    };
    activePolls.set(pollId, poll);

    const embed = buildPollEmbed(poll);
    const components = buildPollButtons(pollId, choices.length);

    await interaction.reply({ embeds: [embed], components });
  },
};

export const handlePollButtonInteraction = async (interaction: ButtonInteraction): Promise<boolean> => {
  const parts = interaction.customId.split(":");
  if (parts[0] !== "poll") return false;

  const [, pollId, indexStr] = parts;
  const poll = activePolls.get(pollId ?? "");
  if (!poll) {
    await interaction.reply({ content: "This poll is no longer active.", flags: 64 });
    return true;
  }

  const optionIndex = Number(indexStr);
  if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= poll.choices.length) return false;

  const userId = interaction.user.id;

  const previousVote = poll.voters.get(userId);
  if (previousVote !== undefined) {
    if (previousVote === optionIndex) {
      await interaction.reply({ content: "You already voted for this option.", flags: 64 });
      return true;
    }
    const prevCount = poll.votes.get(String(previousVote)) ?? 0;
    poll.votes.set(String(previousVote), Math.max(0, prevCount - 1));
  }

  poll.voters.set(userId, optionIndex);
  const currentCount = poll.votes.get(String(optionIndex)) ?? 0;
  poll.votes.set(String(optionIndex), currentCount + 1);

  const embed = buildPollEmbed(poll);
  const components = buildPollButtons(poll.id, poll.choices.length);

  await interaction.update({ embeds: [embed], components });
  return true;
};
