import { config } from 'dotenv';
import Bot from './client/Client';

// set up environment variables from .env file
config();

// ensure environment variables are set
if (
  [process.env.CLIENT_ID, process.env.DISCORD_TOKEN].every(
    (envVar: string | undefined) => envVar,
  )
) {
  new Bot().start();
} else {
  // eslint-disable-next-line no-console
  console.error('One or more environment variables are not set.');
}
