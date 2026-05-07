/**
 * 日志工具
 */
const logger = {
  info(page, message, ...args) {
    console.log(`[${page}] ${message}`, ...args);
  },
  warn(page, message, ...args) {
    console.warn(`[${page}] ${message}`, ...args);
  },
  error(page, message, ...args) {
    console.error(`[${page}] ${message}`, ...args);
  },
  debug(page, message, ...args) {
    console.debug(`[${page}] ${message}`, ...args);
  }
};

module.exports = logger;
