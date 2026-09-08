import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

const birthdayMessages = [
  "Wishing you a day filled with happiness and a year filled with joy!",
  "Happy Birthday! May all your dreams and wishes come true!",
  "Another adventure-filled year awaits you. Make it spectacular!",
  "Hope your birthday is as amazing as you are!",
  "Happy Birthday! Time to party like it's your birthday... because it is!",
  "May this special day bring you endless joy and unforgettable moments!",
  "Cheers to another year of being awesome! Happy Birthday!",
  "Wishing you the happiest of birthdays and a wonderful year ahead!",
];

const cakeEmojis = ["🎂", "🎉", "🥳", "🎈", "🎁", "🍰", "🧁", "🎀"];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export const happyBirthdayCommand = {
  data: new SlashCommandBuilder()
    .setName("happybirthday")
    .setDescription("Wish someone a happy birthday!")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The person to wish happy birthday to")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user", true);
    const message = randomFrom(birthdayMessages);
    const cake = randomFrom(cakeEmojis);

    const embed = new EmbedBuilder()
      .setTitle(`${cake} Happy Birthday, ${user.username}! ${cake}`)
      .setDescription(message)
      .setColor("#F59E0B")
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setFooter({
        text: `Wished by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ size: 64 }),
      })
      .setTimestamp();

    await interaction.reply({ content: `<@${user.id}>`, embeds: [embed] });
  },
};

export default happyBirthdayCommand;
