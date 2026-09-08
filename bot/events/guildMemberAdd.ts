import type { GuildMember } from "discord.js";

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  console.log(`Welcome ${member.user.tag} to ${member.guild.name}`);
}
