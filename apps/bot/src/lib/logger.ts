import { LogLevel, type ILogger } from '@sapphire/framework';
import { existsSync, mkdirSync, createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

const getLogFile = () => join(LOG_DIR, `nova-${new Date().toISOString().slice(0, 10)}.log`);

let currentDate = new Date().toISOString().slice(0, 10);
let stream: WriteStream = createWriteStream(getLogFile(), { flags: 'a' });

const rotate = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDate) {
    currentDate = today;
    stream.end();
    stream = createWriteStream(getLogFile(), { flags: 'a' });
  }
};

export class RotatingLogger implements ILogger {
  public level = process.env.NODE_ENV === 'production' ? LogLevel.Info : LogLevel.Debug;

  public write(level: LogLevel, ...values: readonly unknown[]): void {
    rotate();
    const levelName = LogLevel[level].toLowerCase();
    const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Kuching' });
    const msg = values
      .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
      .join(' ');
    const line = `[${time}] [${levelName.toUpperCase()}] ${msg}`;

    process.stdout.write(line + '\n');
    // eslint-disable-next-line no-control-regex
    const clean = line.replace(/\u001b\[[0-9;]*m/g, '');
    stream.write(clean + '\n');
  }

  public trace(...values: readonly unknown[]) {
    this.write(LogLevel.Trace, ...values);
  }
  public debug(...values: readonly unknown[]) {
    this.write(LogLevel.Debug, ...values);
  }
  public info(...values: readonly unknown[]) {
    this.write(LogLevel.Info, ...values);
  }
  public warn(...values: readonly unknown[]) {
    this.write(LogLevel.Warn, ...values);
  }
  public error(...values: readonly unknown[]) {
    this.write(LogLevel.Error, ...values);
  }
  public fatal(...values: readonly unknown[]) {
    this.write(LogLevel.Fatal, ...values);
  }

  public has(level: LogLevel) {
    return level >= this.level;
  }
}

export const logger = new RotatingLogger();
