import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

const triviaQuestions = [
  { question: "Which game is set in the world of Azeroth?", options: ["Diablo", "World of Warcraft", "Half-Life", "FIFA"], answer: "World of Warcraft" },
  { question: "What is the main currency in Fortnite?", options: ["Coins", "Gold", "V-Bucks", "XP"], answer: "V-Bucks" },
  { question: "Which console was first released in 2020 by Sony?", options: ["PS4", "PS5", "Switch", "Xbox Series X"], answer: "PS5" },
  { question: "What does FPS stand for?", options: ["First Person Shooter", "Fast Play Strategy", "Full Power System", "Fast Player Score"], answer: "First Person Shooter" },
  { question: "Who is the protagonist of The Elder Scrolls V: Skyrim?", options: ["Gordon Freeman", "Link", "The Dragonborn", "Master Chief"], answer: "The Dragonborn" },
];

const quizQuestions = [
  { question: "Which company developed Minecraft?", options: ["Valve", "Mojang", "EA", "Ubisoft"], answer: "Mojang" },
  { question: "What color is the health pickup in most FPS games?", options: ["Blue", "Green", "Red", "Yellow"], answer: "Green" },
  { question: "Which of these is a battle royale game?", options: ["Tetris", "Apex Legends", "Pokémon", "Portal"], answer: "Apex Legends" },
  { question: "What genre is League of Legends?", options: ["RPG", "MOBA", "Racer", "Platformer"], answer: "MOBA" },
  { question: "What does CPU stand for?", options: ["Central Processing Unit", "Custom Play Unit", "Computer Power Utility", "Core Program Upgrade"], answer: "Central Processing Unit" },
];

const hangmanWords = ["RIFT", "GAMER", "PLAYER", "CLAN", "QUEST", "BOT", "LEVEL", "SCORE", "LEGEND", "VICTORY"];
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const activeGames = new Map<string, any>();
let gameIdCounter = 0;

function generateShortGameId(): string {
  gameIdCounter = (gameIdCounter + 1) % 1000000;
  return `g${gameIdCounter}`.padEnd(6, "0");
}

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function formatWordStatus(word: string, guessed: Set<string>) {
  return word
    .split("")
    .map((letter) => (guessed.has(letter) ? `**${letter}**` : "⬚"))
    .join(" ");
}

function buildLetterRows(prefix: "wordle" | "hangman", gameId: string, guessed: Set<string>) {
  const allLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const unguessed = allLetters.filter((l) => !guessed.has(l));

  const display = unguessed.slice(0, 25);

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < display.length; i += 5) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...display.slice(i, i + 5).map((letter) =>
          new ButtonBuilder()
            .setCustomId(`${prefix}:${gameId}:${letter}`)
            .setLabel(letter)
            .setStyle(ButtonStyle.Primary),
        ),
      ),
    );
  }

  return rows;
}

function scoreHand(cards: string[]): number {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card === "A") {
      aces += 1;
      total += 11;
    } else if (["K", "Q", "J"].includes(card)) {
      total += 10;
    } else {
      total += Number(card);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function drawCard(deck: string[]) {
  const index = Math.floor(Math.random() * deck.length);
  const card = deck[index];
  deck.splice(index, 1);
  return card;
}

function buildConnect4Board(board: string[][]) {
  return board
    .map((row) => row.map((cell) => (cell === "R" ? "🔴" : cell === "Y" ? "🟡" : "⚪")).join(" "))
    .join("\n");
}

function checkConnectFour(board: string[][], row: number, col: number, player: "R" | "Y") {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    for (const direction of [-1, 1]) {
      let r = row + dr * direction;
      let c = col + dc * direction;
      while (r >= 0 && r < board.length && c >= 0 && c < board[0].length && board[r][c] === player) {
        count += 1;
        r += dr * direction;
        c += dc * direction;
      }
    }

    if (count >= 4) return true;
  }

  return false;
}

