// Falls back to a relative "/api" path, which works in dev via the Vite
// proxy (see vite.config.ts) and in prod if the backend is served behind
// the same domain/reverse proxy as the frontend. Override by setting
// VITE_API_BASE_URL, e.g. in a .env file, to point at a standalone backend.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';
