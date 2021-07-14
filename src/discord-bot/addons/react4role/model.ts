import { DatabaseWrapper } from '../../../database/db';
import { createInsertObject } from '../../utils/databaseUtil';
import { LooseObject } from '../../utils/util';

export const RR_TRACKED_MESSAGE_TABLE = 'role_react_message';
export const RR_TRACKED_MESSAGE_TABLE_ID = 'id';
export const RR_TRACKED_MESSAGE_TABLE_GUILD_ID = 'discord_guild_id';
export const RR_TRACKED_MESSAGE_TABLE_CHANNEL_ID = 'discord_channel_id';
export const RR_TRACKED_MESSAGE_TABLE_MESSAGE_ID = 'discord_message_id';

export const RR_TRACKED_MESSAGE_EMOJI_TABLE = 'role_react_message_emoji';
export const RR_TRACKED_MESSAGE_EMOJI_TABLE_ID = 'id';
export const RR_TRACKED_MESSAGE_EMOJI_TABLE_MESSAGE_ID = 'role_react_message_id';
export const RR_TRACKED_MESSAGE_EMOJI_TABLE_EMOJI = 'emoji';

export const RR_TRACKED_MESSAGE_ROLE_TABLE = 'role_react_message_role';
export const RR_TRACKED_MESSAGE_ROLE_TABLE_ID = 'id';
export const RR_TRACKED_MESSAGE_ROLE_TABLE_MESSAGE_ID = 'role_react_message_id';
export const RR_TRACKED_MESSAGE_ROLE_TABLE_ROLE = 'role';

export async function createTrackedMessageTable(db: DatabaseWrapper): Promise<void> {
  return db.schema.createTable(RR_TRACKED_MESSAGE_TABLE, (table) => {
    table.increments(RR_TRACKED_MESSAGE_TABLE_ID).primary().unsigned();
    table.string(RR_TRACKED_MESSAGE_TABLE_GUILD_ID);
    table.string(RR_TRACKED_MESSAGE_TABLE_CHANNEL_ID);
    table.string(RR_TRACKED_MESSAGE_TABLE_MESSAGE_ID).unique();
  });
}

export async function createTrackedMessageEmojiTable(db: DatabaseWrapper): Promise<void> {
  return db.schema.createTable(RR_TRACKED_MESSAGE_EMOJI_TABLE, (table) => {
    table.increments(RR_TRACKED_MESSAGE_EMOJI_TABLE_ID).primary().unsigned();
    table
      .integer(RR_TRACKED_MESSAGE_EMOJI_TABLE_MESSAGE_ID)
      .references(`${RR_TRACKED_MESSAGE_TABLE_ID}`)
      .inTable(`${RR_TRACKED_MESSAGE_TABLE}`);
    table.string(RR_TRACKED_MESSAGE_EMOJI_TABLE_EMOJI);
  });
}

export async function createTrackedMessageRoleTable(db: DatabaseWrapper): Promise<void> {
  return db.schema.createTable(RR_TRACKED_MESSAGE_ROLE_TABLE, (table) => {
    table.increments(RR_TRACKED_MESSAGE_ROLE_TABLE_ID).primary().unsigned();
    table
      .integer(RR_TRACKED_MESSAGE_ROLE_TABLE_MESSAGE_ID)
      .references(RR_TRACKED_MESSAGE_TABLE_ID)
      .inTable(RR_TRACKED_MESSAGE_TABLE);
    table.string(RR_TRACKED_MESSAGE_ROLE_TABLE_ROLE);
  });
}

export async function dropTrackedMessageTable(db: DatabaseWrapper): Promise<void> {
  await db.schema.dropTableIfExists(RR_TRACKED_MESSAGE_TABLE);
}

export async function dropTrackedMessageEmojiTable(db: DatabaseWrapper): Promise<void> {
  await db.schema.dropTableIfExists(RR_TRACKED_MESSAGE_EMOJI_TABLE);
}

export async function dropTrackedMessageRoleTable(db: DatabaseWrapper): Promise<void> {
  await db.schema.dropTableIfExists(RR_TRACKED_MESSAGE_ROLE_TABLE);
}

