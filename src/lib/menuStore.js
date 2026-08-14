import { writable, derived, get } from 'svelte/store';
import { apiRequest } from './api.js';
import { authStore } from './store.js';

// Initial state
const initialState = {
  role: '',
  allowedKeys: [],
  allowedPaths: [],
  isLoading: false,
  isLoaded: false
};

export const menuPermissionsStore = writable(initialState);

/**
 * Load allowed menus for current authenticated user
 */
export async function loadMenuPermissions() {
  const auth = get(authStore);
  if (!auth.isAuthenticated) {
    menuPermissionsStore.set(initialState);
    return;
  }

  // Admin has full access by default
  const isAdmin = ['admin', 'ADMIN', 'Admin'].includes(auth.user?.role);

  menuPermissionsStore.update(s => ({ ...s, isLoading: true }));

  try {
    const result = await apiRequest('/api/role-menus/my-menus', 'GET');
    if (result && result.success && result.data) {
      menuPermissionsStore.set({
        role: result.data.role || auth.user?.role || '',
        allowedKeys: result.data.allowedKeys || [],
        allowedPaths: result.data.allowedPaths || [],
        isLoading: false,
        isLoaded: true
      });
    } else {
      // Fallback if API response unexpected
      menuPermissionsStore.update(s => ({ ...s, isLoading: false, isLoaded: true }));
    }
  } catch (err) {
    console.error('Failed to load menu permissions:', err);
    // If error and user is admin, allow all as fallback
    if (isAdmin) {
      menuPermissionsStore.set({
        role: 'admin',
        allowedKeys: ['*'],
        allowedPaths: ['*'],
        isLoading: false,
        isLoaded: true
      });
    } else {
      menuPermissionsStore.update(s => ({ ...s, isLoading: false, isLoaded: true }));
    }
  }
}

/**
 * Helper to check menu access synchronously
 * @param {string} menuKey 
 * @returns {boolean}
 */
export function checkMenuAccess(menuKey) {
  const auth = get(authStore);
  if (!auth.isAuthenticated) return false;
  if (['admin', 'ADMIN', 'Admin'].includes(auth.user?.role)) return true;

  const permissions = get(menuPermissionsStore);
  if (!permissions.isLoaded) {
    // If not loaded yet, fallback to allowing if role is admin
    return ['admin', 'ADMIN', 'Admin'].includes(auth.user?.role);
  }

  if (permissions.allowedKeys.includes('*')) return true;
  return permissions.allowedKeys.includes(menuKey);
}

/**
 * Helper to check if any child menu under a parent menu has access
 * @param {string[]} childKeys 
 * @returns {boolean}
 */
export function checkAnyMenuAccess(childKeys) {
  const auth = get(authStore);
  if (!auth.isAuthenticated) return false;
  if (['admin', 'ADMIN', 'Admin'].includes(auth.user?.role)) return true;

  const permissions = get(menuPermissionsStore);
  if (!permissions.isLoaded) return true;

  if (permissions.allowedKeys.includes('*')) return true;
  return childKeys.some(k => permissions.allowedKeys.includes(k));
}

/**
 * Reset permissions
 */
export function clearMenuPermissions() {
  menuPermissionsStore.set(initialState);
}
