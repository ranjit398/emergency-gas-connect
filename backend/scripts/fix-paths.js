/**
 * Path alias resolution script
 * Run after tsc compilation to convert @models/, @services/ etc. to relative paths
 * This eliminates the runtime dependency on tsconfig-paths
 */

const { execSync } = require('child_process');

try {
  console.log('Resolving path aliases in compiled output...');
  execSync('npx tsc-alias', { stdio: 'inherit' });
  console.log('✅ Path aliases resolved successfully');
} catch (error) {
  console.error('❌ Failed to resolve path aliases');
  process.exit(1);
}
