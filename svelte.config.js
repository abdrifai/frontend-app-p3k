import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		csrf: {
			trustedOrigins: [
				'https://sipppk.tojounauna.go.id',
				'http://sipppk.tojounauna.go.id',
				'http://33.33.33.5',
				'http://36.92.162.234',
				'http://localhost:5173',
				'http://localhost:3001'
			]
		}
	}
};

export default config;
