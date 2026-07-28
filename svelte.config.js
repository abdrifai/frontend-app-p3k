import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		csrf: {
			trustedOrigins: ['http://33.33.33.5', 'http://36.92.162.234:8585', 'http://localhost:5173', 'http://localhost:3001']
		}
	}
};

export default config;
