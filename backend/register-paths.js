/**
 * Runtime path registration for compiled code
 * Intercepts require() calls to resolve path aliases to dist folder
 * Must run before server.js is loaded (using -r flag in node command)
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

// Store the original _resolveFilename before anything else patches it
const originalResolveFilename = Module.prototype._resolveFilename;

// Override _resolveFilename to handle path aliases
Module.prototype._resolveFilename = function(request, parent, isMain) {
  let resolvedPath = request;

  // Check if this is a path alias that needs resolution
  for (const [alias, mappedPath] of Object.entries(pathMappings)) {
    if (request === alias) {
      // Simple alias: @types -> types/index
      const distFile = path.join(distPath, mappedPath + '.js');
      if (fs.existsSync(distFile)) {
        resolvedPath = distFile;
        break;
      }
    } else if (request.startsWith(alias + '/')) {
      // Alias with subpath: @config/database -> config/database
      const subpath = request.slice(alias.length + 1);
      const distFile = path.join(distPath, mappedPath, subpath + '.js');
      if (fs.existsSync(distFile)) {
        resolvedPath = distFile;
        break;
      }
    }
  }

  // Use original resolver for the (potentially modified) path
  return originalResolveFilename.call(this, resolvedPath, parent, isMain);
};

