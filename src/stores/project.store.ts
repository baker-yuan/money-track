import { create } from 'zustand';
import type { UUID, Project, ProjectWithStats, CreateProjectInput, UpdateProjectInput } from '@/types';
import { projectRepository } from '@/database/repositories';

interface ProjectState {
  projects: ProjectWithStats[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  loadProject: (id: UUID) => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: UUID, input: UpdateProjectInput) => Promise<void>;
  deleteProject: (id: UUID) => Promise<void>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectRepository.findAllWithStats();
      set({ projects, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  loadProject: async (id: UUID) => {
    set({ isLoading: true, error: null });
    try {
      const project = await projectRepository.findById(id);
      set({ currentProject: project, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createProject: async (input: CreateProjectInput) => {
    const project = await projectRepository.create(input);
    await get().loadProjects();
    return project;
  },

  updateProject: async (id: UUID, input: UpdateProjectInput) => {
    await projectRepository.update(id, input);
    await get().loadProjects();
    const current = get().currentProject;
    if (current?.id === id) {
      await get().loadProject(id);
    }
  },

  deleteProject: async (id: UUID) => {
    await projectRepository.softDelete(id);
    set({ currentProject: null });
    await get().loadProjects();
  },

  clearError: () => set({ error: null }),
}));
