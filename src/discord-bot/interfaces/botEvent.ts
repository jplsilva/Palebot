import { ClientEvents } from 'discord.js';
import { BotClient } from '../client/client';

export interface BotEvent {
  handle: keyof ClientEvents;
  description: string;
  run: RunEvent;
}

export interface RunEvent {
  (client: BotClient, ...args: any[]): Promise<void>;
}
