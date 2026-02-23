import { ref } from 'vue';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
}

// Module-level singleton state
const isVisible = ref(false);
const options = ref<ConfirmDialogOptions>({ title: '', message: '' });
let resolvePromise: ((value: boolean) => void) | null = null;

export function useConfirmDialog() {
  function ask(opts: ConfirmDialogOptions): Promise<boolean> {
    options.value = opts;
    isVisible.value = true;
    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
  }

  function confirm() {
    isVisible.value = false;
    const resolve = resolvePromise;
    resolvePromise = null;
    resolve?.(true);
  }

  function cancel() {
    isVisible.value = false;
    const resolve = resolvePromise;
    resolvePromise = null;
    resolve?.(false);
  }

  return { isVisible, options, ask, confirm, cancel };
}
