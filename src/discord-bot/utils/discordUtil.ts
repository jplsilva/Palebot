import {
  Channel,
  Collection,
  Guild,
  GuildChannel,
  GuildMember,
  Message,
  Role,
  TextChannel,
  Util as DiscordUtil,
} from 'discord.js';

import { BotClient } from '../client/client';
import { createLogger } from '../../logging/log';

const _logger = createLogger('DiscordUtils');

export async function getGuildById(client: BotClient, guildId: string): Promise<Guild | undefined> {
  return await safeDiscordAPICall(client.guilds.fetch, client.guilds, guildId);
}

export async function getChannelById(client: BotClient, channelId: string): Promise<Channel | undefined> {
  return await safeDiscordAPICall(client.channels.fetch, client.channels, channelId);
}

/**
 * Looks in cache for a channel with a specific name
 * !! Warning, channel may not be in cache and return undefined !!
 * @param client
 * @param channelName
 * @returns
 */
export async function getChannelByName(client: BotClient, channelName: string): Promise<Channel | undefined> {
  return client.channels.cache.find((c: Channel) => {
    // DM Channels don't have a name
    if (c.type === 'dm') return false;
    const guildChannel = c as GuildChannel;
    return guildChannel.name === channelName;
  });
}

export async function getMessageById(channel: GuildChannel, messageId: string): Promise<Message | undefined> {
  if (!channel.isText()) return undefined;
  const textChannel = channel as TextChannel;
  return await safeDiscordAPICall(textChannel.messages.fetch, textChannel.messages, messageId);
}

export async function getMemberById(guild: Guild, userId: string): Promise<GuildMember | undefined> {
  return await safeDiscordAPICall(guild.members.fetch, guild.members, userId);
}

/**
 *
 * !! May give false results, since it uses the API query method, that gives 'possible' matches !!
 * @param guild
 * @param userName
 * @returns
 */
export async function getMemberByName(
  guild: Guild,
  userName: string,
): Promise<Collection<string, GuildMember> | undefined> {
  return await safeDiscordAPICall(guild.members.fetch, guild.members, {
    query: userName,
  });
}

export async function getEmoji(guild: Guild, emojiId: string) {
  return guild.emojis.cache.get(emojiId);
}

export async function getRoleById(guild: Guild, roleId: string): Promise<Role | null | undefined> {
  return guild.roles.fetch(roleId);
}

/**
 * Looks in cache for a role with a specific name
 * !! Warning, role may not be in cache and return undefined !!
 * @param guild
 * @param roleName
 * @returns
 */
export async function getRoleByName(guild: Guild, roleName: string): Promise<Role | undefined> {
  return guild.roles.cache.find((r: Role) => r.name === roleName);
}

export async function hasGuildWithId(client: BotClient, guildId: string): Promise<boolean> {
  return getGuildById(client, guildId) != undefined;
}

/**
 *
 * @param guild
 * @param id
 * @returns
 */
export async function hasChannelWithId(client: BotClient, channelId: string): Promise<boolean> {
  return (await getChannelById(client, channelId)) != undefined;
}

/**
 * TODO: Verify if theres a way without using cache
 * @param guild
 * @param channel
 * @returns
 */
export async function hasChannelWithName(client: BotClient, channelName: string): Promise<boolean> {
  return getChannelByName(client, channelName) != undefined;
}

export async function hasMessageWithId(channel: GuildChannel, messageId: string): Promise<boolean> {
  return (await getMessageById(channel, messageId)) != undefined;
}

export async function hasMemberWithId(guild: Guild, userId: string): Promise<boolean> {
  return (await getMemberById(guild, userId)) != undefined;
}

/**
 *
 * !! May give false results, since it uses the API query method, that gives 'possible' matches !!
 * @param guild
 * @param userName
 * @returns
 */
export async function hasMemberWithName(guild: Guild, userName: string): Promise<boolean> {
  const users = await getMemberByName(guild, userName);
  return users != undefined && users.size > 0;
}

export async function hasEmoji(guild: Guild, emojiId: string) {
  return (await getEmoji(guild, emojiId)) != undefined;
}

export async function hasRoleWithId(guild: Guild, roleId: string): Promise<boolean> {
  return (await getRoleById(guild, roleId)) != undefined;
}

/**
 * Looks in cache for a role with a specific name
 * !! Warning, role may not be in cache and return false !!
 * @param guild
 * @param roleName
 * @returns
 */
export async function hasRoleWithName(guild: Guild, roleName: string): Promise<boolean> {
  return (await getRoleByName(guild, roleName)) != undefined;
}

export function parseEmoji(emoji: string) {
  return DiscordUtil.parseEmoji(emoji);
}

export function getIdFromRoleMention(mention: string): string | undefined {
  if (!isValidRoleMention(mention)) return undefined;
  return mention.slice(3, -1);
}

export function getIdFromChannelMention(mention: string): string | undefined {
  if (!isValidChannelMention(mention)) return undefined;
  return mention.slice(2, -1);
}

export function isValidChannelMention(mention: string): boolean {
  return mention.startsWith('<#') && mention.endsWith('>');
}

export function isValidRoleMention(mention: string): boolean {
  return mention.startsWith('<@&') && mention.endsWith('>');
}

export function wrapInCodeBlock(message: string, language?: string) {
  return `\`\`\`${language ? language : ''}${message}\`\`\``;
}

export async function safeDiscordAPICall(
  fn: (...fnParams: any[]) => any,
  thisObj?: any,
  ...params: any[]
): Promise<any | undefined> {
  try {
    return await fn.apply(thisObj, params);
  } catch (error) {
    _logger.warn(`Safe Discord API call error: ${error}`);
  }

  return undefined;
}
