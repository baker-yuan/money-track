import { create } from 'zustand';
import type { UUID, Category, CreateCategoryInput } from '@/types';
import { categoryRepository } from '@/database/repositories';
import { DEFAULT_CATEGORIES } from '@/constants';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;

  loadCategories: (projectId: UUID | null) => Promise<void>;
  createCategory: (input: CreateCategoryInput) => Promise<Category>;
  deleteCategory: (id: UUID, projectId: UUID | null) => Promise<void>;
  ensureDefaults: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,

  loadCategories: async (projectId: UUID | null) => {
    set({ isLoading: true });
    const categories = await categoryRepository.findByProject(projectId);
    set({ categories, isLoading: false });
  },

  createCategory: async (input: CreateCategoryInput) => {
    const category = await categoryRepository.create(input);
    await get().loadCategories(input.project_id ?? null);
    return category;
  },

  deleteCategory: async (id: UUID, projectId: UUID | null) => {
    await categoryRepository.softDelete(id);
    await get().loadCategories(projectId);
  },

  ensureDefaults: async () => {
    await categoryRepository.ensureDefaults(DEFAULT_CATEGORIES);
  },
}));
