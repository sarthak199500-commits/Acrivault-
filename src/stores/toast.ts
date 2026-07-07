import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'warning' | 'critical';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'> & { id?: string }) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: toast.id ?? `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper usable outside React. */
export function toast(title: string, opts?: { description?: string; tone?: ToastTone }): void {
  useToastStore.getState().push({ title, description: opts?.description, tone: opts?.tone ?? 'default' });
}
