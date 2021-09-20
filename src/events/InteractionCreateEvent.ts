import { hyperlink, userMention } from '@discordjs/builders';
import { Constants, Interaction } from 'discord.js';
import Bot from '../client/Client';
import Handler from '../interfaces/HandlerStorage';

const SOURCE = 'SOURCE';
const DESTINATION = 'DESTINATION';

export const handler: Handler<Interaction> = async (
  client: Bot,
  interaction: Interaction,
): Promise<void> => {
  if (interaction.isCommand()) {
    if (client.commands.has(interaction.commandName)) {
      const metadata = client.commands.get(interaction.commandName);
      const destination = interaction.options.getUser('target', true);
      // type guards
      if (metadata && interaction.member) {
        // send command response
        interaction.reply(
          `${metadata.message
            .replace(SOURCE, userMention(interaction.user.id))
            .replace(DESTINATION, userMention(destination.id))}`,
        );
      }
    } else {
      interaction.reply({
        content: `Houston, we found a bug! Please report it ${hyperlink(
          'here',
          'https://github.com/mahyarmirrashed/bot-kaomoji/issues/new?assignees=&labels=&template=bug_report.md',
        )} thanks!`,
        ephemeral: true,
      });
    }
  }
};

export const name = Constants.Events.INTERACTION_CREATE;
