import { create } from 'zustand';
import type { UUID, Expense, CreateExpenseInput, UpdateExpenseInput, ExpenseWithCategory } from '@/types';
import { expenseRepository } from '@/database/repositories';

interface ExpenseFilters {
  categoryId?: UUID;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  searchText?: string;
}

interface ExpenseState {
  expenses: ExpenseWithCategory[];
  currentExpense: Expense | null;
  filters: ExpenseFilters;
  isLoading: boolean;
  error: string | null;

  loadExpenses: (projectId: UUID) => Promise<void>;
  loadExpense: (id: UUID) => Promise<void>;
  createExpense: (input: CreateExpenseInput) => Promise<Expense>;
  updateExpense: (id: UUID, input: UpdateExpenseInput) => Promise<void>;
  deleteExpense: (id: UUID, projectId: UUID) => Promise<void>;
  setFilters: (filters: ExpenseFilters, projectId: UUID) => Promise<void>;
  clearFilters: (projectId: UUID) => Promise<void>;
  clearError: () => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  currentExpense: null,
  filters: {},
  isLoading: false,
  error: null,

  loadExpenses: async (projectId: UUID) => {
    set({ isLoading: true, error: null });
    try {
      const filters = get().filters;
      const hasFilters = Object.keys(filters).length > 0;
      const expenses = hasFilters
        ? await expenseRepository.findByProjectWithFilters(projectId, filters)
        : await expenseRepository.findByProject(projectId);
      set({ expenses, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadExpense: async (id: UUID) => {
    set({ isLoading: true, error: null });
    try {
      const expense = await expenseRepository.findById(id);
      set({ currentExpense: expense, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createExpense: async (input: CreateExpenseInput) => {
    const expense = await expenseRepository.create(input);
    await get().loadExpenses(input.project_id);
    return expense;
  },

  updateExpense: async (id: UUID, input: UpdateExpenseInput) => {
    const updated = await expenseRepository.update(id, input);
    if (updated) {
      await get().loadExpenses(updated.project_id);
      set({ currentExpense: updated });
    }
  },

  deleteExpense: async (id: UUID, projectId: UUID) => {
    await expenseRepository.softDelete(id);
    set({ currentExpense: null });
    await get().loadExpenses(projectId);
  },

  setFilters: async (filters: ExpenseFilters, projectId: UUID) => {
    set({ filters });
    await get().loadExpenses(projectId);
  },

  clearFilters: async (projectId: UUID) => {
    set({ filters: {} });
    await get().loadExpenses(projectId);
  },

  clearError: () => set({ error: null }),
}));
