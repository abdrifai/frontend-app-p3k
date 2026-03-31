import { writable } from 'svelte/store';

// Array of active toasts: { id, message, type: 'success' | 'error' | 'info' }
export const toastStore = writable([]);

let toastIdCounter = 0;

export const addToast = (message, type = 'info') => {
    const id = ++toastIdCounter;
    toastStore.update(toasts => [...toasts, { id, message, type }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        removeToast(id);
    }, 5000);
};

export const removeToast = (id) => {
    toastStore.update(toasts => toasts.filter(t => t.id !== id));
};
