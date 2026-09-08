import "dotenv/config";
import { Client, Collection, GatewayIntentBits, type ChatInputCommandInteraction, type Message } from "discord.js";
import { env } from "../lib/env";
import { db } from "../lib/db";
import { matchChannelByGameSlug } from "../lib/matchChannels";
import { leaderboardChannelByGameSlug } from "../lib/leaderboardChannels";
import { isLeaderboardMessage, parseLeaderboardMessage } from "./leaderboardParser";
import { syncLeaderboard } from "./syncLeaderboard";
import { commands } from "./commands";
import { deployCommands } from "./deployCommands";
import { handleArcadeButtonInteraction, handleHangmanModalSubmit } from "./commands/minigames/arcadeGames";
import { handlePollButtonInteraction } from "./commands/polls/poll";

const token = env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error("DISCORD_BOT_TOKEN is missing. Add it to your .env file and restart the bot.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const commandMap = new Collection<string, (typeof commands)[number]>();
for (const command of commands) {
  commandMap.set(command.data.name, command);
}

async function storeMatchLog(message: Message) {
  const gameSlug = Object.entries(matchChannelByGameSlug).find(([, channelId]) => channelId === message.channelId)?.[0];
  if (!gameSlug || !message.content.trim()) return;

  const game = await db.game.findUnique({ where: { slug: gameSlug } });
  if (!game) return;

  const mentionedDiscordIds = Array.from(
    new Set(Array.from(message.content.matchAll(/<@!?(\d{15,20})>/g), (match) => match[1])),
  );
  for (const discordId of mentionedDiscordIds) {
    const member = message.guild
      ? await message.guild.members.fetch(discordId).catch(() => null)
      : null;
    const discordUser = member?.user ?? await client.users.fetch(discordId).catch(() => null);
    if (!discordUser) continue;

    await db.user.upsert({
      where: { discordId },
      update: {
        username: member?.displayName ?? discordUser.username,
        avatar: discordUser.avatar,
      },
      create: {
        discordId,
        username: member?.displayName ?? discordUser.username,
        avatar: discordUser.avatar,
      },
    });
  }

  await db.discordMessage.upsert({
    where: { discordMessageId: message.id },
    update: { content: message.content, editedAt: message.editedAt, processedAt: new Date(), processingError: null },
    create: {
      discordMessageId: message.id,
      channelId: message.channelId,
      gameId: game.id,
      authorDiscordId: message.author.id,
      content: message.content,
      messageUrl: message.url,
      editedAt: message.editedAt,
      processedAt: new Date(),
    },
  });
}

async function syncLeaderboardMessage(message: Message) {
  const gameSlug = Object.entries(leaderboardChannelByGameSlug).find(([, channelId]) => channelId === message.channelId)?.[0];
  if (!gameSlug || !message.content.trim() || !isLeaderboardMessage(message.content)) return;

  await syncLeaderboard({
    gameSlug,
    entries: parseLeaderboardMessage(message.content),
    discordMessageId: message.id,
    channelId: message.channelId,
    authorDiscordId: message.author.id,
    messageContent: message.content,
    messageUrl: message.url,
    editedAt: message.editedAt,
    guild: message.guild,
  });
}

async function processMessage(message: Message) {
  await storeMatchLog(message);
  await syncLeaderboardMessage(message);
}

client.once("ready", async () => {
  console.log(`✅ RIFT bot is online as ${client.user?.tag ?? "unknown"}`);

  for (const channelId of Object.values(matchChannelByGameSlug)) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !("messages" in channel)) continue;
    let before: string | undefined;
    while (true) {
      const messages = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
      if (!messages || messages.size === 0) break;

      for (const message of messages.values()) {
        await storeMatchLog(message).catch((error) => console.error("Failed to store match log:", error));
      }

      if (messages.size < 100) break;
      before = messages.last()?.id;
      if (!before) break;
    }
  }

  for (const channelId of Object.values(leaderboardChannelByGameSlug)) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !("messages" in channel)) continue;
    let before: string | undefined;
    while (true) {
      const messages = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
      if (!messages || messages.size === 0) break;
      for (const message of messages.values()) {
        await syncLeaderboardMessage(message).catch((error) => console.error("Failed to sync leaderboard:", error));
      }
      if (messages.size < 100) break;
      before = messages.last()?.id;
      if (!before) break;
    }
  }
});

client.on("messageCreate", (message) => {
  void processMessage(message).catch((error) => console.error("Failed to process Discord message:", error));
});

client.on("messageUpdate", (_oldMessage, newMessage) => {
  if (newMessage.partial) {
    void newMessage.fetch().then(processMessage).catch((error) => console.error("Failed to update Discord message:", error));
    return;
  }
  void processMessage(newMessage).catch((error) => console.error("Failed to update Discord message:", error));
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const handledByArcade = await handleArcadeButtonInteraction(interaction);
    if (handledByArcade) return;

    const handledByPoll = await handlePollButtonInteraction(interaction);
    if (handledByPoll) return;
  }

  if (interaction.isModalSubmit()) {
    const handledByHangman = await handleHangmanModalSubmit(interaction);
    if (handledByHangman) return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    console.error(`Error running /${interaction.commandName}:`, error);

    const payload = {
      content: "There was an error while running this command.",
      flags: 64,
    };

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: payload.content });
        return;
      }
      await interaction.reply(payload);
    } catch (replyError) {
      console.warn(`Failed to reply to /${interaction.commandName}:`, replyError);
    }
  }
});

client.on("guildMemberAdd", (member) => {
  console.log(`Member joined: ${member.user.tag} (${member.guild.name})`);
});

void deployCommands();

client.login(token).catch((error) => {
  console.error("Failed to log in to Discord:", error);
  process.exit(1);
});
