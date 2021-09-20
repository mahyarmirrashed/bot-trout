import { REST } from '@discordjs/rest';
import { cyan } from 'chalk';
import consola from 'consola';
import {
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from 'discord-api-types/v9';
import {
  Client,
  Collection,
  Intents,
  LimitedCollection,
  Options,
} from 'discord.js';
import { glob } from 'glob';
import { promisify } from 'util';
import Command from '../interfaces/CommandStorage';
import Event from '../interfaces/EventStorage';

const globPromise = promisify(glob);

export default class Bot extends Client {
  // readonly members
  public readonly commands = new Collection<string, Command>();
  public readonly events = new Collection<string, Event>();
  public readonly logger = consola;

  public constructor() {
    super({
      // only need access to send and delete messages inside guild
      intents: [Intents.FLAGS.GUILD_MESSAGES],
      // caching options for threads and messages
      makeCache: Options.cacheWithLimits({
        // default thread sweeping behaviour
        ...Options.defaultMakeCacheSettings,
        // sweep messages every 5 minutes
        // remove messages not edited or created in last 30 minutes
        MessageManager: {
          sweepInterval: 300,
          sweepFilter: LimitedCollection.filterByLifetime({
            lifetime: 1800,
            getComparisonTimestamp: (e) =>
              e.editedTimestamp ?? e.createdTimestamp,
          }),
        },
      }),
    });

    // log into client
    super.login(process.env.DISCORD_TOKEN as string).catch(this.logger.error);
  }

  public start(): void {
    // register events
    // register events
    globPromise(`${__dirname}/../events/**/*{.ts,.js}`)
      .then((events: string[]) => {
        events.map(async (eventPath: string) => {
          import(eventPath).then((event: Event) => {
            this.logger.info(`Registering event ${cyan(event.name)}...`);
            this.events.set(event.name, event);
            this.on(event.name, event.handler.bind(null, this));
          });
        });
      })
      .catch(this.logger.error);

    // register slash commands
    globPromise(`${__dirname}/../commands/**/*{.ts,.js}`).then(
      (commands: string[]) =>
        // once all promises return their json, report to API
        Promise.all(
          commands.map(
            async (
              commandPath: string,
            ): Promise<RESTPostAPIApplicationCommandsJSONBody> =>
              import(commandPath).then(
                (command: Command): RESTPostAPIApplicationCommandsJSONBody => {
                  this.logger.info(
                    `Registering command ${cyan(command.json.name)}...`,
                  );
                  this.commands.set(command.json.name, command);
                  // return slash command's JSON for array construction
                  return command.json;
                },
              ),
          ),
        ).then((slashCommands: RESTPostAPIApplicationCommandsJSONBody[]) =>
          // report slash commands to Discord API
          new REST({ version: '9' })
            .setToken(process.env.DISCORD_TOKEN as string)
            .put(
              Routes.applicationGuildCommands(
                process.env.CLIENT_ID as string,
                process.env.GUILD_ID as string,
              ),
              {
                body: slashCommands,
              },
            )
            .then(() =>
              this.logger.success(
                'Successfully registered all application commands!',
              ),
            )
            .catch(this.logger.error),
        ),
    );
  }
}
