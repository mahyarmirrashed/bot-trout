import {
  SlashCommandBuilder,
  SlashCommandUserOption,
} from '@discordjs/builders';
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
import Event from '../interfaces/EventStorage';
import CommandMetadata from '../types/CommandMetadataType';
import Command from '../types/CommandType';
import * as commandsFile from '../../data/commands.json';

const globPromise = promisify(glob);

export default class Bot extends Client {
  // readonly members
  public readonly commands = new Collection<string, CommandMetadata>();
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

    // load commands
    this.commands = new Collection<string, CommandMetadata>();
    (commandsFile.commands as Command[]).forEach((command: Command) =>
      this.commands.set(command.name, command.metadata),
    );
  }

  public start(): void {
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
    new REST({ version: '9' })
      .setToken(process.env.DISCORD_TOKEN as string)
      .put(
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID as string,
          process.env.GUILD_ID as string,
        ),
        {
          body: [
            ...this.commands.entries(),
          ].map<RESTPostAPIApplicationCommandsJSONBody>(
            ([name, metadata]: [string, CommandMetadata]) =>
              new SlashCommandBuilder()
                .setName(name)
                .setDescription(metadata.description)
                .setDefaultPermission(true)
                .addUserOption((option: SlashCommandUserOption) =>
                  option
                    .setName('target')
                    .setDescription('Person to target.')
                    .setRequired(true),
                )
                .toJSON(),
          ),
        },
      )
      .then(() =>
        this.logger.success(
          'Successfully registered all application commands!',
        ),
      )
      .catch((e: unknown) => this.logger.error(e));
  }
}
