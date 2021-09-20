import { CommandInteraction } from 'discord.js';
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9';
import Bot from '../client/Client';

export default interface Command {
  handle: (client: Bot, interaction: CommandInteraction) => Promise<void>;
  json: RESTPostAPIApplicationCommandsJSONBody;
}
