import { Message } from 'discord.js';
import { BotClient } from '../client/client';
import { LooseObject } from '../utils/util';

export interface BotCommand {
  handles: string[];
  description: string;
  usage: string;
  options?: BotCommandOption[];
  examples?: string[];
  run: RunCommand;
}

export type BotCommandOption = {
  handles: string[];
  description: string;
  type: 'string' | 'boolean' | 'number';
  choises?: any[];
  required?: boolean;
  requiresArgs?: boolean;
};

export interface BotCommandArguments extends LooseObject {
  error?: Error;
}

export interface RunCommand {
  (client: BotClient, message: Message, args: BotCommandArguments, rawArgs: string[]): Promise<void>;
}
