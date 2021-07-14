import { BotCommand } from './botCommand';
import { BotEvent } from './botEvent';

export interface BotAddon {
  name: string;
  description: string;
  sticky: boolean;
  commands: BotCommand[];
  events: BotEvent[];
}
