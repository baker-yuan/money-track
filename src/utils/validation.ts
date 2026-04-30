/**
 * Zod schemas for runtime validation of all inputs.
 * Used at system boundaries (user input, import, sync).
 */

import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空').max(100),
  description: z.string().max(500).optional().default(''),
  base_currency: z.string().length(3, '货币代码必须是3位'),
  budget: z.number().positive('预算必须大于0').nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  cover_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const createExpenseSchema = z.object({
  project_id: z.string().uuid(),
  category_id: z.string().uuid(),
  amount: z.number().positive('金额必须大于0'),
  currency: z.string().length(3),
  exchange_rate: z.number().positive().optional().default(1),
  title: z.string().min(1, '标题不能为空').max(200),
  notes: z.string().max(1000).optional().default(''),
  date: z.string().min(1, '日期不能为空'),
  paid_by: z.string().max(100).optional().default(''),
  split_method: z.enum(['equal', 'custom', 'full']).optional().default('full'),
  location: z.string().max(200).optional().default(''),
});

export const createCategorySchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1, '分类名称不能为空').max(50),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  sort_order: z.number().int().nonnegative().optional().default(0),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
