import { aiCommands, askCommand } from "./ai/ask";
import {
  balanceCommand,
  dailyCommand,
  eightBallCommand,
  gambleCommand,
  gayRateCommand,
  giveCommand,
  levelCommand,
  richestCommand,
  riftEconomyCommands,
  shipCommand,
  workCommand,
  xpCommand,
} from "./economy/economyCommands";
import { arcadeGameCommands } from "./minigames/arcadeGames";
import { minigameCommands } from "./minigames/minigames";
import { moderationCommands } from "./moderation/moderationCommands";
import { happyBirthdayCommand } from "./fun/happyBirthday";
import { pollCommand } from "./polls/poll";
import {
  pauseCommand,
  playCommand,
  queueCommand,
  resumeCommand,
  skipCommand,
  stopCommand,
} from "./music/musicCommands";
import { remindCommand, reminderCommands } from "./reminders/remindCommands";
import { statsCommand, statsCommands } from "./stats/statsCommands";
import { ticketCommand, ticketCommands } from "./tickets/ticketCommands";

export const commands = [
  ...aiCommands,
  ...riftEconomyCommands,
  ...minigameCommands,
  ...arcadeGameCommands,
  ...moderationCommands,
  happyBirthdayCommand,
  pollCommand,
  ...reminderCommands,
  ...statsCommands,
  ...ticketCommands,
  playCommand,
  pauseCommand,
  resumeCommand,
  skipCommand,
  queueCommand,
  stopCommand,
];

export * from "./ai/ask";
export * from "./economy/economyCommands";
export * from "./minigames/arcadeGames";
export * from "./minigames/minigames";
export * from "./moderation/moderationCommands";
export * from "./fun/happyBirthday";
export * from "./polls/poll";
export * from "./music/musicCommands";
export * from "./reminders/remindCommands";
export * from "./stats/statsCommands";
export * from "./tickets/ticketCommands";
