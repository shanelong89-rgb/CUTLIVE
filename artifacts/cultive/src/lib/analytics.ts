declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, params?: Record<string, unknown>) {
  try {
    window.gtag?.('event', event, params ?? {});
  } catch {
    // silently ignore — never let analytics crash the app
  }
}
