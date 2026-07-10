import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Must run before @testing-library/react is imported so `screen` binds to a real document.
if (typeof document === 'undefined') {
  GlobalRegistrator.register();
}

// Bun maps import.meta.env to process.env; give tests a valid dummy Supabase config
// so URL construction works (fetch is stubbed in tests — nothing hits the network).
process.env.VITE_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY ??= 'test-anon-key';
