const levels = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

function shouldLog(level) {
  return levels[level] <= levels[currentLevel];
}

function fmt(level, msg, ...args) {
  const ts = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  return [`${ts} [${tag}] ${msg}`, ...args];
}

export const logger = {
  error(msg, ...args) { if (shouldLog('error')) console.error(...fmt('error', msg, ...args)); },
  warn(msg, ...args)  { if (shouldLog('warn'))  console.warn(...fmt('warn', msg, ...args)); },
  info(msg, ...args)  { if (shouldLog('info'))  console.log(...fmt('info', msg, ...args)); },
  debug(msg, ...args) { if (shouldLog('debug')) console.log(...fmt('debug', msg, ...args)); },
};

export default logger;
