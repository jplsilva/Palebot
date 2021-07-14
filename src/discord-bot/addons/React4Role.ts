import { BotAddon } from '../interfaces/botAddon';
import { reactForRoleCommand } from './react4role/commands';
import { messageDelete, messageReactionAdd, messageReactionRemove, readyEvent } from './react4role/events';

class React4Role implements BotAddon {
  name = 'React4Role';
  description = 'Message reactions functionality.';
  sticky = false;
  commands = new Array(reactForRoleCommand);
  events = new Array(readyEvent, messageReactionAdd, messageReactionRemove, messageDelete);
}

export = new React4Role();
