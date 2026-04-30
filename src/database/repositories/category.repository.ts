import type { UUID, Category, CreateCategoryInput, EntityType } from '@/types';
import { generateUUID, nowISO } from '@/utils';
import { BaseRepository } from './base.repository';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories';
  protected entityType: EntityType = 'category';

  async findByProject(projectId: UUID | null): Promise<Category[]> {
    const db = await this.getDb();
    if (projectId === null) {
      return db.getAllAsync<Category>(
        'SELECT * FROM categories WHERE project_id IS NULL AND deleted_at IS NULL ORDER BY sort_order'
      );
    }
    return db.getAllAsync<Category>(
      `SELECT * FROM categories
       WHERE (project_id = ? OR project_id IS NULL) AND deleted_at IS NULL
       ORDER BY sort_order`,
      projectId
    );
  }

  async findGlobalDefaults(): Promise<Category[]> {
    const db = await this.getDb();
    return db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE project_id IS NULL AND deleted_at IS NULL ORDER BY sort_order'
    );
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const db = await this.getDb();
    const id = generateUUID();
    const now = nowISO();
    const category: Category = {
      id,
      project_id: input.project_id ?? null,
      name: input.name,
      icon: input.icon,
      color: input.color,
      sort_order: input.sort_order ?? 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
    };

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO categories (id, project_id, name, icon, color, sort_order, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        category.id, category.project_id, category.name, category.icon,
        category.color, category.sort_order, category.created_at, category.updated_at, category.version
      );
      await this.logChange(db, id, 'INSERT', 1, category as unknown as Record<string, unknown>);
    });

    return category;
  }

  async ensureDefaults(defaults: { name: string; icon: string; color: string }[]): Promise<void> {
    const db = await this.getDb();
    const existing = await this.findGlobalDefaults();
    if (existing.length > 0) return;

    for (let i = 0; i < defaults.length; i++) {
      const def = defaults[i]!;
      await this.create({
        name: def.name,
        icon: def.icon,
        color: def.color,
        sort_order: i,
      });
    }
  }

  async update(id: UUID, input: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sort_order'>>): Promise<Category | null> {
    const db = await this.getDb();
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = nowISO();
    const newVersion = existing.version + 1;
    const updated: Category = {
      ...existing,
      ...input,
      updated_at: now,
      version: newVersion,
    };

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE categories SET name = ?, icon = ?, color = ?, sort_order = ?, updated_at = ?, version = ?
         WHERE id = ?`,
        updated.name, updated.icon, updated.color, updated.sort_order,
        updated.updated_at, updated.version, id
      );
      await this.logChange(db, id, 'UPDATE', newVersion, input as Record<string, unknown>);
    });

    return updated;
  }
}

export const categoryRepository = new CategoryRepository();
