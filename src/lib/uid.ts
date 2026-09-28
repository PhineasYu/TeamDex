// crypto.randomUUID only exists on secure origins; phones on http://192.168.x.x during dev don't have it.
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function shortToken(): string {
  return Math.random().toString(36).slice(2, 8);
}
