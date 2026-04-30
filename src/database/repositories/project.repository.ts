import type { UUID, Project, CreateProjectInput, UpdateProjectInput, ProjectWithStats, EntityType, ISODateString } from '@/types';
import { generateUUID, nowISO, toCurrencyCode, toISO } from '@/utils';
import { DEFAULT_CURRENCY, PROJECT_COLORS } from '@/constants';
import { BaseRepository } from './base.repository';

export class ProjectRepository extends BaseRepository<Project> {
  protected tableName = 'projects';
  protected entityType: EntityType = 'project';

  async findAll(): Promise<Project[]> {
    const db = await this.getDb();
    return db.getAllAsync<Project>(
      'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
  }

  async findAllWithStats(): Promise<ProjectWithStats[]> {
    const db = await this.getDb();
    return db.getAllAsync<ProjectWithStats>(`
      SELECT
        p.*,
        COALESCE(SUM(CASE WHEN e.deleted_at IS NULL THEN e.base_amount ELSE 0 END), 0) as total_expenses,
        COUNT(CASE WHEN e.deleted_at IS NULL THEN 1 END) as expense_count,
        MAX(CASE WHEN e.deleted_at IS NULL THEN e.date END) as last_expense_date
      FROM projects p
      LEFT JOIN expenses e ON e.project_id = p.id
      WHERE p.deleted_at IS NULL
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const db = await this.getDb();
    const id = generateUUID();
    const now = nowISO();
    const project: Project = {
      id,
      name: input.name,
      description: input.description ?? '',
      base_currency: input.base_currency ?? DEFAULT_CURRENCY,
      budget: input.budget ?? null,
      start_date: input.start_date ? (input.start_date as Project['start_date']) : null,
      end_date: input.end_date ? (input.end_date as Project['end_date']) : null,
      cover_color: input.cover_color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]!,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
    };

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO projects (id, name, description, base_currency, budget, start_date, end_date, cover_color, created_at, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        project.id, project.name, project.description, project.base_currency,
        project.budget, project.start_date, project.end_date, project.cover_color,
        project.created_at, project.updated_at, project.version
      );
      await this.logChange(db, id, 'INSERT', 1, project as unknown as Record<string, unknown>);
    });

    return project;
  }

  async update(id: UUID, input: UpdateProjectInput): Promise<Project | null> {
    const db = await this.getDb();
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = nowISO();
    const newVersion = existing.version + 1;
    const updated: Project = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      base_currency: input.base_currency ?? existing.base_currency,
      budget: input.budget !== undefined ? input.budget : existing.budget,
      start_date: input.start_date !== undefined ? (input.start_date as ISODateString | null) : existing.start_date,
      end_date: input.end_date !== undefined ? (input.end_date as ISODateString | null) : existing.end_date,
      cover_color: input.cover_color ?? existing.cover_color,
      updated_at: now,
      version: newVersion,
    };

    const changedFields: Record<string, unknown> = {};
    for (const key of Object.keys(input) as (keyof UpdateProjectInput)[]) {
      if (input[key] !== undefined) {
        changedFields[key] = input[key];
      }
    }

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE projects SET name = ?, description = ?, base_currency = ?, budget = ?,
         start_date = ?, end_date = ?, cover_color = ?, updated_at = ?, version = ?
         WHERE id = ?`,
        updated.name, updated.description, updated.base_currency, updated.budget,
        updated.start_date, updated.end_date, updated.cover_color, updated.updated_at,
        updated.version, id
      );
      await this.logChange(db, id, 'UPDATE', newVersion, changedFields);
    });

    return updated;
  }
}

export const projectRepository = new ProjectRepository();
