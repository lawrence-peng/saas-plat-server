
/**
 * hook config
 * https://thinkjs.org/doc/middleware.html#toc-df6
 */
export default {
  route_parse: [ 'rewrite_pathname', 'parse_route', 'module_route_parse'],
  view_template: ['module_locate_template'],
};
