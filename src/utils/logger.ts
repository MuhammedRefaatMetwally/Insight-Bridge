const colors = {
  info: '\x1b[32m',    // Green
  error: '\x1b[31m',   // Red
  warn: '\x1b[33m',    // Yellow
  debug: '\x1b[36m',   // Cyan
  reset: '\x1b[0m'
};

export const logger = {
  info(message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors.info}[${timestamp}] ℹ️  ${message}${colors.reset}`, data || '');
  },

  error(message: string, error?: any) {
    const timestamp = new Date().toLocaleTimeString();
    console.error(`${colors.error}[${timestamp}] ❌ ${message}${colors.reset}`, error || '');
  },

  warn(message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    console.warn(`${colors.warn}[${timestamp}] ⚠️  ${message}${colors.reset}`, data || '');
  },

  debug(message: string, data?: any) {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`${colors.debug}[${timestamp}] 🔍 ${message}${colors.reset}`, data || '');
    }
  },

  // Show progress for batch operations
  progress(message: string, current: number, total: number) {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    console.log(`📊 ${message} [${bar}] ${percent}% (${current}/${total})`);
  }
}; 