import { BotClient } from '../client/client';
import { BotAddon } from '../interfaces/botAddon';
import { BotCommand } from '../interfaces/botCommand';

export interface LooseObject {
  [key: string]: any;
}

/**
 * Concat the left string with the right string with a given identation
 * and/or a given margin for the right string
 * @param leftStr - Left String
 * @param rightStr - Right String
 * @param identSize - Identation size
 * @param rightStrMargin - Margin for the right string, in relation to
 *                         the beggining of the line
 * @returns a new String with the format: [identSize]LeftString[rightStrMargin]rightString
 */
export function prettyConcat(leftStr: string, rightStr: string, identSize?: number, rightStrMargin?: number): string {
  let ident = 0;
  if (identSize) {
    ident = identSize;
  }

  let padding = 1;
  // If we have been given a margin,
  // subtract strA's length from the given margin,
  if (rightStrMargin && rightStrMargin > leftStr.length) {
    padding = rightStrMargin - leftStr.length;
  }

  return `${identString(leftStr, ident)}${identString(rightStr, padding)}`;
}

/**
 * Ident a given string
 * @param string - The string to ident
 * @param identation - Identation size
 * @returns a new string with the given identation
 */
export function identString(string: string, identation: number) {
  return `${' '.repeat(identation)}${string}`;
}

export function getHelpForAddon(addon: BotAddon, lineIdent: number = 0, margin: number = 20) {
  let commandsStr = '';
  let eventsStr = '';

  addon.commands.forEach((cmd) => {
    commandsStr += prettyConcat(`- ${cmd.handles.join(', ')}`, `:: ${cmd.description}\n`, lineIdent, margin);
  });

  addon.events.forEach((evt) => {
    eventsStr += prettyConcat(`- ${evt.handle}`, `:: ${evt.description}\n`, lineIdent, margin);
  });

  return [
    '```asciidoc',
    `== Help for Addon: '${addon.name}' ==`,
    `${addon.description}`,
    ``,
    `[Commands]`,
    `${commandsStr}`,
    ``,
    `[Events]`,
    `${eventsStr}`,
    `\`\`\``,
  ].join('\n');
}

export function getHelpForCommand(command: BotCommand, lineIdent: number = 0, margin: number = 20) {
  let helpMessage = [
    '```asciidoc',
    `== Help for command: '${command.handles.join(', ')}' ==`,
    `${command.description}`,
    ``,
    `[usage]`,
    `${command.usage}`,
  ].join('\n');

  // If this command has options to print
  const cmdOptions = command.options;
  if (cmdOptions) {
    let optionsStr = '';
    cmdOptions.forEach((option) => {
      optionsStr += prettyConcat(`${option.handles.join(', ')}`, `:: ${option.description}`, lineIdent, margin) + '\n';
    });

    helpMessage += [`\n`, `[options]`, optionsStr].join('\n');
  }

  // If this command has options to print
  const cmdExamples = command.examples;
  if (cmdExamples) {
    helpMessage += [``, `[examples]`, `${cmdExamples.map((ex) => identString(ex, lineIdent)).join('\n')}`].join('\n');
  }

  helpMessage += `\`\`\``;
  return helpMessage;
}

export function getHelpForAllCommands(client: BotClient, lineIdent: number = 0, margin: number = 20) {
  if (client.commands.size <= 0) {
    return 'No commands found!';
  }

  let helpMessage = ['```asciidoc', '== List of available commands ==', '\n'].join('\n');
  client.addons.forEach((addon) => {
    addon.commands.forEach((command) => {
      helpMessage +=
        prettyConcat(`- ${command.handles.join(', ')}`, `:: ${command.description}`, lineIdent, margin) + '\n';
    });
  });

  helpMessage += '```';

  return helpMessage;
}

/**
 * Filters array with an async prodicate
 * https://advancedweb.hu/how-to-use-async-functions-with-array-filter-in-javascript/
 * @param arr
 * @param predicate
 * @returns
 */
export async function asyncFilter(arr: any[], predicate: (...args: any[]) => Promise<boolean>) {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_v, index) => results[index]);
}
