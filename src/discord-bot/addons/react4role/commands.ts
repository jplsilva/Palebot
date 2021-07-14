import { Message, TextChannel } from 'discord.js';
import { DatabaseWrapper } from '../../../database/db';
import { createLogger } from '../../../logging/log';
import { BotClient } from '../../client/client';
import { BotCommand, BotCommandArguments } from '../../interfaces/botCommand';
import { getChannelById, getIdFromChannelMention, wrapInCodeBlock } from '../../utils/discordUtil';
import {
  deleteTrackedMessageCascade,
  insertTrackedMessage,
  insertTrackedMessageEmoji,
  insertTrackedMessageRole,
} from './model';

// Logger
const _logger = createLogger('React4RoleAddon/Commands');

// Commands
/**
 * React Role Create command
 */
export const reactForRoleCommand: BotCommand = {
  handles: ['rrc', 'react-role-create'],
  description: 'Creates a message for the bot to track the reactions and give permissions accordingly.',
  usage: 'rrc -e emoji1,emoji2 -r role1,role2 [-d description1,description2,description3] [-c channel] message',
  options: [
    {
      handles: ['-e', '--emojis'],
      description: "The reaction emojis, seperated by ','.",
      type: 'string',
      required: true,
      requiresArgs: true,
    },
    {
      handles: ['-r', '--roles'],
      description: "The roles to assign for each reaction emoji, seperated by ','.",
      type: 'string',
      required: true,
      requiresArgs: true,
    },
    {
      handles: ['-d', '--description'],
      description: "Description to add after each role, seperated by ','.",
      type: 'string',
      requiresArgs: true,
    },
    {
      handles: ['-c', '--channel'],
      description: 'The channel to post the reaction message in.',
      type: 'string',
      requiresArgs: true,
    },
  ],
  examples: [
    'rrc React to this message for some roles! -e emoji1,emoji2 -r role1,role2',
    'rrc React4Role! -e emoji1,emoji2 -r role1,role2 -d description1,description2,description3 -c #yard',
  ],
  run: async (client: BotClient, message: Message, args: BotCommandArguments) => {
    const guild = message.guild;
    const author = message.member;
    // DM message
    if (!guild || !author) {
      return;
    }

    const db = client.db;
    if (!db) {
      _logger.error(`Error processing rrc command: database not found!`);
      message.reply(wrapInCodeBlock(`Error while processing your request`));
      return;
    }

    const errorMsgPrefix = `Member '${author.displayName}' ('${author.id}'), Error while executing the 'rrc' command: `;

    if (!author.hasPermission('ADMINISTRATOR')) {
      const errorMsg = `You don't have permission to execute this command!`;
      _logger.warn(`${errorMsgPrefix}${errorMsg}`);
      message.reply(`Error: ${wrapInCodeBlock(errorMsg)}`);
      return;
    }

    if (args.error) {
      const errorMsg = args.error.message;
      _logger.debug(`${errorMsgPrefix}${errorMsg}`);
      message.reply(`Error: ${wrapInCodeBlock(errorMsg)}`);
      return;
    }

    const emojisArr: string[] = args.e.split(',');
    const rolesArr: string[] = args.r.split(',');
    const descriptionArr: string[] | undefined = args.d ? args.d.split(',') : undefined;

    // Different number of emojis/Roles/Descriptions provided
    if (emojisArr.length != rolesArr.length || (descriptionArr && descriptionArr.length != rolesArr.length)) {
      const errorMsg = [
        `The number of emojis/roles/descriptions are different!`,
        `Number of emojis: ${emojisArr.length}; Number of roles: ${rolesArr.length}; Number of descriptions: ${
          descriptionArr ? descriptionArr.length : 'undefined'
        }`,
      ].join('\n');
      _logger.debug(`${errorMsgPrefix}${errorMsg}`);
      message.reply(`Error: ${wrapInCodeBlock(errorMsg)}`);

      return;
    }

    // Text to put on the new message
    const messageArr: string[] = args._;
    const messageStr = messageArr.join(' ');

    // -c option used? If not use the channel where the rrc message was received
    let targetChannel = message.channel as TextChannel;
    if (args.c) {
      const channelId = await getIdFromChannelMention(args.c);
      if (!channelId) {
        const errorMsg = `Not a valid channel mention '${args.c}' for argument -c`;
        _logger.debug(`${errorMsgPrefix}${errorMsg}`);
        message.reply(`Error: ${wrapInCodeBlock(errorMsg)}`);
        return;
      }

      const channel = await getChannelById(client, channelId);
      if (!channel) {
        const errorMsg = `Channel '${args.c}' not found`;
        _logger.debug(`${errorMsgPrefix}${errorMsg}`);
        message.reply(`Error: ${wrapInCodeBlock(errorMsg)}`);
        return;
      }

      // Has to be a text channel
      if (!channel.isText() || channel.type == 'dm') {
        const errorMsg = `Channel '${args.c}' must be a text channel`;
        _logger.debug(`${errorMsgPrefix}${errorMsg}`);
        message.reply(`Error: ${wrapInCodeBlock(errorMsg)}`);
        return;
      }

      targetChannel = channel as TextChannel;
    }

    // Build final message content
    let resultMessage = messageStr;
    for (let i in emojisArr) {
      resultMessage += `\n- ${emojisArr[i]} => ${rolesArr[i]}`;
      if (descriptionArr) {
        resultMessage += ` - ${descriptionArr[i]}`;
      }
    }

    // Send message and register its ID for tracking
    targetChannel.send(resultMessage).then(async (reactMessage: Message) => {
      // Insert message data into the db and get its ID
      const dbMessageIdArr = await insertTrackedMessage(db, reactMessage.id, guild.id, targetChannel.id);
      if (!dbMessageIdArr || dbMessageIdArr.length < 1) {
        const errorMsg = `Error inserting message data into the database!`;
        reactMessage.delete();
        _logger.error(`${errorMsgPrefix}${errorMsg}`);
        message.reply(`${wrapInCodeBlock(errorMsg)}`);
        return;
      }

      const dbMessageId: number = dbMessageIdArr[0];

      // Insert emojis into the db
      // TODO: Bulk role Insert ?
      let dbEmojiIds: string[] = [];
      for (let emoji of emojisArr) {
        const dbEmojiIdArr = await insertTrackedMessageEmoji(db, dbMessageId, emoji);
        if (!dbEmojiIdArr || dbEmojiIdArr.length < 1) {
          // Report error to user and to log
          const errorMsg = `Error inserting emoji '${emoji}' into the database!`;
          await reactMessage.delete();
          _logger.error(`${errorMsgPrefix}${errorMsg}`);
          message.reply(`${wrapInCodeBlock(errorMsg)}`);

          // Delete the message and all its data from the database
          await _removeTrackedMessage(db, dbMessageId);
          return;
        }

        dbEmojiIds.concat();
      }

      // Insert roles into the db
      // TODO: Bulk role Insert ?
      let dbRoleIds: string[] = [];
      for (let role of rolesArr) {
        const dbRoleIdArr = await insertTrackedMessageRole(db, dbMessageId, role);
        if (!dbRoleIdArr || dbRoleIdArr.length < 1) {
          // Report error to user and to log
          const errorMsg = `Error inserting role '${role}' into the database!`;
          await reactMessage.delete();
          _logger.error(`${errorMsgPrefix}${errorMsg}`);
          message.reply(`${wrapInCodeBlock(errorMsg)}`);

          // Delete the message and all its data from the database
          await _removeTrackedMessage(db, dbMessageId);
          return;
        }

        dbRoleIds.concat();
      }

      _logger.debug(
        [
          `Member '${author.displayName}' ('${author.id}') created 'rrc' message`,
          `'${message.id}' (dbId: '${dbMessageId}') in guild '${guild.name}' ('${guild.id}')`,
          `and channel '${targetChannel.name}' ('${targetChannel.id}')`,
        ].join(' '),
      );
    }); // End of Discord message creation promise handler
  }, // End of run
}; // End of rrc command

async function _removeTrackedMessage(db: DatabaseWrapper, messageId: number) {
  const { deletedemojis, deletedRoles, deletedTrackedMessages } = await deleteTrackedMessageCascade(db, messageId);
  _logger.info(
    [
      `Removed:`,
      `'${deletedemojis}' emojis,`,
      `'${deletedRoles}' roles`,
      `and '${deletedTrackedMessages}' tracked messages`,
    ].join(' '),
  );
}
