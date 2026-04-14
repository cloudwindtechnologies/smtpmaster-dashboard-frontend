declare global {
  interface Window {
    dataLayer: Record<string, any>[];
  }
}

export function pushToDataLayer(data: Record<string, any>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
}