function placeConnect4Token(board: string[][], column: number, player: "R" | "Y") {
  for (let row = board.length - 1; row >= 0; row -= 1) {
    if (board[row][column] === "·") {
      board[row][column] = player;
      return { row, col: column };
    }
  }

  return null;
}

function buildTriviaPrompt() {
  return randomFrom(triviaQuestions);
}

export const triviaCommand = {
  data: new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Play a random gaming or general trivia round"),

  async execute(interaction: ChatInputCommandInteraction) {
    const prompt = buildTriviaPrompt();
    const embed = new EmbedBuilder()
      .setTitle("🎯 RIFT Trivia")
      .setDescription(prompt.question)
      .setColor("#8B5CF6");

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...prompt.options.map((option) =>
        new ButtonBuilder().setCustomId(`trivia:${option}`).setLabel(option).setStyle(ButtonStyle.Primary),
      ),
    );

    await interaction.reply({ embeds: [embed], components: [buttons] });
  },
};

export const quizCommand = {
  data: new SlashCommandBuilder()
    .setName("quiz")
    .setDescription("Answer a multiple-choice quiz question"),

  async execute(interaction: ChatInputCommandInteraction) {
    const prompt = randomFrom(quizQuestions);
    const embed = new EmbedBuilder()
      .setTitle("🧠 RIFT Quiz")
      .setDescription(prompt.question)
      .setColor("#22C55E");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...prompt.options.map((option) =>
        new ButtonBuilder().setCustomId(`quiz:${option}`).setLabel(option).setStyle(ButtonStyle.Secondary),
      ),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};

export const blackjackCommand = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play virtual blackjack against the dealer"),

  async execute(interaction: ChatInputCommandInteraction) {
    const gameId = `${interaction.user.id}-${Date.now()}`;
    const deck = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const playerHand: string[] = [drawCard(deck), drawCard(deck)];
    const dealerHand: string[] = [drawCard(deck), drawCard(deck)];

    const state = {
      id: gameId,
      deck,
      playerHand,
      dealerHand,
      finished: false,
      result: "",
    };

    activeGames.set(gameId, state);

    const playerScore = scoreHand(playerHand);
    const embed = new EmbedBuilder()
      .setTitle("🂡 RIFT Blackjack")
      .setDescription(`Your hand: ${playerHand.join(" ")} (${playerScore})\nDealer hand: ${dealerHand[0]} ??\n\nChoose to hit or stand.`)
      .setColor("#F59E0B");

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`blackjack:${gameId}:hit`).setLabel("Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`blackjack:${gameId}:stand`).setLabel("Stand").setStyle(ButtonStyle.Success),
    );

    await interaction.reply({ embeds: [embed], components: [buttons] });
  },
};

export const connect4Command = {
  data: new SlashCommandBuilder()
    .setName("connect4")
    .setDescription("Challenge another user to Connect Four")
    .addUserOption((option) => option.setName("user").setDescription("Opponent to challenge").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const opponent = interaction.options.getUser("user", true);
    const shortId = generateShortGameId();
    const fullGameId = `${interaction.user.id}-${opponent.id}-${Date.now()}`;
    const board = Array.from({ length: 6 }, () => Array(7).fill("·"));
    const state = {
      id: fullGameId,
      shortId,
      players: [interaction.user.id, opponent.id],
      board,
      turn: 0,
      winner: null as string | null,
      finished: false,
    };

    activeGames.set(shortId, state);

    const embed = new EmbedBuilder()
      .setTitle("🔴🟡 Connect Four")
      .setDescription(`<@${interaction.user.id}> vs <@${opponent.id}>\nCurrent turn: <@${interaction.user.id}>\n\n${buildConnect4Board(board)}`)
      .setColor("#F97316");

    const buttons = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...Array.from({ length: 5 }, (_, index) =>
          new ButtonBuilder().setCustomId(`c4:${shortId}:${index}`).setLabel(`${index + 1}`).setStyle(ButtonStyle.Primary),
        ),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...Array.from({ length: 2 }, (_, index) =>
          new ButtonBuilder().setCustomId(`c4:${shortId}:${index + 5}`).setLabel(`${index + 6}`).setStyle(ButtonStyle.Primary),
        ),
      ),
    ];

    await interaction.reply({ embeds: [embed], components: buttons });
  },
};

