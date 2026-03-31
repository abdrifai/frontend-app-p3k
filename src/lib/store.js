import { writable } from 'svelte/store';

// Check if we are in the browser
const isBrowser = typeof window !== 'undefined';

const parseJwt = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

// Read initial state from localStorage if available
const storedAuth = isBrowser ? localStorage.getItem('p3k_auth') : null;
let initialAuth = { isAuthenticated: false, user: null, token: null };

if (storedAuth) {
    try {
        const parsedAuth = JSON.parse(storedAuth);
        if (parsedAuth.token) {
            const decoded = parseJwt(parsedAuth.token);
            // Check if token is expired (exp is in seconds)
            if (decoded && decoded.exp * 1000 > Date.now()) {
                initialAuth = parsedAuth;
            } else {
                // Token expired, clear it
                if (isBrowser) localStorage.removeItem('p3k_auth');
            }
        }
    } catch (e) {
        if (isBrowser) localStorage.removeItem('p3k_auth');
    }
}

export const authStore = writable(initialAuth);

export const setAuth = ({ user, token }) => {
    const authData = { isAuthenticated: true, user, token };
    authStore.set(authData);
    if (isBrowser) {
        localStorage.setItem('p3k_auth', JSON.stringify(authData));
    }
};

export const clearAuth = () => {
    authStore.set({ isAuthenticated: false, user: null, token: null });
    if (isBrowser) {
        localStorage.removeItem('p3k_auth');
    }
};

export const updateAuthUser = (user) => {
    authStore.update(state => {
        const newState = { ...state, user: { ...state.user, ...user } };
        if (isBrowser) {
            localStorage.setItem('p3k_auth', JSON.stringify(newState));
        }
        return newState;
    });
};
