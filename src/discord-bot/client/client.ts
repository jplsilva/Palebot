import glob from 'glob';
import { promisify } from 'util';
import { Client, Collection } from 'discord.js';

import { BotConfig } from '../../interfaces/config';
import { DatabaseWrapper } from '../../database/db';
import { BotAddon } from '../interfaces/botAddon';
import { BotCommand } from '../interfaces/botCommand';
import { BotEvent } from '../interfaces/botEvent';
import { createLogger } from '../../logging/log';

const globPromise = promisify(glob);

class BotClient extends Client {
  // All loaded addons
  // TODO: Use database for the enabled/disable addons
  public addons: Collection<string, BotAddon>;
  public commands: Collection<string, BotCommand>;
  public config: BotConfig;
  public db: DatabaseWrapper;
  public isReady: boolean;
  private _logger;

  public constructor(db: DatabaseWrapper, config: BotConfig) {
    super({ partials: config.partials });
    this.addons = new Collection<string, BotAddon>();
    this.commands = new Collection<string, BotCommand>();
    this.config = config;
    this.db = db;
    this.isReady = false;
    this._logger = createLogger('BotClient');
  }

  public async init(): Promise<void> {
    // Catch unhandled API errors
    process.on('unhandledRejection', (error: Error) => {
      this._logger.error(`Unhandled promise rejection: \n${error.stack ? error.stack : error}`);
    });

    this.on('ready', () => {
      this._logger.info('Bot is now ready!');
      this.isReady = true;
    });

    this.fetchLocalAddons()
      .then((localAddons) => this.importAddons(localAddons))
      .then(() => this.login(this.config.token));
  }

  private async fetchLocalAddons() {
    // Get all files in the addon folder, ending with .ts or .js
    const addonFiles: string[] = await globPromise(`${__dirname}/../addons/*{.ts,.js}`);

    this._logger.info(`Found addons: ${addonFiles.length}`);
    return addonFiles;
  }

  private async importAddons(addons: string[]) {
    // Import the addons and register all their commands and events
    for (const fileName of addons) {
      let addon: BotAddon | undefined = undefined;
      let addonName: string | undefined = undefined;
      try {
        addon = await import(fileName);
        if (!addon) {
          this._logger.warn(`Addon '${fileName}' not found! Skipping import...`);
          return;
        }

        addonName = addon.name.toLowerCase();
        if (this.addons.has(addonName)) {
          this._logger.warn(`Addon ${addonName} is already registered! Ignoring this addon...`);
          return;
        }
      } catch (error) {
        this._logger.error(`Error importing Addon '${fileName}'!\n${error}`);
        return;
      }

      try {
        const addonCmds = addon.commands;
        const registeredCommands = await this.registerCommands(addonCmds);
        this._logger.debug(`Registered Commands for addon '${addonName}': ${registeredCommands}`);
      } catch (error) {
        this._logger.error(`Error importing Addon '${addonName}' commands!\n${error}`);
        return;
      }
      try {
        const addonEvts = addon.events;
        const registeredEvents = await this.registerEvents(addonEvts);
        this._logger.debug(`Registered Events for addon '${addonName}': ${registeredEvents}`);
      } catch (error) {
        this._logger.error(`Error importing Addon '${addonName}' events!\n${error}`);
        return;
      }

      this.addons.set(addonName, addon);
      this._logger.info(`Imported addon: ${addonName}`);
    }
  }

  private async registerCommands(commands: BotCommand[]) {
    let importedCommands = 0;
    // Create command map with all the addon command handles
    commands.forEach((command) => {
      command.handles.forEach((handle) => {
        handle = handle.toLowerCase();
        const existingCommand = this.commands.get(handle);
        if (existingCommand) {
          this._logger.warn(`Command handle ${handle} is already registered! Ignoring this handle...`);
        } else {
          this.commands.set(handle, command);
          importedCommands++;
        }
      });
    });
    return importedCommands;
  }

  private async registerEvents(events: BotEvent[]) {
    let importedEvents = 0;
    // Register the addon events in the bot client
    events.forEach((event) => {
      this.on(event.handle, event.run.bind(null, this));
      importedEvents++;
    });
    return importedEvents;
  }
}

export { BotClient };