export async function hasTrackedMessageTable(db: DatabaseWrapper): Promise<boolean> {
  return db.schema.hasTable(RR_TRACKED_MESSAGE_TABLE);
}

export async function hasTrackedMessageEmojiTable(db: DatabaseWrapper): Promise<boolean> {
  return db.schema.hasTable(RR_TRACKED_MESSAGE_EMOJI_TABLE);
}

export async function hasTrackedMessageRoleTable(db: DatabaseWrapper): Promise<boolean> {
  return db.schema.hasTable(RR_TRACKED_MESSAGE_ROLE_TABLE);
}

export async function getAllTrackedMessages(db: DatabaseWrapper, limit?: number): Promise<LooseObject[]> {
  if (limit) return db.select().from(RR_TRACKED_MESSAGE_TABLE).limit(limit);

  return db.select().from(RR_TRACKED_MESSAGE_TABLE);
}

export async function getTrackedMessageById(db: DatabaseWrapper, id: number): Promise<LooseObject> {
  return db.select().from(RR_TRACKED_MESSAGE_TABLE).where(RR_TRACKED_MESSAGE_TABLE_ID, id).first();
}

export async function getTrackedMessageByTableColumns(
  db: DatabaseWrapper,
  guildId: string,
  channelId: string,
  discordMessageId: string,
): Promise<LooseObject> {
  return db
    .select()
    .from(RR_TRACKED_MESSAGE_TABLE)
    .where(RR_TRACKED_MESSAGE_TABLE_GUILD_ID, guildId)
    .andWhere(RR_TRACKED_MESSAGE_TABLE_CHANNEL_ID, channelId)
    .andWhere(RR_TRACKED_MESSAGE_TABLE_MESSAGE_ID, discordMessageId)
    .first();
}

export async function getTrackedMessageEmojiById(db: DatabaseWrapper, id: number): Promise<LooseObject> {
  return db.select().from(RR_TRACKED_MESSAGE_EMOJI_TABLE).where(RR_TRACKED_MESSAGE_EMOJI_TABLE_ID, id).first();
}

export async function getTrackedMessageEmojiByTrackedMessageId(
  db: DatabaseWrapper,
  id: number,
): Promise<LooseObject[]> {
  return db.select().from(RR_TRACKED_MESSAGE_EMOJI_TABLE).where(RR_TRACKED_MESSAGE_EMOJI_TABLE_MESSAGE_ID, id);
}

export async function getTrackedMessageRoleById(db: DatabaseWrapper, id: number): Promise<LooseObject> {
  return db.select().from(RR_TRACKED_MESSAGE_ROLE_TABLE).where(RR_TRACKED_MESSAGE_ROLE_TABLE_ID, id).first();
}

export async function getTrackedMessageRoleByTrackedMessageId(db: DatabaseWrapper, id: number): Promise<LooseObject[]> {
  return db.select().from(RR_TRACKED_MESSAGE_ROLE_TABLE).where(RR_TRACKED_MESSAGE_ROLE_TABLE_MESSAGE_ID, id);
}

export async function insertTrackedMessage(
  db: DatabaseWrapper,
  discordMessageId: string,
  guildId: string,
  channelId: string,
  returning?: string[],
): Promise<any[] | undefined> {
  // Create the message data to insert
  const dbMessageColumns = [
    RR_TRACKED_MESSAGE_TABLE_MESSAGE_ID,
    RR_TRACKED_MESSAGE_TABLE_GUILD_ID,
    RR_TRACKED_MESSAGE_TABLE_CHANNEL_ID,
  ];
  const dbMessageValues = [discordMessageId, guildId, channelId];
  const messageDataToInsert = createInsertObject(dbMessageColumns, dbMessageValues);
  if (!messageDataToInsert) return undefined;

  if (!returning) returning = [RR_TRACKED_MESSAGE_TABLE_ID];
  return db.insert(messageDataToInsert, returning).into(RR_TRACKED_MESSAGE_TABLE);
}

