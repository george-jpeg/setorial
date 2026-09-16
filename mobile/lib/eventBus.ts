type Listener = (...args: any[]) => void;
const listeners: Map<string, Set<Listener>> = new Map();

export const on = (event: string, fn: Listener) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(fn);
  return () => off(event, fn);
};

export const off = (event: string, fn?: Listener) => {
  if (!listeners.has(event)) return;
  if (!fn) {
    listeners.delete(event);
    return;
  }
  listeners.get(event)!.delete(fn);
};

export const emit = (event: string, ...args: any[]) => {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of Array.from(set)) {
    try { fn(...args); } catch (e) { console.error('eventBus handler error', e); }
  }
};

export default { on, off, emit };