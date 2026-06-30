import { sqlite } from '../database/connection';

export interface RuleRow {
  id: number;
  priority: number;
  contains_text: string | null;
  starts_with: string | null;
  ends_with: string | null;
  regex: string | null;
  category_id: number | null;
  enabled: number;
  created_at: string;
}

export class RuleRepository {
  findAllEnabled(): RuleRow[] {
    return sqlite.prepare('SELECT * FROM rules WHERE enabled = 1 ORDER BY priority DESC').all() as RuleRow[];
  }

  findAll(): RuleRow[] {
    return sqlite.prepare('SELECT * FROM rules ORDER BY priority DESC').all() as RuleRow[];
  }

  findById(id: number): RuleRow | undefined {
    return sqlite.prepare('SELECT * FROM rules WHERE id = ?').get(id) as RuleRow | undefined;
  }

  create(input: {
    priority?: number;
    containsText?: string;
    startsWith?: string;
    endsWith?: string;
    regex?: string;
    categoryId: number;
    enabled?: boolean;
  }): RuleRow {
    const now = new Date().toISOString();
    const enabled = input.enabled ?? true ? 1 : 0;
    const result = sqlite
      .prepare(
        `INSERT INTO rules (priority, contains_text, starts_with, ends_with, regex, category_id, enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.priority ?? 0,
        input.containsText ?? null,
        input.startsWith ?? null,
        input.endsWith ?? null,
        input.regex ?? null,
        input.categoryId,
        enabled,
        now,
      );
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(
    id: number,
    input: Partial<{
      priority: number;
      containsText: string | null;
      startsWith: string | null;
      endsWith: string | null;
      regex: string | null;
      categoryId: number;
      enabled: boolean;
    }>,
  ): RuleRow | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const bindings: (string | number | null)[] = [];

    if (input.priority !== undefined) {
      updates.push('priority = ?');
      bindings.push(input.priority);
    }
    if (input.containsText !== undefined) {
      updates.push('contains_text = ?');
      bindings.push(input.containsText);
    }
    if (input.startsWith !== undefined) {
      updates.push('starts_with = ?');
      bindings.push(input.startsWith);
    }
    if (input.endsWith !== undefined) {
      updates.push('ends_with = ?');
      bindings.push(input.endsWith);
    }
    if (input.regex !== undefined) {
      updates.push('regex = ?');
      bindings.push(input.regex);
    }
    if (input.categoryId !== undefined) {
      updates.push('category_id = ?');
      bindings.push(input.categoryId);
    }
    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      bindings.push(input.enabled ? 1 : 0);
    }

    if (updates.length === 0) return existing;

    bindings.push(id);
    sqlite.prepare(`UPDATE rules SET ${updates.join(', ')} WHERE id = ?`).run(...bindings);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = sqlite.prepare('DELETE FROM rules WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
