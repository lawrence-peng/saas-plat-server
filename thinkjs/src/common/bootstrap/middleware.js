
think.middleware('module_route_parse', http =>{
   http.module = 'core';
   http.controller = 'connection';
   http.action = 'get';
});

think.middleware('module_locate_template', (http, options) =>{
  if (!http.module) return;
  let appPath = saasplat.appPath;
  let pos = http.module.indexOf('_');
  if (pos === -1) return;
  // app view需要定位
  let app = http.module.substr(0, pos);
  let module = http.module.substr(pos+1);
  let controller = http.controller;
  let action = http.action;
  let {file_depr, file_ext} = options;
  return appPath + think.sep + app + think.sep + module + think.sep +
    think.dirname.view + think.sep + controller + file_depr + action + file_ext;
});

// think.middleware('request_begin', http => {
//   // 内部代码目录禁止访问
//    if (http.pathname.indexOf('saasplat')>-1){
//      http.end();//直接结束当前请求
//      return think.prevent(); //阻止后续的代码继续执行
//    }
// })
