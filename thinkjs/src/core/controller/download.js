import Base from './base.js';
import fs from 'fs';
import path from 'path';

export default class extends Base {

  mapAction() {
    let bundlePath = (this.config('installPath') || {
        options: {}
      }).options.cwd ||
      saasplat.rootPath + saasplat.sep + 'bundles';
    return this.download(bundlePath + path.sep + this.get('name'), 'text/json', 'utf8');
  }

  async indexAction() {
    // name, version, platform, dev=false
    let bundlePath = (this.config('installPath') || {
        options: {}
      }).options.cwd ||
      saasplat.rootPath + saasplat.sep + 'bundles';
    let filename = bundlePath + path.sep + this.get('name');
    let dev = this.get('dev');
    let stat = await saasplat.stat(filename);
    let data = '';
    if (stat.isFile() && !filename.endWith('.map')) {
      data = await saasplat.readFile(filename);
      // if (dev){
      //   if (await saasplat.exist(filename + '.map')){
      //     var subpath = filename.substr(bundlePath.length+1);
      //     data += '\n//@ sourceMappingURL='+filename+'.map';
      //   }
      // }
    }
    this.type('application/x-javascript');
    return this.end(data, 'utf8');
  }
}
