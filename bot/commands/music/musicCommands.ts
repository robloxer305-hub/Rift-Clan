import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { musicPlayer } from "../../services/musicPlayer";
import { createErrorEmbed, createRiftEmbed } from "../../utils/embedBuilder";

export const playCommand = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play music from YouTube or search queries")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The song name or URL to play")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        embeds: [createErrorEmbed("You must be in a voice channel to play music!")],
        flags: 64,
      });
    }

    const query = interaction.options.getString("query", true);

    try {
      await interaction.deferReply();
    } catch {
      return;
    }

    const result = await musicPlayer.play(
      voiceChannel,
      interaction.channel!,
      query,
      interaction.user.tag
    );

    if (!result.success || !result.song) {
      return interaction.editReply({
        embeds: [createErrorEmbed(result.error || "Failed to play requested song.")],
      });
    }

    const embed = createRiftEmbed(
      "🎵 Now Playing",
      `**[${result.song.title}](${result.song.url})**\n` +
        `⏱ Duration: \`${result.song.duration}\`\n` +
        `👤 Requested by: <@${interaction.user.id}>`
    );
    if (result.song.thumbnail) {
      embed.setThumbnail(result.song.thumbnail);
    }

    return interaction.editReply({ embeds: [embed] });
  },
};

export const pauseCommand = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Pause current music playback"),
  async execute(interaction: ChatInputCommandInteraction) {
    const paused = musicPlayer.pause(interaction.guildId!);
    if (!paused) {
      return interaction.reply({
        embeds: [createErrorEmbed("No music is currently playing or it is already paused.")],
        ephemeral: true,
      });
    }
    return interaction.reply({
      embeds: [createRiftEmbed("⏸️ Paused", "Music playback has been paused.")],
    });
  },
};

export const resumeCommand = {
  data: new SlashCommandBuilder().setName("resume").setDescription("Resume paused music playback"),
  async execute(interaction: ChatInputCommandInteraction) {
    const resumed = musicPlayer.resume(interaction.guildId!);
    if (!resumed) {
      return interaction.reply({
        embeds: [createErrorEmbed("No music is currently paused.")],
        ephemeral: true,
      });
    }
    return interaction.reply({
      embeds: [createRiftEmbed("▶️ Resumed", "Music playback has been resumed.")],
    });
  },
};

export const skipCommand = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Skip the current song"),
  async execute(interaction: ChatInputCommandInteraction) {
    const skipped = musicPlayer.skip(interaction.guildId!);
    if (!skipped) {
      return interaction.reply({
        embeds: [createErrorEmbed("There are no songs in the queue to skip.")],
        ephemeral: true,
      });
    }
    return interaction.reply({
      embeds: [createRiftEmbed("⏭️ Skipped", `Skipped **${skipped.title}**`)],
    });
  },
};

export const queueCommand = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Add a song to the queue or view the current queue")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Song name or URL to add to queue (omit to view queue)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const query = interaction.options.getString("query");

    if (query) {
      const member = interaction.member as GuildMember;
      const voiceChannel = member?.voice?.channel;

      if (!voiceChannel) {
        return interaction.reply({
          embeds: [createErrorEmbed("You must be in a voice channel to add songs to the queue!")],
          flags: 64,
        });
      }

      try {
        await interaction.deferReply();
      } catch {
        return;
      }

      const result = await musicPlayer.queue(
        voiceChannel,
        interaction.channel!,
        query,
        interaction.user.tag
      );

      if (!result.success || !result.song) {
        return interaction.editReply({
          embeds: [createErrorEmbed(result.error || "Failed to add song to queue.")],
        });
      }

      const embed = createRiftEmbed(
        "📜 Added to Queue",
        `**[${result.song.title}](${result.song.url})**\n` +
          `⏱ Duration: \`${result.song.duration}\`\n` +
          `👤 Requested by: <@${interaction.user.id}>`
      );
      if (result.song.thumbnail) {
        embed.setThumbnail(result.song.thumbnail);
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // No query — display the current queue
    const queue = musicPlayer.getQueue(interaction.guildId!);
    if (!queue || queue.songs.length === 0) {
      return interaction.reply({
        embeds: [createRiftEmbed("📜 Music Queue", "The music queue is currently empty.")],
      });
    }

    const current = queue.songs[0]!;
    const upcoming = queue.songs.slice(1, 10);

    let desc = `**Now Playing:**\n[${current.title}](${current.url}) (\`${current.duration}\`)\n\n`;

    if (upcoming.length > 0) {
      desc += `**Up Next:**\n` + upcoming
        .map(
          (
            song: { title: string; url: string; duration: string },
            index: number
          ) => `${index + 1}. [${song.title}](${song.url}) (\`${song.duration}\`)`
        )
        .join("\n");
    } else {
      desc += `*No more tracks in queue.*`;
    }

    const embed = createRiftEmbed("📜 Music Queue", desc);
    return interaction.reply({ embeds: [embed] });
  },
};

export const stopCommand = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Stop music and disconnect the bot"),
  async execute(interaction: ChatInputCommandInteraction) {
    const stopped = musicPlayer.stop(interaction.guildId!);
    if (!stopped) {
      return interaction.reply({
        embeds: [createErrorEmbed("The bot is not currently in a voice channel.")],
        ephemeral: true,
      });
    }
    return interaction.reply({
      embeds: [createRiftEmbed("⏹️ Stopped", "Disconnected from voice and cleared the queue.")],
    });
  },
};
