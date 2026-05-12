import { create } from 'zustand';
import type { UUID, Category, CreateCategoryInput } from '@/types';
import { categoryRepository } from '@/database/repositories';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;

  loadCategories: (projectId: UUID) => Promise<void>;
  createCategory: (input: CreateCategoryInput) => Promise<Category>;
  updateCategory: (id: UUID, input: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sort_order'>>, projectId: UUID) => Promise<void>;
  deleteCategory: (id: UUID, projectId: UUID) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,

  loadCategories: async (projectId: UUID) => {
    set({ isLoading: true });
    let categories = await categoryRepository.findByProject(projectId);
    // If project has no categories, create defaults automatically
    if (categories.length === 0) {
      await categoryRepository.createDefaultsForProject(projectId);
      categories = await categoryRepository.findByProject(projectId);
    }
    set({ categories, isLoading: false });
  },

  createCategory: async (input: CreateCategoryInput) => {
    const category = await categoryRepository.create(input);
    if (input.project_id) {
      await get().loadCategories(input.project_id);
    }
    return category;
  },

  updateCategory: async (id: UUID, input: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sort_order'>>, projectId: UUID) => {
    await categoryRepository.update(id, input);
    await get().loadCategories(projectId);
  },

  deleteCategory: async (id: UUID, projectId: UUID) => {
    await categoryRepository.softDelete(id);
    await get().loadCategories(projectId);
  },
}));
