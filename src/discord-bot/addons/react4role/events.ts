import { Collection, Guild, GuildChannel, Message, MessageReaction, TextChannel, User } from 'discord.js';
import { DatabaseWrapper } from '../../../database/db';

import { createLogger } from '../../../logging/log';
import { BotClient } from '../../client/client';
import { BotEvent } from '../../interfaces/botEvent';
import {
  getChannelById,
  getGuildById,
  getIdFromRoleMention,
  getMemberById,
  getMessageById,
  getRoleById,
  hasEmoji,
  hasMessageWithId,
  hasRoleWithId,
  parseEmoji,
} from '../../utils/discordUtil';
import { LooseObject } from '../../utils/util';
import {
  createTrackedMessageEmojiTable,
  createTrackedMessageRoleTable,
  createTrackedMessageTable,
  deleteTrackedMessageById,
  deleteTrackedMessageCascade,
  deleteTrackedMessageEmojiByTrackedMessageId,
  deleteTrackedMessageRoleByTrackedMessageId,
  dropTrackedMessageEmojiTable,
  dropTrackedMessageRoleTable,
  dropTrackedMessageTable,
  getAllTrackedMessages,
  getTrackedMessageByTableColumns,
  getTrackedMessageEmojiByTrackedMessageId,
  getTrackedMessageRoleByTrackedMessageId,
  hasTrackedMessageTable,
  RR_TRACKED_MESSAGE_EMOJI_TABLE_EMOJI,
  RR_TRACKED_MESSAGE_ROLE_TABLE_ROLE,
  RR_TRACKED_MESSAGE_TABLE_CHANNEL_ID,
  RR_TRACKED_MESSAGE_TABLE_GUILD_ID,
  RR_TRACKED_MESSAGE_TABLE_ID,
  RR_TRACKED_MESSAGE_TABLE_MESSAGE_ID,
} from './model';

// Logger
const _logger = createLogger('React4RoleAddon/Events');

// Events
/**
 * Ready Event catcher
 */
export const readyEvent: BotEvent = {
  description: 'Bot ready event handler.',
  handle: 'ready',
  run: async (client: BotClient) => {
    _logger.info('Addon setting up...');
    const db = client.db;
    if (!db) {
      _logger.error(`Database not found! Addon cannot initialize!`);
      return;
    }

    // Has all the tables
    const hasTable =
      (await hasTrackedMessageTable(db)) && (await hasTrackedMessageTable(db)) && (await hasTrackedMessageTable(db));
    if (!hasTable) {
      _setupDatabaseTables(client);
      _logger.info('Addon setup completed!');
      return;
    }

    // Cleanup tracked messages from database
    await _updateDatabaseAndRoles(client);
    _logger.info('Addon setup completed!');
  },
};

/**
 * Message React Added Event catcher
 */
export const messageReactionAdd: BotEvent = {
  description: 'Reaction added event handler.',
  handle: 'messageReactionAdd',
  run: async (client: BotClient, messageReaction: MessageReaction, user: User) => {
    _manageRolesByReaction(client, messageReaction, user, 'add');
  },
};

/**
 * Message React Event catcher
 */
export const messageReactionRemove: BotEvent = {
  description: 'Reaction removed event handler.',
  handle: 'messageReactionRemove',
  run: async (client: BotClient, messageReaction: MessageReaction, user: User) => {
    _manageRolesByReaction(client, messageReaction, user, 'remove');
  },
};

