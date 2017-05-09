import path from 'path';
import * as builder from 'module_builder';
import glob from 'glob';
import config from '../config/config';

function globProjects(callback) {
  glob(config.buildPath.pattern, config.buildPath.options, function (er, files) {
    if (er) {
      console.warn(er);
    } else {
      return callback(files.map(filepath => path.dirname(filepath)));
    }
  });
}

function runBuild(name) {
  saasplat.debug('编译IOS版本:' + name);
  // 启动ios包编译
  saasplat.co(builder.watch({
    srcPath: config.buildPath.options.cwd,
    name,
    outputPath: config.installPath.options.cwd,
    scope: 'client',
    platform: 'ios',
    uninstalldependencies: true,
    watch: true
  }));
  // 启动android包编译
  // saasplat.co(builder.watch({
  //   srcPath: config.buildPath.options.cwd,
  //   name,
  //   outputPath: config.installPath.options.cwd,
  //   scope: 'client',
  //   platform: 'android',
  //   uninstalldependencies: true,
  //   watch: true
  // })).catch(err){
  //   console.warn(err);
  // };
}

export function run() {
  // 如果是开发模式启动模块编译器
  if (saasplat.debugMode) {
    saasplat.log('启动本地包加载器...');
    if (!config.buildPath || !config.buildPath.pattern ||
      !config.buildPath.options || !config.buildPath.options.cwd ||
      !config.installPath || !config.installPath.options || !config.installPath.options.cwd) {
      saasplat.warn('本地包buildPath配置无效');
      return;
    }
    globProjects(files => {
      for (let file of files) {
        runBuild(file);
      }
    });
  }
}
