import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AIProviderName } from './providerTypes';

export type CloudAIProvider = Exclude<AIProviderName, 'ollama'>;
export type CredentialSource = 'settings' | 'environment' | null;
type StoredCredentials = Partial<Record<CloudAIProvider, string>>;

const ENVIRONMENT_KEYS: Record<CloudAIProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  groq: 'GROQ_API_KEY',
};

function defaultDirectory(): string {
  if (process.env.GHOSTLEDGER_SECRET_DIR?.trim())
    return resolve(process.env.GHOSTLEDGER_SECRET_DIR.trim());
  if (process.platform === 'win32')
    return join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'GhostLedger');
  if (process.platform === 'darwin')
    return join(homedir(), 'Library', 'Application Support', 'GhostLedger');
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'ghostledger');
}

function secureWindowsAcl(path: string, directory: boolean): void {
  const identity = spawnSync('whoami.exe', [], { encoding: 'utf8', windowsHide: true });
  const account = identity.status === 0 ? identity.stdout.trim() : '';
  if (!account || /[\r\n]/.test(account))
    throw new Error('Could not secure the local AI credential store.');
  const permissions = directory ? `${account}:(OI)(CI)(F)` : `${account}:(F)`;
  const result = spawnSync('icacls.exe', [path, '/inheritance:r', '/grant:r', permissions], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error || result.status !== 0)
    throw new Error('Could not secure the local AI credential store.');
}

/**
 * Stores provider credentials outside SQLite, browser storage, and finance backups.
 * The small JSON file is restricted to the current user on Windows and POSIX systems.
 */
export class LocalCredentialStore {
  private readonly directory: string;
  private readonly filePath: string;
  private cached: StoredCredentials | undefined;

  constructor(directory = defaultDirectory()) {
    this.directory = resolve(directory);
    this.filePath = join(this.directory, 'provider-credentials.json');
  }

  private secureDirectory(): void {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const directoryInfo = lstatSync(this.directory);
    if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink())
      throw new Error('The local AI credential store directory must be a regular directory.');
    if (process.platform === 'win32') secureWindowsAcl(this.directory, true);
    else chmodSync(this.directory, 0o700);
  }

  private read(): StoredCredentials {
    if (this.cached) return this.cached;
    if (!existsSync(this.filePath)) {
      this.cached = {};
      return this.cached;
    }
    const fileInfo = lstatSync(this.filePath);
    if (!fileInfo.isFile() || fileInfo.isSymbolicLink())
      throw new Error('The local AI credential store must be a regular file.');
    this.secureDirectory();
    if (process.platform === 'win32') secureWindowsAcl(this.filePath, false);
    else chmodSync(this.filePath, 0o600);

    try {
      const parsed: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      const values = parsed as Record<string, unknown>;
      this.cached = {
        ...(typeof values.openai === 'string' && values.openai ? { openai: values.openai } : {}),
        ...(typeof values.anthropic === 'string' && values.anthropic
          ? { anthropic: values.anthropic }
          : {}),
        ...(typeof values.groq === 'string' && values.groq ? { groq: values.groq } : {}),
      };
      return this.cached;
    } catch {
      throw new Error(
        'The local AI credential store could not be read. Check its file permissions.',
      );
    }
  }

  private write(values: StoredCredentials): void {
    this.secureDirectory();
    const temporaryPath = join(this.directory, `.provider-credentials-${randomUUID()}.tmp`);
    try {
      writeFileSync(temporaryPath, JSON.stringify(values), {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'wx',
      });
      if (process.platform === 'win32') secureWindowsAcl(temporaryPath, false);
      else chmodSync(temporaryPath, 0o600);
      renameSync(temporaryPath, this.filePath);
      if (process.platform === 'win32') secureWindowsAcl(this.filePath, false);
      else chmodSync(this.filePath, 0o600);
      this.cached = values;
    } catch {
      try {
        if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
      } catch {
        // Keep filesystem details and any credential material out of error messages.
      }
      throw new Error(
        'The local AI credential store could not be updated. Check its file permissions.',
      );
    }
  }

  getSaved(provider: CloudAIProvider): string | undefined {
    return this.read()[provider];
  }

  getSource(provider: CloudAIProvider): CredentialSource {
    if (this.getSaved(provider)) return 'settings';
    return process.env[ENVIRONMENT_KEYS[provider]]?.trim() ? 'environment' : null;
  }

  get(provider: CloudAIProvider): string | undefined {
    return (
      this.getSaved(provider) ?? (process.env[ENVIRONMENT_KEYS[provider]]?.trim() || undefined)
    );
  }

  save(provider: CloudAIProvider, key: string): void {
    const values = { ...this.read(), [provider]: key };
    this.write(values);
  }

  remove(provider: CloudAIProvider): void {
    const values = { ...this.read() };
    delete values[provider];
    if (Object.keys(values).length === 0) {
      try {
        if (existsSync(this.filePath)) unlinkSync(this.filePath);
        this.cached = {};
      } catch {
        throw new Error(
          'The local AI credential store could not be updated. Check its file permissions.',
        );
      }
      return;
    }
    this.write(values);
  }
}

export const localCredentialStore = new LocalCredentialStore();

export function providerCredential(provider: CloudAIProvider): string | undefined {
  return localCredentialStore.get(provider);
}

export function providerCredentialSource(provider: CloudAIProvider): CredentialSource {
  return localCredentialStore.getSource(provider);
}