export const messageDelete: BotEvent = {
  description: 'Message deleted event handler',
  handle: 'messageDelete',
  run: async (client: BotClient, message: Message) => {
    const db = client.db;
    if (!db) {
      _logger.error(`Database not found! Addon cannot clean message from database`);
      return;
    }

    // Message has a guild (is not a DM)
    const guild = message.guild;
    if (!guild) {
      _logger.debug(`Deleted message is not from a guild`);
      return;
    }

    // Get message channel
    const channelRaw = message.channel;
    if (!channelRaw || !channelRaw.isText()) {
      _logger.debug(`The deleted message's channel is not text based or does not exist`);
      return;
    }

    // Message is being tracked as a react message
    const channel = channelRaw as TextChannel;
    const messageId = message.id;
    const dbMessage: LooseObject = await getTrackedMessageByTableColumns(db, guild.id, channel.id, messageId);
    if (!dbMessage) {
      _logger.debug('Deleted message is NOT being tracked!');
      return;
    }

    const dbMessageId: number = dbMessage[RR_TRACKED_MESSAGE_TABLE_ID];
    // Delete this message's emojis from the database
    const dbDeletedMessageemojis = await deleteTrackedMessageEmojiByTrackedMessageId(db, dbMessageId);
    // Delete this message's roles from the database
    const dbDeletedMessageRoles = await deleteTrackedMessageRoleByTrackedMessageId(db, dbMessageId);
    // Delete this tracked message from the database
    const dbDeletedMessage = await deleteTrackedMessageById(db, dbMessageId);
    if (
      !dbDeletedMessageemojis ||
      !dbDeletedMessageRoles ||
      !dbDeletedMessage ||
      dbDeletedMessageemojis <= 0 ||
      dbDeletedMessageRoles <= 0 ||
      dbDeletedMessage <= 0
    ) {
      _logger.warn(
        [
          `No roles/emojis/messages removed for message from guild '${guild.name}' ('${guild.id}'),`,
          `channel '${channel.name}' ('${channel.id}')`,
          `and with discord id '${messageId}' (dbId: '${dbMessageId}')`,
          `|`,
          `Removed Tracked Messages: ${dbDeletedMessage}`,
          `Removed Emojis: ${dbDeletedMessageemojis}`,
          `Removed Roles: ${dbDeletedMessageRoles}`,
        ].join(' '),
      );

      return;
    }

    _logger.info(
      [
        `Removed message from guild '${guild.name}' ('${guild.id}'),`,
        `channel '${channel.name}' ('${channel.id}')`,
        `and with discord id '${messageId}' (dbId: '${dbMessageId}')`,
      ].join(' '),
    );
  },
};

