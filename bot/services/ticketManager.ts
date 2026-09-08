import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Guild,
  type TextChannel,
} from "discord.js";

export type TicketData = {
  id: string;
  channelId: string;
  ownerId: string;
  guildId: string;
  reason?: string;
  createdAt: Date;
  status: "open" | "closed";
};

const ticketStore = new Map<string, TicketData>();

export class TicketManager {
  async createTicket(guild: Guild, ownerId: string, reason = "No reason provided"): Promise<TextChannel> {
    const everyoneRoleId = guild.roles.everyone.id;
    const botUserId = guild.members.me?.id ?? guild.client.user?.id;

    const channel = await guild.channels.create({
      name: `ticket-${ownerId.slice(0, 8)}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: everyoneRoleId,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: ownerId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        ...(botUserId
          ? [{
              id: botUserId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            }]
          : []),
      ],
    });

    const ticket: TicketData = {
      id: channel.id,
      channelId: channel.id,
      ownerId,
      guildId: guild.id,
      reason,
      createdAt: new Date(),
      status: "open",
    };

    ticketStore.set(channel.id, ticket);

    const embed = new EmbedBuilder()
      .setColor("#10B981")
      .setTitle("🎫 Support Ticket")
      .setDescription(`Opened by <@${ownerId}>\n\nReason: ${reason}`)
      .setTimestamp();

    await channel.send({
      content: `Support ticket opened for <@${ownerId}>`,
      embeds: [embed],
    });

    return channel;
  }

  async closeTicket(channel: TextChannel, closerId: string, reason = "Closed by staff"): Promise<void> {
    const ticket = ticketStore.get(channel.id);

    if (ticket) {
      ticket.status = "closed";
      ticketStore.set(channel.id, ticket);
    }

    const embed = new EmbedBuilder()
      .setColor("#EF4444")
      .setTitle("🔒 Ticket Closed")
      .setDescription(`Closed by <@${closerId}>\n\nReason: ${reason}`)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  getTicket(channelId: string): TicketData | undefined {
    return ticketStore.get(channelId);
  }

  getAllTickets(): TicketData[] {
    return Array.from(ticketStore.values());
  }
}

export const ticketManager = new TicketManager();
