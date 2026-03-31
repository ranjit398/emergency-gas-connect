/**
 * Runtime path registration for compiled code
 * Intercepts require() calls to resolve path aliases to dist folder
 * This must run before any @-prefixed modules are required
 */

const Module = require('module');
const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, 'dist');

const pathMappings = {
  '@config': 'config',
  '@controllers': 'controllers',
  '@middleware': 'middleware',
  '@models': 'models',
  '@routes': 'routes',
  '@services': 'services',
  '@socket': 'socket',
  '@types': 'types/index',
  '@utils': 'utils',
};

// Override Module._load to intercept require calls
const originalLoad = Module.prototype._load;
Module.prototype._load = function(request, parent) {
  let modulePath = request;

  // Check if this is a path alias
  for (const [alias, mappedPath] of Object.entries(pathMappings)) {
    if (request === alias || request.startsWith(alias + '/')) {
      if (request === alias) {
        // Direct alias: @types -> types/index
        modulePath = path.join(distPath, mappedPath + '.js');
      } else {
        // Alias with subpath: @config/database -> config/database
        const subpath = request.slice(alias.length + 1);
        modulePath = path.join(distPath, mappedPath, subpath + '.js');
      }

      // Try to load the resolved path
      try {
        if (fs.existsSync(modulePath)) {
          return originalLoad.call(this, modulePath, parent);
        }
      } catch (e) {
        // If loading fails, fall through to default handling
      }
      break;
    }
  }

  // Fall back to original resolution for non-aliased modules
  return originalLoad.call(this, request, parent);
};