// Private Stuff
async function _manageRolesByReaction(
  client: BotClient,
  messageReaction: MessageReaction,
  user: User,
  option: 'add' | 'remove',
) {
  const db = client.db;
  if (!db) {
    _logger.error(`Database not found! Addon cannot ${option} role from reaction from message`);
    return;
  }

  // Should never be a partial, but just to be safe
  if (messageReaction.partial) {
    _logger.debug(`React event of type '${option}' from user '${user.username}' is a partial`);
    await messageReaction.fetch();
    await user.fetch();
  }

  // Message has a guild (is not a DM)
  const guild = messageReaction.message.guild;
  if (!guild) {
    _logger.debug(`React event of type '${option}' from user '${user.username}' is not from a guild`);
    return;
  }

  // Get message channel
  const channelRaw = messageReaction.message.channel;
  if (!channelRaw || !channelRaw.isText()) {
    _logger.debug(
      `React event of type '${option}' from user '${user.username}' was not written in a text based channel`,
    );
    return;
  }

  // Message is being tracked as a react message
  const channel = channelRaw as TextChannel;
  const messageId = messageReaction.message.id;
  const dbMessage: LooseObject = await getTrackedMessageByTableColumns(db, guild.id, channel.id, messageId);
  if (!dbMessage) {
    _logger.debug(`Reaction of type '${option}', from user '${user.username}', is NOT being tracked`);
    return;
  }

  // The member that added the reaction is a in the Guild
  const member = await getMemberById(guild, user.id);
  if (!member) {
    _logger.debug(`The guild does NOT have this member, ignoring reaction event of type '${option}'`);
    return;
  }

  const dbMessageId: number = dbMessage[RR_TRACKED_MESSAGE_TABLE_ID];
  // Get this message's emojis and roles from the database
  const dbMessageEmojis = await getTrackedMessageEmojiByTrackedMessageId(db, dbMessageId);
  const dbMessageRoles = await getTrackedMessageRoleByTrackedMessageId(db, dbMessageId);
  if (
    !dbMessageEmojis ||
    !dbMessageRoles ||
    dbMessageEmojis.length != dbMessageRoles.length ||
    dbMessageRoles.length <= 0
  ) {
    _logger.warn(
      `Message with discord id: ${messageId} (db id: ${dbMessageId}) does not have any or has mismatched assigned emojis/roles. Removing from database...`,
    );

    await _removeTrackedMessage(db, dbMessageId);
    return;
  }

  // Convert database objects into string[]
  const dbEmojisArr: string[] = dbMessageEmojis.map((dbEmoji) => dbEmoji[RR_TRACKED_MESSAGE_EMOJI_TABLE_EMOJI]);
  const dbEolesArr: string[] = dbMessageRoles.map((dbRole) => dbRole[RR_TRACKED_MESSAGE_ROLE_TABLE_ROLE]);

  // Reaction emoji is being tracked
  if (!dbEmojisArr.includes(messageReaction.emoji.toString())) {
    _logger.debug('Reaction emoji is NOT being tracked!');
    await messageReaction.remove();
    return;
  }

  // Get the roleId and the Role object from the Guild
  // Verify if the Guild has this Role
  const idx = dbEmojisArr.indexOf(messageReaction.emoji.toString());
  const dbRoleMention = dbEolesArr[idx];
  const dbRoleId = getIdFromRoleMention(dbRoleMention);
  if (!dbRoleId) {
    _logger.error(`Database role mention ${dbRoleMention} may not be a valid mention!`);
    return;
  }
  const role = await getRoleById(guild, dbRoleId);
  if (!role) {
    _logger.warn(`Role '${dbRoleId}' not found in guild ${guild.name}!`);
    return;
  }

  if (option === 'add') {
    member.roles.add(role);
    _logger.debug(`Role '${role.name}' added to user '${user.username}'.`);
    return;
  }

  if (option === 'remove') {
    member.roles.remove(role);
    _logger.debug(`Role '${role.name}' removed from user '${user.username}'.`);
    return;
  }
}

async function _setupDatabaseTables(client: BotClient) {
  _logger.debug('Settip up necessary tables...');
  const db = client.db;
  // Drop all the Tracked Messages tables
  await dropTrackedMessageEmojiTable(db)
    .then(() => dropTrackedMessageRoleTable(db))
    .then(() => dropTrackedMessageTable(db));

  // Create all the Tracked Messages tables
  await createTrackedMessageTable(db)
    .then(() => createTrackedMessageEmojiTable(db))
    .then(() => createTrackedMessageRoleTable(db));
}

async function _updateDatabaseAndRoles(client: BotClient) {
  _logger.debug('Updating database and roles...');
  const db = client.db;
  const trackedMessages = await getAllTrackedMessages(db);
  if (!trackedMessages || trackedMessages.length <= 0) return;

  for (let trackedMessage of trackedMessages) {
    const messageId: number = trackedMessage[RR_TRACKED_MESSAGE_TABLE_ID];
    const guildId: string = trackedMessage[RR_TRACKED_MESSAGE_TABLE_GUILD_ID];
    const channelId: string = trackedMessage[RR_TRACKED_MESSAGE_TABLE_CHANNEL_ID];
    const discordMessageId: string = trackedMessage[RR_TRACKED_MESSAGE_TABLE_MESSAGE_ID];

    // Some error with this tracked message database structure
    if (!(await _verifyTrackedDBMessage(client, messageId, guildId, channelId, discordMessageId))) {
      _logger.warn(
        `Error verifying tracked message '${discordMessageId}' (dbId: '${messageId}'), removing from database...`,
      );
      await _removeTrackedMessage(db, messageId);
      continue;
    }

    // Guild exists, already verified in the _verifyTrackedDBMessage
    const guild = (await getGuildById(client, guildId)) as Guild;
    const valid =
      (await _verifyDBTrackedMessageEmojis(db, messageId, guild)) &&
      (await _verifyDBTrackedMessageRoles(db, messageId, guild));

    // Some error found in this tracked message emojis and/or roles
    if (!valid) {
      _logger.warn(
        `Error verifying tracked message '${discordMessageId}' (dbId: '${messageId}') roles or emoji, removing from database...`,
      );
      await _removeTrackedMessage(db, messageId);
      continue;
    }

    // Channel exists and is a GuildChannel. Message also exists in this Channel
    // We pass the verification process earlier
    const channel = (await getChannelById(client, channelId)) as GuildChannel;
    const discordMessage = (await getMessageById(channel, discordMessageId)) as Message;

    await _updateReactionsAndMemberRoles(db, messageId, guild, discordMessage);
  }
}

