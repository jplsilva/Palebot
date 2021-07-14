import { Message } from 'discord.js';
import yargs from 'yargs/yargs';

import { getHelpForAddon, getHelpForAllCommands, getHelpForCommand } from '../utils/util';
import { BotClient } from '../client/client';
import { BotAddon } from '../interfaces/botAddon';
import { BotCommand, BotCommandArguments } from '../interfaces/botCommand';
import { BotEvent } from '../interfaces/botEvent';
import { createLogger } from '../../logging/log';

// Global variables
const addonHelpLineIdent = 0;
const addonHelpLineMargin = 25;
const commandHelpLineIdent = 2;
const commandHelpLineMargin = 25;
const logger = createLogger('CoreAddon');

// Commands
/**
 * Help command
 */
const helpCommand: BotCommand = {
  handles: ['h', 'help'],
  description: 'Prints all available commands or help for a specific command or addon',
  usage: 'help [-a|--addon name] [-c|--command name]',
  options: [
    {
      handles: ['-a', '--addon'],
      description: 'Get help for an addon',
      type: 'string',
      requiresArgs: true,
    },
    {
      handles: ['-c', '--command'],
      description: 'Get help for a command (used by default)',
      type: 'string',
      requiresArgs: true,
    },
  ],
  examples: ['help', 'help -a core', 'help -c ping', 'help ping'],
  run: async (client: BotClient, message: Message, args: BotCommandArguments) => {
    if (args.error) {
      message.reply(`Error: \`\`\`${args.error.message}\`\`\``);
      return;
    }

    // Get info from an addon
    if (args.a) {
      const param1: string = args.a.toLowerCase();
      const addon = client.addons.get(param1);
      if (!addon) {
        message.reply(`Addon ${param1} not found!`);
        return;
      }

      message.author.send(getHelpForAddon(addon, addonHelpLineIdent, addonHelpLineMargin));
      return;
    }

    // Get help for a command
    if (args.c || args._.length > 0) {
      let param1 = args.c;
      if (!param1) {
        param1 = args._[0];
      }

      param1 = param1.toLowerCase();
      const cmd = client.commands.get(param1);
      if (!cmd) {
        message.reply(`Command ${param1} not found!`);
        return;
      }

      message.author.send(getHelpForCommand(cmd, commandHelpLineIdent, commandHelpLineMargin));
      return;
    }

    // No parameters given, get the list of commands
    message.author.send(getHelpForAllCommands(client, 0, commandHelpLineMargin));
  },
};

/**
 * Ping command
 */
const pingCommand: BotCommand = {
  handles: ['p', 'ping'],
  description: 'Ping the Discord server.',
  usage: 'ping',
  run: async (client: BotClient, message: Message) => {
    const ping = client.ws.ping;
    message.reply(`${ping} ms pong!`);
  },
};

// Events
/**
 * Message event catcher - Command caller
 */
const messageReceivedEvent: BotEvent = {
  description: 'Calls available commands according to the message content.',
  handle: 'message',
  run: async (client: BotClient, message: Message) => {
    // Ignore messages from bots, without guilds and without the bot prefix
    // Also ignore messages when the bot is not ready
    if (
      message.author.bot ||
      !message.guild ||
      !message.content.toLowerCase().startsWith(client.config.prefix) ||
      !client.isReady
    ) {
      return;
    }

    // Prepare command args
    const cmdArgs: string[] = message.content.slice(client.config.prefix.length).trim().split(/ +/g);

    let cmdHandle = cmdArgs.shift();
    if (!cmdHandle) return;

    cmdHandle = cmdHandle.toLowerCase();
    const cmd = client.commands.get(cmdHandle);
    if (!cmd) return;

    let parsedArguments: BotCommandArguments = {};

    // Ths command has options, need to parse them
    if (cmd.options) {
      // Parse using yargs
      let yargsBuilder = yargs();
      cmd.options.forEach((option) => {
        const mainHandle = option.handles[0];
        yargsBuilder.option(mainHandle, {
          alias: option.handles.slice(1),
          type: option.type,
          choices: option.choises,
          demandOption: option.required,
          requiresArg: option.requiresArgs,
        });
      });

      // Include errors in the parsed arguments object, if they exist
      let parseError = undefined;
      parsedArguments = await yargsBuilder.parse(cmdArgs, (err?: Error) => {
        if (err) parseError = err;
      });
      if (parseError) parsedArguments.error = parseError;
    }

    cmd.run(client, message, parsedArguments, cmdArgs).catch((reason: any) => {
      logger.error(`Error processing command: '${cmdHandle}'. ${reason}.`);
      message.reply(`Error processing command '${cmdHandle}'. \`\`\`${reason}\`\`\``);
    });
  },
};

class Core implements BotAddon {
  name = 'Core';
  description = 'Bot core functionality.';
  sticky = true;
  commands = new Array(pingCommand, helpCommand);
  events = new Array(messageReceivedEvent);
}
export = new Core();
