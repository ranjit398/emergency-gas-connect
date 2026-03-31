/**
 * Runtime path registration for compiled code
 * Maps path aliases to the dist folder where compiled JavaScript lives
 */

const { register } = require('tsconfig-paths');
const path = require('path');

register({
  baseUrl: path.join(__dirname, 'dist'),
  paths: {
    '@config/*': ['config/*'],
    '@controllers/*': ['controllers/*'],
    '@middleware/*': ['middleware/*'],
    '@models/*': ['models/*'],
    '@routes/*': ['routes/*'],
    '@services/*': ['services/*'],
    '@socket/*': ['socket/*'],
    '@types': ['types/index'],
    '@utils/*': ['utils/*'],
  },
});
