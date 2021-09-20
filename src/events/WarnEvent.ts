import { Constants } from 'discord.js';
import Bot from '../client/Client';
import Handler from '../interfaces/HandlerStorage';

export const handler: Handler<string> = async (
  client: Bot,
  warning: string,
): Promise<void> => {
  client.logger.info(warning);
};

export const name = Constants.Events.WARN;
