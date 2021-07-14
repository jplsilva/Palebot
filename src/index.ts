import ConfigJson from './config.json';
import { Config } from './interfaces/config';
import { createLogger, setBaseLoggerConfig } from './logging/log';
import { BotClient } from './discord-bot/client/client';
import express from 'express';
import { databaseWrapper } from './database/db';

const db = databaseWrapper(ConfigJson.DatabaseConfig.development);

// Setup environment setting
// Default is prd, first program argument should be another environment (like dev)
process.env.NODE_ENV = 'prd';
if (process.argv.length > 2 && process.argv[2] === 'dev') {
  process.env.NODE_ENV = 'dev';
}

const config: Config = JSON.parse(JSON.stringify(ConfigJson));
setBaseLoggerConfig(config.LoggerConfig);

const _logger = createLogger(`MainApp`);
_logger.info('');
_logger.info(`- - - - Application Start - - - -`);
_logger.info(`Starting application in '${process.env.NODE_ENV}' mode`);
_logger.log('debug', `Application using config:\n%j`, config);

const bot = new BotClient(db, config.BotConfig);
bot.init();

/* Web Server Stuff
 * Not implemented yet

const app = express();

// app.use(express.urlencoded({extended: true}));
app.use(express.json());

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Resource not found!' });
});

app.listen(ConfigJson.ServerConfig.port, () =>
  console.log(`Server listening to port. ${ConfigJson.ServerConfig.port}`),
);
*/
