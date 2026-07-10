import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Must run before @testing-library/react is imported so `screen` binds to a real document.
if (typeof document === 'undefined') {
  GlobalRegistrator.register();
}
