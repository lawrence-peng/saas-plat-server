/**
 * config
 */
export default {
  host : global._mvcOptions.host || "127.0.0.1",
  // 内部端口81**开头
  port : global._mvcOptions.port || 9000,
  // 开启自定义路由
  route_on : global._mvcOptions.route_on || false,
  ...global._mvcOptions.others,

  default_module : 'api', //默认模块
  default_controller : 'index', //默认的控制器
  default_action : 'get', //默认的 Action
};