async function _verifyTrackedDBMessage(
  client: BotClient,
  messageId: number,
  guildId: string,
  channelId: string,
  discordMessageId: string,
) {
  if (!messageId || !guildId || !channelId || !discordMessageId) {
    _logger.error(
      `Tracked message verification failed! One or more parameters are undifined:` +
        `'${RR_TRACKED_MESSAGE_TABLE_ID}; ${RR_TRACKED_MESSAGE_TABLE_GUILD_ID}; ${RR_TRACKED_MESSAGE_TABLE_CHANNEL_ID}; ${RR_TRACKED_MESSAGE_TABLE_MESSAGE_ID}'`,
    );
    return false;
  }

  const guild = await getGuildById(client, guildId);
  if (!guild) {
    _logger.debug(`Guild with id: '${guildId}' no longer exists`);
    return false;
  }

  const channel = await getChannelById(client, channelId);
  if (!channel || !channel.isText() || channel.type == 'dm') {
    _logger.debug(
      `Channel with id: '${channelId}' no longer exists in guild '${guild.name}' ('${guildId}') or is not text based`,
    );
    return false;
  }

  const guildChannel = channel as GuildChannel;
  const message = await hasMessageWithId(guildChannel, discordMessageId);
  if (!message) {
    _logger.debug(
      `Message with id '${discordMessageId}' (dbId: '${messageId}') not found in channel '${guildChannel.name}' ('${channelId}')`,
    );
    return false;
  }
  return true;
}

async function _verifyDBTrackedMessageEmojis(db: DatabaseWrapper, messageId: number, guild: Guild) {
  const dbEmojis = await getTrackedMessageEmojiByTrackedMessageId(db, messageId);
  if (!dbEmojis) {
    _logger.error(
      `Error fetching tracked message emojis or this message has no emojis associated! Tracked message dbId '${messageId}'`,
    );
    return false;
  }

  for (let dbEmoji of dbEmojis) {
    const emojiStr = dbEmoji[RR_TRACKED_MESSAGE_EMOJI_TABLE_EMOJI];
    const emojiObj = parseEmoji(emojiStr);
    if (!emojiObj) {
      _logger.error(`Error parsing dbEmoji '${emojiStr}'!`);
      return false;
    }

    // Guild custom Emoji, verify if it still exists
    if (emojiObj.id) {
      if (!(await hasEmoji(guild, emojiObj.id))) {
        _logger.error(`Guild '${guild.name}' ('${guild.id}') does not have emoji '${emojiObj.name}:${emojiObj.id}'`);
        return false;
      }
    }
  }

  return true;
}