export const hangmanCommand = {
  data: new SlashCommandBuilder()
    .setName("hangman")
    .setDescription("Challenge another player to hangman — you set the word and hints")
    .addUserOption((option) => option.setName("user").setDescription("Opponent to challenge").setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const opponent = interaction.options.getUser("user", true);

    if (opponent.id === interaction.user.id) {
      return interaction.reply({ content: "You can't challenge yourself!", flags: 64 });
    }

    if (opponent.bot) {
      return interaction.reply({ content: "You can't challenge a bot!", flags: 64 });
    }

    const shortId = generateShortGameId();

    const modal = new ModalBuilder()
      .setCustomId(`hm-modal:${shortId}:${interaction.user.id}:${opponent.id}`)
      .setTitle("💀 Hangman — Set Your Word");

    const wordInput = new TextInputBuilder()
      .setCustomId("word")
      .setLabel("Word to guess (letters only)")
      .setPlaceholder("e.g. RIFT")
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(30)
      .setRequired(true);

    const hint1 = new TextInputBuilder()
      .setCustomId("hint1")
      .setLabel("Hint 1")
      .setPlaceholder("e.g. A gaming clan name")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const hint2 = new TextInputBuilder()
      .setCustomId("hint2")
      .setLabel("Hint 2")
      .setPlaceholder("e.g. Competes in FPS games")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const hint3 = new TextInputBuilder()
      .setCustomId("hint3")
      .setLabel("Hint 3")
      .setPlaceholder("e.g. 4 letters long")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(wordInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(hint1),
      new ActionRowBuilder<TextInputBuilder>().addComponents(hint2),
      new ActionRowBuilder<TextInputBuilder>().addComponents(hint3),
    );

    await interaction.showModal(modal);
  },
};

export const handleHangmanModalSubmit = async (interaction: ModalSubmitInteraction): Promise<boolean> => {
  if (!interaction.customId.startsWith("hm-modal:")) return false;

  const [, shortId, challengerId, opponentId] = interaction.customId.split(":");

  const word = interaction.fields.getTextInputValue("word").toUpperCase().replace(/[^A-Z]/g, "");
  const hint1 = interaction.fields.getTextInputValue("hint1");
  const hint2 = interaction.fields.getTextInputValue("hint2");
  const hint3 = interaction.fields.getTextInputValue("hint3");

  if (word.length < 2) {
    await interaction.reply({ content: "The word must be at least 2 letters long.", flags: 64 });
    return true;
  }

  const state = {
    id: `${challengerId}-${opponentId}-${Date.now()}`,
    shortId,
    word,
    hints: [hint1, hint2, hint3],
    challengerId,
    guesserId: opponentId,
    guessed: new Set<string>(),
    wrong: 0,
    maxWrong: 6,
    finished: false,
    winner: null as string | null,
  };

  activeGames.set(shortId, state);

  const embed = buildHangmanEmbed(state);

  await interaction.reply({
    content: `<@${opponentId}> — <@${challengerId}> has challenged you to hangman!`,
    embeds: [embed],
    components: buildLetterRows("hm", shortId, state.guessed),
  });

  return true;
};

