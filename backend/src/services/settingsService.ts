import { SettingsRepository } from '../repositories/settingsRepository';

export class SettingsService {
  constructor(private settingsRepo: SettingsRepository) {}

  getAll() {
    return this.settingsRepo.getAll();
  }

  get(key: string) {
    return this.settingsRepo.getByKey(key) ?? null;
  }

  update(settings: Record<string, string>) {
    this.settingsRepo.upsertMany(settings);
    return this.settingsRepo.getAll();
  }
}
