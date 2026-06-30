import { sqlite } from '../database/connection';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validators/category';
import type { PaginationParams, SortParams } from '../utils/pagination';

export interface CategoryRow {
  id: number;
  name: string;
  type: 'income' | 'expense';
  parent_id: number | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

const ALLOWED_SORT_FIELDS = ['id', 'name', 'type', 'created_at'];

export class CategoryRepository {
  findAll(params?: { type?: string | undefined } & PaginationParams & SortParams): { data: CategoryRow[]; total: number } {
    const conditions: string[] = [];
    const bindings: (string | number)[] = [];

    if (params?.type) {
      conditions.push('type = ?');
      bindings.push(params.type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = sqlite.prepare(`SELECT COUNT(*) as count FROM categories ${where}`).get(...bindings) as { count: number };
    const total = countRow.count;

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const offset = (page - 1) * limit;
    const sortBy = params?.sortBy && ALLOWED_SORT_FIELDS.includes(params.sortBy) ? params.sortBy : 'created_at';
    const sortOrder = params?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const data = sqlite
      .prepare(`SELECT * FROM categories ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`)
      .all(...bindings, limit, offset) as CategoryRow[];

    return { data, total };
  }

  findAllSimple(): CategoryRow[] {
    return sqlite.prepare('SELECT * FROM categories ORDER BY type, name').all() as CategoryRow[];
  }

  findById(id: number): CategoryRow | undefined {
    return sqlite.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow | undefined;
  }

  create(input: CreateCategoryInput): CategoryRow {
    const now = new Date().toISOString();
    const result = sqlite
      .prepare(
        `INSERT INTO categories (name, type, parent_id, color, icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(input.name, input.type ?? 'expense', input.parentId ?? null, input.color ?? null, input.icon ?? null, now, now);
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdateCategoryInput): CategoryRow | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const bindings: (string | number | null)[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      bindings.push(input.name);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      bindings.push(input.type);
    }
    if (input.parentId !== undefined) {
      updates.push('parent_id = ?');
      bindings.push(input.parentId);
    }
    if (input.color !== undefined) {
      updates.push('color = ?');
      bindings.push(input.color);
    }
    if (input.icon !== undefined) {
      updates.push('icon = ?');
      bindings.push(input.icon);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    bindings.push(now);
    bindings.push(id);

    sqlite.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...bindings);
    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = sqlite.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
