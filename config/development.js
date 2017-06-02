var app = require( '../lib/app' ).default;
var path = require( 'path' );
var fs = require( 'fs' );

var configfile = path.normalize( path.join( process.cwd(), 'test.json' ) );
if ( !fs.existsSync( configfile ) ) {
  console.warn( '无法加载config，必须提供一个配置文件', configfile );
  console.log( '更多信息', 'https://github.com/saas-plat/saas-plat-server' );
} else {
  var config = JSON.parse( fs.readFileSync( configfile ) );
  // load app module
  var instance = new app( {
    appPath: path.join( process.cwd(), 'node_modules' ),
    devPath: path.dirname(process.cwd()),
    // 模块配置文件
    modules: config.modules || 'saas-plat-*',
    devModules: path.basename(process.cwd()),
    // 模块配置文件
    querydb: config.querydb,
    eventdb: config.eventdb,
    systemdb: config.systemdb,
    // 服务
    roles: config.roles || [
      'web', 'app', 'task', 'workflow'
    ],
    debug: config.debug || true,
    logLevel: config.logLevel || 'ALL'
  } );
  instance.compile( {
    log: true
  } );
  instance.run();
}
