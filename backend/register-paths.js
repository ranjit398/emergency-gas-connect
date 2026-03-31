/**
 * Runtime path registration for compiled code
 * Manipulates Module.prototype to resolve path aliases to the dist folder
 */

const Module = require('module');
const path = require('path');

const originalResolveFilename = Module.prototype._resolveFilename;
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

Module.prototype._resolveFilename = function(request, parent, isMain) {
  // Check if request starts with @ (path alias)
  for (const [alias, mappedPath] of Object.entries(pathMappings)) {
    if (request === alias) {
      // Simple alias like @types
      return originalResolveFilename.call(
        this,
        path.join(distPath, mappedPath + '.js'),
        parent,
        isMain
      );
    } else if (request.startsWith(alias + '/')) {
      // Alias with subpath like @config/database
      const subpath = request.slice(alias.length + 1);
      return originalResolveFilename.call(
        this,
        path.join(distPath, mappedPath, subpath + '.js'),
        parent,
        isMain
      );
    }
  }
  
  // Fall back to original resolution
  return originalResolveFilename.call(this, request, parent, isMain);
};

