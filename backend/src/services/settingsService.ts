import type { SettingsRepository } from '../repositories/settingsRepository';
import type { SettingsUpdate } from '../validators/settings';

const SETTING_KEYS = new Set([
  'ai_provider',
  'ai_model',
  'ai_enabled',
  'ai_cloud_consent_provider',
]);

export class SettingsService {
  constructor(private settingsRepo: SettingsRepository) {}

  getAll() {
    return this.settingsRepo.getAll();
  }

  get(key: string) {
    return this.settingsRepo.getByKey(key) ?? null;
  }

  update(settings: SettingsUpdate) {
    const allowed: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (!SETTING_KEYS.has(key)) continue;
      if (key === 'ai_enabled' && typeof value === 'boolean') {
        allowed[key] = value ? 'true' : 'false';
      } else if (typeof value === 'string') {
        allowed[key] = value;
      }
    }

    const currentProvider = this.settingsRepo.getByKey('ai_provider')?.value ?? 'openai';
    const nextProvider = settings.ai_provider ?? currentProvider;
    if (nextProvider !== currentProvider && settings.ai_cloud_consent_provider === undefined) {
      this.settingsRepo.delete('ai_cloud_consent_provider');
    }
    if (settings.ai_cloud_consent_provider === null) {
      this.settingsRepo.delete('ai_cloud_consent_provider');
      delete allowed.ai_cloud_consent_provider;
    }

    this.settingsRepo.delete('ai_api_key');
    // Legacy arbitrary endpoints must not be reused for credentials or requests.
    this.settingsRepo.delete('ai_endpoint');
    this.settingsRepo.upsertMany(allowed);
    return this.settingsRepo.getAll();
  }
}