export async function insertTrackedMessageEmoji(
  db: DatabaseWrapper,
  trackedMessageId: number,
  emoji: string,
  returning?: string[],
): Promise<any[] | undefined> {
  // Create the emoji data to insert
  const dbemojiColumns = [RR_TRACKED_MESSAGE_EMOJI_TABLE_MESSAGE_ID, RR_TRACKED_MESSAGE_EMOJI_TABLE_EMOJI];
  const dbEmojiValues = [trackedMessageId, emoji];
  const emojiDataToInsert = createInsertObject(dbemojiColumns, dbEmojiValues);
  if (!emojiDataToInsert) return undefined;

  if (!returning) returning = [RR_TRACKED_MESSAGE_EMOJI_TABLE_ID];
  return db.insert(emojiDataToInsert, returning).into(RR_TRACKED_MESSAGE_EMOJI_TABLE);
}

export async function insertTrackedMessageRole(
  db: DatabaseWrapper,
  trackedMessageId: number,
  role: string,
  returning?: string[],
): Promise<any[] | undefined> {
  // Create the role data to insert
  const dbRoleColumns = [RR_TRACKED_MESSAGE_ROLE_TABLE_MESSAGE_ID, RR_TRACKED_MESSAGE_ROLE_TABLE_ROLE];
  const dbRoleValues = [trackedMessageId, role];
  const roleDataToInsert = createInsertObject(dbRoleColumns, dbRoleValues);
  if (!roleDataToInsert) return undefined;

  if (!returning) returning = [RR_TRACKED_MESSAGE_ROLE_TABLE_ID];
  return db.insert(roleDataToInsert, returning).into(RR_TRACKED_MESSAGE_ROLE_TABLE);
}

export async function deleteTrackedMessageById(db: DatabaseWrapper, id: number): Promise<number> {
  return db.delete().from(RR_TRACKED_MESSAGE_TABLE).where(RR_TRACKED_MESSAGE_TABLE_ID, id);
}

export async function deleteTrackedMessageByTableColumns(
  db: DatabaseWrapper,
  guildId: string,
  channelId: string,
  discordMessageId: string,
): Promise<number> {
  return db
    .delete()
    .from(RR_TRACKED_MESSAGE_TABLE)
    .where(RR_TRACKED_MESSAGE_TABLE_GUILD_ID, guildId)
    .andWhere(RR_TRACKED_MESSAGE_TABLE_CHANNEL_ID, channelId)
    .andWhere(RR_TRACKED_MESSAGE_TABLE_MESSAGE_ID, discordMessageId);
}

export async function deleteTrackedMessageEmojiById(db: DatabaseWrapper, id: number): Promise<number> {
  return db.delete().from(RR_TRACKED_MESSAGE_EMOJI_TABLE).where(RR_TRACKED_MESSAGE_EMOJI_TABLE_ID, id);
}

export async function deleteTrackedMessageEmojiByTrackedMessageId(db: DatabaseWrapper, id: number): Promise<number> {
  return db.delete().from(RR_TRACKED_MESSAGE_EMOJI_TABLE).where(RR_TRACKED_MESSAGE_EMOJI_TABLE_MESSAGE_ID, id);
}

export async function deleteTrackedMessageRoleById(db: DatabaseWrapper, id: number): Promise<number> {
  return db.delete().from(RR_TRACKED_MESSAGE_ROLE_TABLE).where(RR_TRACKED_MESSAGE_ROLE_TABLE_ID, id);
}

export async function deleteTrackedMessageRoleByTrackedMessageId(db: DatabaseWrapper, id: number): Promise<number> {
  return db.delete().from(RR_TRACKED_MESSAGE_ROLE_TABLE).where(RR_TRACKED_MESSAGE_ROLE_TABLE_MESSAGE_ID, id);
}

export async function deleteTrackedMessageCascade(db: DatabaseWrapper, messageId: number) {
  const deletedemojis = await deleteTrackedMessageEmojiByTrackedMessageId(db, messageId);
  const deletedRoles = await deleteTrackedMessageRoleByTrackedMessageId(db, messageId);
  const deletedTrackedMessages = await deleteTrackedMessageById(db, messageId);
  return { deletedTrackedMessages, deletedemojis, deletedRoles };
}
