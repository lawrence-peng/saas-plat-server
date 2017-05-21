import fs from 'fs';
import path from 'path';

export var copy = function(src, dst) {
  // 读取目录中的所有文件/目录
  var paths = fs.readdirSync(src);

  paths.forEach(function(path) {
    var _src = src + '/' + path,
      _dst = dst + '/' + path,
      readable,
      writable;
    var st = fs.statSync(_src);

    // 判断是否为文件
    if (st.isFile()) {
      // 创建读取流
      readable = fs.createReadStream(_src);
      // 创建写入流
      writable = fs.createWriteStream(_dst);
      // 通过管道来传输流
      readable.pipe(writable // 如果是目录则递归调用自身
      );
    } else if (st.isDirectory()) {
      exists(_src, _dst, copy);
    }

  });

};
// 在复制目录前需要判断该目录是否存在，不存在需要先创建目录
export var exists = function(src, dst, callback) {
  var exists = fs.existsSync(dst,);
  // 已存在
  if (exists) {
    callback(src, dst // 不存在
    );
  } else {
    var sp = dst.split('/');
    var pp = '';
    for (let i = 0; i < sp.length; i++) {
      pp += path.sep + sp[i];
      if (!fs.existsSync(pp)) {
        fs.mkdirSync(pp);
      }
    }
    callback(src, dst);
  }

};