function buildHangmanEmbed(state: {
  word: string;
  hints: string[];
  guessed: Set<string>;
  wrong: number;
  maxWrong: number;
  finished: boolean;
  winner: string | null;
  guesserId: string;
  challengerId: string;
}) {
  const wordDisplay = formatWordStatus(state.word, state.guessed);
  const guessedLetters = Array.from(state.guessed).sort().join(", ") || "None yet";

  let description = "";

  if (state.finished) {
    if (state.winner === state.guesserId) {
      description = `🎉 **<@${state.guesserId}> wins!**\n\nThe word was: **${state.word.split("").join(" ")}**\nWrong guesses: ${state.wrong}/${state.maxWrong}`;
    } else {
      description = `💀 **<@${state.challengerId}> wins!**\n\nThe word was: **${state.word.split("").join(" ")}**\nWrong guesses: ${state.wrong}/${state.maxWrong}`;
    }
  } else {
    description = `**Guesser:** <@${state.guesserId}>\n\n`;
    description += `**Hints:**\n`;
    description += `1. ${state.hints[0]}\n`;
    description += `2. ${state.hints[1]}\n`;
    description += `3. ${state.hints[2]}\n\n`;
    description += `**Word** (${state.word.length} letters):\n${wordDisplay}\n\n`;
    description += `**Wrong guesses:** ${state.wrong}/${state.maxWrong}\n`;
    description += `**Guessed letters:** ${guessedLetters}`;
  }

  return new EmbedBuilder()
    .setTitle("💀 RIFT Hangman")
    .setDescription(description)
    .setColor(state.finished ? (state.winner === state.guesserId ? "#10B981" : "#F59E0B") : "#EF4444");
}

