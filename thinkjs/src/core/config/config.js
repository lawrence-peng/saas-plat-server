/**
 * config
 */
export default {
  installPath: {
    pattern: '**/*.bundle',
    options: {
      cwd: saasplat.rootPath + saasplat.sep + 'bundles'
    }
  },
  // 调试服务器额外加载的测试包
  buildPath:{
    pattern: '**/package.json',
    options:{
      cwd: 'H:\\saas-plat.com\\client\\src', // todo 需要加载的包源码路径
      ignore:['**/node_modules/**','core/**', 'platform/**']
    }
  }
};
