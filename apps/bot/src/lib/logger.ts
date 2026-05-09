import { Logger, LogLevel } from '@sapphire/framework';
import { existsSync, mkdirSync, createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

function getLogFile(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return join(LOG_DIR, `nova-${date}.log`);
}

let currentDate = new Date().toISOString().slice(0, 10);
let stream: WriteStream = createWriteStream(getLogFile(), { flags: 'a' });

function rotateIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDate) {
    currentDate = today;
    stream.end();
    stream = createWriteStream(getLogFile(), { flags: 'a' });
  }
}

export const logger = new Logger(
  process.env.NODE_ENV === 'production' ? LogLevel.Info : LogLevel.Debug,
  {
    write: (data: string) => {
      rotateIfNeeded();
      const line = `[${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Kuching' })}] ${data}`;

      // Console dengan warna Sapphire
      process.stdout.write(line + '\n');

      // File tanpa warna
      // eslint-disable-next-line no-control-regex
      const clean = line.replace(/\u001b\[[0-9;]*m/g, '');
      stream.write(clean + '\n');
    },
  },
);
