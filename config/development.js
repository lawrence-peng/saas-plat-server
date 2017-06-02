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
  var instance = new app( Object.assign({
    appPath: path.join( process.cwd(), 'node_modules' ),
    devPath: path.dirname( process.cwd() ),
    // 模块配置文件
    modules: 'saas-plat-*',
    devModules: path.basename( process.cwd() ),
    // 模块配置文件
    // 服务
    roles: [
      'web', 'app', 'task', 'workflow'
    ],
    debug: true,
    logLevel: 'ALL'

  } ,config));
  instance.compile( {
    log: true
  } );
  instance.run().catch( function ( err ) {
    console.error( err );
  } );
}
