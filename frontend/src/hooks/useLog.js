import { useLogger } from '@stevenmckinnon/log-dumper';

export const useLog = () => {
  const { logDebug, logInfo, logWarn, logError, logAction } = useLogger();
  
  return {
    debug: (message, data) => logDebug(message, data),
    info: (message, data) => logInfo(message, data),
    warn: (message, data) => logWarn(message, data),
    error: (message, data) => logError(message, data),
    action: (action, data) => logAction(action, data),
  };
};