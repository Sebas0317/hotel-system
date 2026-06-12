export const useLog = () => {
  const normalize = (value) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    if (value instanceof Error) return value.message || 'Error';
    try {
      const serialized = JSON.stringify(value);
      return serialized && serialized !== '{}' ? serialized : String(value);
    } catch {
      return '[Unserializable]';
    }
  };

  return {
    debug: (message, data) => console.debug(normalize(message), data),
    info: (message, data) => console.info(normalize(message), data),
    warn: (message, data) => console.warn(normalize(message), data),
    error: (message, data) => console.error(normalize(message), data),
    action: (action, data) => console.info(`[action] ${normalize(action)}`, data),
  };
};