async function _verifyDBTrackedMessageRoles(db: DatabaseWrapper, messageId: number, guild: Guild) {
  const dbRoles = await getTrackedMessageRoleByTrackedMessageId(db, messageId);
  if (!dbRoles) {
    _logger.error(
      `Error fetching tracked message roles or this message has no roles associated! Tracked message dbId '${messageId}'`,
    );
    return false;
  }

  for (let dbRole of dbRoles) {
    const roleMention = dbRole[RR_TRACKED_MESSAGE_ROLE_TABLE_ROLE];
    const roleId = getIdFromRoleMention(roleMention);
    if (!roleId) {
      _logger.error(`Error parsing dbRole '${roleMention}'!`);
      return false;
    }

    if (!(await hasRoleWithId(guild, roleId))) {
      _logger.error(`Guild '${guild.name}' ('${guild.id}') does not have role '${roleMention}'`);
      return false;
    }
  }

  return true;
}

async function _removeTrackedMessage(db: DatabaseWrapper, messageId: number) {
  const { deletedemojis, deletedRoles, deletedTrackedMessages } = await deleteTrackedMessageCascade(db, messageId);
  _logger.info(
    `Removed '${deletedemojis}' emojis, '${deletedRoles}' roles and '${deletedTrackedMessages}' tracked messages for tracked message with dbID '${messageId}'`,
  );
}

/**
 *
 * ! Assumes that the emojis and roles exist both in the database and in the discord guild !
 * @param db
 * @param messageId
 * @param guild
 * @param discordMessage
 */
async function _updateReactionsAndMemberRoles(
  db: DatabaseWrapper,
  messageId: number,
  guild: Guild,
  discordMessage: Message,
) {
  _logger.debug(
    `Updating reactions and roles for tracked message '${discordMessage.id}' (dbId: '${messageId}') in guild '${guild.name}'`,
  );

  const dbMessageEmojis = await getTrackedMessageEmojiByTrackedMessageId(db, messageId);
  const dbMessageRoles = await getTrackedMessageRoleByTrackedMessageId(db, messageId);

  // Get the id's of the emojis in the database
  const dbEmojisArr = dbMessageEmojis.map((dbEmoji) => {
    const parsedEmoji = parseEmoji(dbEmoji[RR_TRACKED_MESSAGE_EMOJI_TABLE_EMOJI]);
    let emojiId = undefined;
    if (parsedEmoji) emojiId = parsedEmoji.id;
    return emojiId;
  });
  const dbEolesArr = dbMessageRoles.map((dbRole) => dbRole[RR_TRACKED_MESSAGE_ROLE_TABLE_ROLE]);

  if (discordMessage.partial) discordMessage.fetch();

  // Iterate all reactions of this message
  for (let [reactEmojiStr, messageReaction] of discordMessage.reactions.cache) {
    // Reaction emoji is being tracked
    if (!dbEmojisArr.includes(reactEmojiStr)) {
      _logger.debug(`Reaction emoji ${reactEmojiStr} is NOT being tracked! Removing reactions...`);
      await messageReaction.remove();
      continue;
    }

    // Get the roleId and the Role object from the Guild
    // Assumed role exists in this guild, it should have been verified before
    const idx = dbEmojisArr.indexOf(reactEmojiStr);
    const dbRoleMention = dbEolesArr[idx];
    const dbRoleId = getIdFromRoleMention(dbRoleMention);
    const role = await getRoleById(guild, dbRoleId!);

    // Get all the Users that reacted with this emoji,
    const reactedUserIds: Collection<string, User> = await messageReaction.users.fetch();

    for (let [reactUserId, reactUser] of reactedUserIds) {
      // Get member info
      // if this user is no longer a member of this guild, remoji this reaction
      // otherwise add the role to this member
      const reactMember = await getMemberById(guild, reactUserId);
      if (!reactMember) {
        _logger.debug(
          `User '${reactUser.username}' ('${reactUserId}') if no longer part of this guild, removing reaction`,
        );
        messageReaction.users.remove(reactUserId);
        continue;
      }

      _logger.debug(`Adding role '${role!.name}' to user '${reactUser.username}' ('${reactUserId}')`);
      reactMember.roles.add(role!);
    }
  }

  _logger.debug(`Updating reactions and roles completed!`);
}