export const handleArcadeButtonInteraction = async (interaction: ButtonInteraction) => {
  if (interaction.customId.startsWith("trivia:")) {
    const [, answer] = interaction.customId.split(":");
    const question = triviaQuestions.find((entry) => entry.options.includes(answer ?? ""));
    const correct = question?.answer === answer;

    await interaction.update({
      content: correct ? "✅ Correct!" : `❌ Wrong answer. The correct answer was **${question?.answer ?? "unknown"}**.`,
      embeds: [],
      components: [],
    });
    return true;
  }

  if (interaction.customId.startsWith("quiz:")) {
    const [, answer] = interaction.customId.split(":");
    const question = quizQuestions.find((entry) => entry.options.includes(answer ?? ""));
    const correct = question?.answer === answer;

    await interaction.update({
      content: correct ? "✅ Correct!" : `❌ Wrong answer. The correct answer was **${question?.answer ?? "unknown"}**.`,
      embeds: [],
      components: [],
    });
    return true;
  }

  if (interaction.customId.startsWith("blackjack:")) {
    const [, gameId, action] = interaction.customId.split(":");
    const game = activeGames.get(gameId ?? "");
    if (!game) {
      await interaction.reply({ content: "This blackjack game expired.", flags: 64 });
      return true;
    }

    if (game.finished) {
      await interaction.update({ components: [] });
      return true;
    }

    if (action === "hit") {
      game.playerHand.push(drawCard(game.deck));
      const playerScore = scoreHand(game.playerHand);
      if (playerScore > 21) {
        game.finished = true;
        game.result = "Bust! Dealer wins.";
      }
    }

    if (action === "stand" || game.finished) {
      let dealerScore = scoreHand(game.dealerHand);
      while (dealerScore < 17) {
        game.dealerHand.push(drawCard(game.deck));
        dealerScore = scoreHand(game.dealerHand);
      }

      const playerScore = scoreHand(game.playerHand);
      if (!game.finished) {
        if (dealerScore > 21 || playerScore > dealerScore) {
          game.result = "You win!";
        } else if (playerScore < dealerScore) {
          game.result = "Dealer wins.";
        } else {
          game.result = "Push.";
        }
      }

      game.finished = true;
    }

    const playerScore = scoreHand(game.playerHand);
    const dealerScore = scoreHand(game.dealerHand);
    const embed = new EmbedBuilder()
      .setTitle("🂡 RIFT Blackjack")
      .setDescription(
        `Your hand: ${game.playerHand.join(" ")} (${playerScore})\nDealer hand: ${game.finished ? game.dealerHand.join(" ") : game.dealerHand[0]}${game.finished ? ` (${dealerScore})` : " ??"}\n\n${game.result || "Keep playing."}`,
      )
      .setColor("#F59E0B");

    await interaction.update({ embeds: [embed], components: [] });
    return true;
  }

  if (interaction.customId.startsWith("c4:")) {
    const [, shortId, columnString] = interaction.customId.split(":");
    const game = activeGames.get(shortId ?? "");
    if (!game) {
      await interaction.reply({ content: "This Connect Four game is no longer active.", flags: 64 });
      return true;
    }

    if (game.finished) {
      await interaction.update({ components: [] });
      return true;
    }

    const currentPlayerId = game.players[game.turn];
    if (interaction.user.id !== currentPlayerId) {
      await interaction.reply({ content: "It is not your turn yet.", flags: 64 });
      return true;
    }

    const column = Number(columnString ?? "0");
    const token = game.turn === 0 ? "R" : "Y";
    const move = placeConnect4Token(game.board, column, token);
    if (!move) {
      await interaction.reply({ content: "That column is full.", flags: 64 });
      return true;
    }

    if (checkConnectFour(game.board, move.row, move.col, token)) {
      game.finished = true;
      game.winner = currentPlayerId;
    }

    const nextTurn = game.turn === 0 ? 1 : 0;
    if (!game.finished && !game.board.some((row) => row.some((cell) => cell === "·"))) {
      game.finished = true;
    }

    game.turn = game.finished ? game.turn : nextTurn;

    const embed = new EmbedBuilder()
      .setTitle("🔴🟡 Connect Four")
      .setDescription(
        game.finished
          ? game.winner
            ? `Winner: <@${game.winner}>\n\n${buildConnect4Board(game.board)}`
            : `Draw!\n\n${buildConnect4Board(game.board)}`
          : `Current turn: <@${game.players[game.turn]}>\n\n${buildConnect4Board(game.board)}`,
      )
      .setColor(game.finished ? "#A855F7" : "#F97316");

    const buttons = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...Array.from({ length: 5 }, (_, index) =>
          new ButtonBuilder()
            .setCustomId(`c4:${game.shortId}:${index}`)
            .setLabel(`${index + 1}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(game.finished),
        ),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...Array.from({ length: 2 }, (_, index) =>
          new ButtonBuilder()
            .setCustomId(`c4:${game.shortId}:${index + 5}`)
            .setLabel(`${index + 6}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(game.finished),
        ),
      ),
    ];

    await interaction.update({ embeds: [embed], components: buttons });
    return true;
  }

  if (interaction.customId.startsWith("hm:")) {
    const [, shortId, letter] = interaction.customId.split(":");
    const game = activeGames.get(shortId ?? "");
    if (!game) {
      await interaction.reply({ content: "This hangman game is no longer active.", flags: 64 });
      return true;
    }

    if (interaction.user.id !== game.guesserId) {
      await interaction.reply({ content: "Only the guesser can play!", flags: 64 });
      return true;
    }

    if (game.finished) {
      await interaction.update({ components: [] });
      return true;
    }

    if (game.guessed.has(letter ?? "")) {
      await interaction.reply({ content: "That letter was already guessed.", flags: 64 });
      return true;
    }

    game.guessed.add(letter ?? "");
    if (!game.word.includes(letter ?? "")) {
      game.wrong += 1;
    }

    const solved = Array.from(game.word).every((char) => game.guessed.has(char));
    if (solved) {
      game.finished = true;
      game.winner = game.guesserId;
    } else if (game.wrong >= game.maxWrong) {
      game.finished = true;
      game.winner = game.challengerId;
    }

    const embed = buildHangmanEmbed(game);
    const components = game.finished ? [] : buildLetterRows("hm", game.shortId, game.guessed);
    await interaction.update({ embeds: [embed], components });
    return true;
  }

  return false;
};

export const arcadeGameCommands = [
  triviaCommand,
  quizCommand,
  blackjackCommand,
  connect4Command,
  hangmanCommand,
];

export default arcadeGameCommands;
