import fs from 'fs';
import path from 'path';
import glob from 'glob';
import config from '../config/config';

const mainfile = 'index.js';
const packagefile = 'package.json';

export default class extends saasplat.controller.rest {

  getNameVersion(filepath, fullpath) {
    if (filepath.endsWith('.js') || filepath.endsWith('.bundle')) {
      let names = filepath.split('.');
      if (names.length <= 1) {
        saasplat.warn(filepath + ' 无效');
        return;
      }
      let versions = names[1].split('-');
      if (versions.length <= 1) {
        saasplat.warn(filepath + ' 无效');
        return;
      }
      return {
        name: names[0],
        version: [versions[1]].concat(names.slice(2,names.length-1)).join('.')
      };
    } else if (filepath.endsWith('.json')) {
      let json = JSON.parse(fs.readFileSync(fullpath));
      return {
        name: path.dirname(filepath),
        version: json.version
      };
    } else {
      saasplat.warn(filepath + ' 无效');
    }
  }

  globFiles(cfg) {
    if (!cfg.options) {
      cfg.options = {};
    }
    if (!cfg.options.cwd) {
      cfg.options.cwd = saasplat.rootPath + saasplat.sep + 'bundles';
    }
    let me = this;
    return new Promise((resolve, reject) => {
      glob(cfg.pattern, cfg.options, function (er, files) {
        if (er) {
          reject(er);
        } else {
          let fss = (files || []).map(filepath => me.getNameVersion(filepath,
            cfg.options.cwd + saasplat.sep + filepath)).filter(v => v);
          resolve(fss);
        }
      });
    });
  }

  filterMaxVersion(versions) {
    let maxVers = [];
    for (let item of versions) {
      if (maxVers.filter(v => v.name == item.name && v.version >= item.version).length > 0) {
        continue;
      }
      maxVers.push(item);
    }
    return maxVers;
  }

  async getBundles() {
    let bundles = await this.cache('bundle_bundles');
    if (!bundles || saasplat.debugMode) {
      // 服务器模块都是从文件路径查找
      let files = await this.globFiles(config.installPath);
      bundles = this.filterMaxVersion(files);
      await this.cache('bundle_bundles', bundles);
    }
    return bundles;
  }

  async getAction() {
    let bundles = await this.getBundles();
    return this.success({
      bundles,
      bundleServer: 'http://' + this.http.host + '/core/download',
    });
  }
}
