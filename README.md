# Frontend App-P3K

Frontend for App-P3K application, built with SvelteKit and Tailwind CSS.

## 🚀 Tech Stack

- **Framework:** [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Bundler:** [Vite](https://vitejs.dev/)
- **State Management:** Svelte Stores (`writable`, `readable`)
- **Excel Processing:** `xlsx`
- **HTTP Client:** Native `fetch` with modular wrapper (`src/lib/api.js`)

## 📁 Project Structure

The project follows a standard SvelteKit structure:

```text
/frontend
├── src
│   ├── lib              # Reusable modules and components
│   │   ├── api.js       # API communication wrapper
│   │   ├── components   # UI Components
│   │   ├── store.js     # Global state management
│   │   └── toastStore.js # UI Notification system
│   ├── routes           # Application pages and routing
│   ├── app.css          # Global Tailwind styles
│   ├── app.html         # Base HTML template
│   └── app.d.ts         # TypeScript definitions
├── static               # Static assets (images, fonts, etc.)
├── svelte.config.js     # Svelte configuration
├── tailwind.config.js   # Tailwind configuration
└── vite.config.js       # Vite configuration
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- Backend services running (see `backend` README)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create or update `.env` file with necessary variables:
   ```bash
   PUBLIC_API_URL=http://localhost:3000
   ```

### Running the Application

- **Development Mode:**
  ```bash
  npm run dev
  ```
- **Build for Production:**
  ```bash
  npm run build
  ```
- **Preview Production Build:**
  ```bash
  npm run preview
  ```

## 🎨 Design & Styling Standards

- **Tailwind CSS:** Use Tailwind utility classes for all styling.
- **Components:** Logic and styling are encapsulated in `.svelte` files.
- **Responsiveness:** Designs should be mobile-first and fully responsive using Tailwind modifiers.
- **Consistency:** Use the predefined design system in `tailwind.config.js`.

## ⚙️ Coding Standards

- **Svelte 5 Runes:** Use Svelte 5 runes (`$state`, `$derived`, `$effect`, etc.) for modern reactivity.
- **Component Size:** If a component exceeds 300 lines, it should be broken down into smaller sub-components in `src/lib/components`.
- **Global State:** Use Svelte stores only for truly global state (e.g., authentication, notifications). Prefixed with `$` for reactive access.
- **API Communication:** All external requests must go through the centralized `src/lib/api.js` module.

## 📄 License

ISC License
