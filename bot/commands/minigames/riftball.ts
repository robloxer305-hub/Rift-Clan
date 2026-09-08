import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";

type TeamSide = "home" | "away";

type RiftBallPlayer = {
  id: string;
  username: string;
  team: TeamSide;
  x: number;
  y: number;
  hasBall: boolean;
};

type RiftBallGame = {
  id: string;
  guildId: string;
  voiceChannelId: string;
  players: RiftBallPlayer[];
  scores: Record<TeamSide, number>;
  turn: TeamSide;
  ball: { x: number; y: number; ownerId: string | null };
  messageId?: string;
};

const activeGames = new Map<string, RiftBallGame>();

const FIELD_WIDTH = 13;
const FIELD_HEIGHT = 7;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createOpponentMember(member: GuildMember): RiftBallPlayer {
  return {
    id: "riftbot",
    username: "Rift Bot",
    team: "away",
    x: 10,
    y: 3,
    hasBall: false,
  };
}

function createPlayers(member: GuildMember, voiceMembers: GuildMember[]) {
  const participants = [member, ...voiceMembers.filter((m) => m.id !== member.id)].slice(0, 2);

  const home = {
    id: participants[0]?.id ?? member.id,
    username: participants[0]?.displayName ?? member.displayName,
    team: "home" as const,
    x: 2,
    y: 3,
    hasBall: true,
  };

  const away =
    participants[1]
      ? {
          id: participants[1].id,
          username: participants[1].displayName,
          team: "away" as const,
          x: 10,
          y: 3,
          hasBall: false,
        }
      : createOpponentMember(member);

  return [home, away];
}

function buildBoard(game: RiftBallGame) {
  const rows = Array.from({ length: FIELD_HEIGHT }, () => Array(FIELD_WIDTH).fill("·"));

  rows[2][0] = "|";
  rows[2][12] = "|";
  rows[3][0] = "|";
  rows[3][12] = "|";

  for (const player of game.players) {
    const cell = player.team === "home" ? "◉" : "◎";
    rows[player.y][player.x] = cell;
  }

  if (game.ball.ownerId) {
    const owner = game.players.find((player) => player.id === game.ball.ownerId);
    if (owner) {
      rows[owner.y][owner.x] = "⚽";
    }
  } else {
    rows[game.ball.y][game.ball.x] = "⚽";
  }

  return rows.map((row) => row.join(" ")).join("\n");
}

function getButtonRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("riftball:move-left")
      .setLabel("◀ Move")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("riftball:move-right")
      .setLabel("Move ▶")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("riftball:move-up")
      .setLabel("▲")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("riftball:move-down")
      .setLabel("▼")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("riftball:shoot")
      .setLabel("Shoot")
      .setStyle(ButtonStyle.Success),
  );
}

function renderGame(game: RiftBallGame) {
  const embed = new EmbedBuilder()
    .setTitle("⚽ RiftBall")
    .setDescription(
      `Home ${game.scores.home} - ${game.scores.away} Away\n\n` +
        "```\n" +
        buildBoard(game) +
        "\n```\n" +
        `Turn: ${game.turn === "home" ? "Home team" : "Away team"}`,
    )
    .setColor(game.turn === "home" ? "#3B82F6" : "#F97316")
    .setTimestamp();

  return { embeds: [embed], components: [getButtonRow()] };
}

function getPlayerForUser(game: RiftBallGame, userId: string) {
  return game.players.find((player) => player.id === userId);
}

function processMove(game: RiftBallGame, userId: string, dx: number, dy: number) {
  const player = getPlayerForUser(game, userId);
  if (!player) return false;

  const nextX = clamp(player.x + dx, 1, FIELD_WIDTH - 2);
  const nextY = clamp(player.y + dy, 1, FIELD_HEIGHT - 2);

  player.x = nextX;
  player.y = nextY;

  if (player.hasBall) {
    game.ball.x = nextX;
    game.ball.y = nextY;
    game.ball.ownerId = player.id;
  }

  return true;
}

function processShot(game: RiftBallGame, userId: string) {
  const player = getPlayerForUser(game, userId);
  if (!player || !player.hasBall) return false;

  const targetX = player.team === "home" ? FIELD_WIDTH - 1 : 0;
  const distance = Math.abs(targetX - player.x);
  const chance = distance <= 2 ? 0.8 : 0.35;

  const scored = Math.random() < chance;

  if (scored) {
    game.scores[player.team] += 1;
    game.turn = player.team === "home" ? "away" : "home";
  } else {
    game.turn = player.team === "home" ? "away" : "home";
  }

  for (const p of game.players) {
    p.x = p.team === "home" ? 2 : 10;
    p.y = 3;
    p.hasBall = p.team === "home" && player.team === "home" ? true : p.team === "away" && player.team === "away" ? true : false;
  }

  const scorer = game.players.find((p) => p.team === player.team);
  if (scorer) {
    scorer.hasBall = true;
  }

  game.ball.ownerId = scorer?.id ?? null;
  game.ball.x = scorer?.x ?? 2;
  game.ball.y = scorer?.y ?? 3;

  return scored;
}

export const riftBallCommand = {
  data: new SlashCommandBuilder()
    .setName("riftball")
    .setDescription("Launch a quick in-voice RiftBall mini-game")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Start a new RiftBall match")
        .setRequired(false)
        .addChoices({ name: "Start match", value: "start" }),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember | null;
    const voiceChannel = member?.voice?.channel;

    if (!interaction.guild || !voiceChannel) {
      return interaction.reply({
        content: "You need to be in a voice channel to start RiftBall.",
        ephemeral: true,
      });
    }

    const existing = activeGames.get(interaction.guild.id);
    if (existing) {
      return interaction.reply({
        content: "A RiftBall game is already active in this server.",
        ephemeral: true,
      });
    }

    const players = createPlayers(member, Array.from(voiceChannel.members.values()));
    const state: RiftBallGame = {
      id: `${interaction.guild.id}-riftball`,
      guildId: interaction.guild.id,
      voiceChannelId: voiceChannel.id,
      players,
      scores: { home: 0, away: 0 },
      turn: "home",
      ball: { x: 2, y: 3, ownerId: players[0]?.id ?? null },
    };

    activeGames.set(interaction.guild.id, state);

    await interaction.reply({
      ...renderGame(state),
      ephemeral: false,
    });
  },
};

export const handleRiftBallInteraction = async (interaction: ButtonInteraction) => {
  if (!interaction.customId.startsWith("riftball:")) return false;

  const game = activeGames.get(interaction.guildId!);
  if (!game) {
    await interaction.reply({ content: "No active RiftBall game was found.", ephemeral: true });
    return true;
  }

  const userId = interaction.user.id;
  const action = interaction.customId.split(":")[1];

  if (!getPlayerForUser(game, userId)) {
    await interaction.reply({ content: "You are not playing this RiftBall match.", ephemeral: true });
    return true;
  }

  if (action === "move-left") {
    processMove(game, userId, -1, 0);
  } else if (action === "move-right") {
    processMove(game, userId, 1, 0);
  } else if (action === "move-up") {
    processMove(game, userId, 0, -1);
  } else if (action === "move-down") {
    processMove(game, userId, 0, 1);
  } else if (action === "shoot") {
    processShot(game, userId);
  }

  await interaction.update(renderGame(game));
  return true;
};

export const activeRiftBallGames = activeGames;
export const riftBallCommands = [riftBallCommand];
export default riftBallCommand;
