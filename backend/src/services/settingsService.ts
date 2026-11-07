import type { SettingsRepository } from '../repositories/settingsRepository';
import type { SettingsUpdate } from '../validators/settings';

const SETTING_KEYS = new Set([
  'ai_provider',
  'ai_model',
  'ai_endpoint',
  'theme',
  'currency',
  'language',
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
      if (SETTING_KEYS.has(key) && typeof value === 'string') allowed[key] = value;
    }
    this.settingsRepo.delete('ai_api_key');
    this.settingsRepo.upsertMany(allowed);
    return this.settingsRepo.getAll();
  }
}
