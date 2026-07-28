import { addToast } from './toastStore.js';

import { authStore, clearAuth } from './store.js';
import { get } from 'svelte/store';
import { env } from '$env/dynamic/public';

/**
 * Simple wrapper for fetch calls to backend
 * @param {string} endpoint The API endpoint
 * @param {string} method The HTTP method
 * @param {object|null} body The request body
 * @returns {Promise<any>}
 */
// export const API_BASE_URL = env.PUBLIC_API_URL || 'http://localhost:3000';

export const API_BASE_URL = env.PUBLIC_API_URL || "";

export const apiRequest = async (endpoint, method = 'GET', body = null, isFormData = false) => {
    const auth = get(authStore);
    const headers = {};

    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
    }

    // Handle relative URLs for backend
    const url = endpoint.startsWith('/api') && !endpoint.startsWith('http')
        ? `${API_BASE_URL}${endpoint}`
        : endpoint;

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                clearAuth();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
            }
            const errMessage = data.message || 'Something went wrong';
            addToast(errMessage, 'error');
            throw new Error(errMessage);
        }

        return data;
    } catch (error) {
        if (!error.message || error.message === 'Network error' || error.message.includes('fetch')) {
            addToast('Network error, please try again.', 'error');
        }
        throw new Error(error.message || 'Network error');
    }
};
