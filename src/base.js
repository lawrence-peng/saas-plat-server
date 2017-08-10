/*
saasplat server interface
*/
import path from 'path';
import moment from 'moment';
import _ from 'lodash';
import mvc from './mvc';
import cqrs from './cqrs';
import orm from './orm';
import task from './task';
import {
  spLogger as logger
} from './util/log';
import conf from './config';
import assert from 'assert';
import i18n from './util/i18n';

global.assert = assert;

global.saasplat = {
  ..._
};
saasplat.sep = path.sep;
saasplat.join = path.join;
saasplat.dirname = path.dirname;
saasplat.moment = moment;

// 工具类，挑出所有有值的并且不是cqrs的聚合基类的辅助值
saasplat.toVal = (value, predicate, thisArg) => {
  const ret = _.omit(value, predicate || _.isUndefined, thisArg);
  if (!predicate) {
    delete ret['_version'];
    delete ret['_branch'];
    delete ret['_uncommittedEvents'];
    delete ret['_eventVersion'];
    delete ret['_domainEventHandlers'];
    delete ret['_id'];
  }
  return ret;
}

saasplat.getModuleConfig = function (module, name) {
  let config = conf.require(module + '/config/config', true);
  if (!name)
    return config;
  if ( config && config[ name ] )
    return config[ name ];
  config = conf.require( module + '/config/' + name, true );
  return config;
};
saasplat.setModuleConfig = function ( module, name, value ) {
  console.warn( 'setModuleConfig not support!' );
};
saasplat.config = function ( name, value, module ) {
  if ( value == undefined ) {
    if ( module ) {
      let val = saasplat.getModuleConfig( module, name );
      if ( val )
        return val;
      return think.config( name );
    } else {
      return think.config( name );
    }
  } else {
    if ( module ) {
      saasplat.setModuleConfig( name, value, module )
    } else {
      think.config( name, value );
    }
  }
};

saasplat.log = ( ...args ) => {
  logger.info( ...args );
};
saasplat.warn = ( ...args ) => {
  logger.warn( ...args );
};
saasplat.debug = ( ...args ) => {
  logger.debug( ...args );
};
saasplat.info = ( ...args ) => {
  logger.info( ...args );
};
saasplat.error = ( ...args ) => {
  logger.error( ...args );
};
saasplat.trace = ( ...args ) => {
  logger.trace( ...args );
};

saasplat.base = class {};
saasplat.mixins = ( superclass ) => class extends superclass {
  log( ...args ) {
    saasplat.log( ...args );
  }
  warn( ...args ) {
    saasplat.warn( ...args );
  }
  debug( ...args ) {
    saasplat.debug( ...args );
  }
  info( ...args ) {
    saasplat.info( ...args );
  }
  error( ...args ) {
    saasplat.error( ...args );
  }

  t( txt, module ) {
    return i18n.t( txt, module || this.module );
  }

  get module() {
    return this.__type.split( '/' )[ 0 ];
  }

  // static get name() {
  //   return this.prototype.__type.split('/')[2];
  // }

  config( name, value, module ) {
    return saasplat.config( name, value, checkModule( module || this.module ) );
  }
};

// // 界面通过元数据配置方式定义
// saasplat.view = {};
// saasplat.view.base = class {
//   constructor() {
//     this.name = '';
//     this.component = null;
//     this.metadata = {};
//   }
// };

const checkModule = ( moduleName ) => {
  if ( typeof moduleName !== 'string' ) {
    throw new Error( i18n.t( '模块不存在' ) );
  }
  return moduleName;
}

mvc.init( saasplat.appPath || process.cwd(), saasplat.debugMode );

// 控制器使用thinkjs的
saasplat.controller = {};
saasplat.controller.base = class extends saasplat.mixins( think.controller.base ) {

  publish( ...messages ) {
    cqrs.bus.publishCommand( messages );
  }

  query( name, module ) {
    module = ( checkModule( module || this.module ) );
    return saasplat.model.get( module + name );
  }

};

saasplat.controller.rest = class extends saasplat.controller.base {
  init( http ) {
    super.init( http );

    this._isRest = true;
    this._method = '';
  }
};

saasplat.logic = {};
saasplat.logic.base = class extends saasplat.mixins( think.logic.base ) {
  query( name, module ) {
    module = ( checkModule( module || this.module ) );
    return saasplat.model.get( module + name );
  }
};

// 领域层使用cqrs

saasplat.command = {};
saasplat.command.publish = async( ...msgs ) => {
  logger.debug( i18n.t( '发送命令' ), ...msgs.map( item => item.name ) );
  logger.trace( ...msgs );
  await cqrs.bus.publishCommand( ...msgs );
}

saasplat.repository = cqrs.repository;
saasplat.aggregate = class extends saasplat.mixins( cqrs.Aggregate ) {};

saasplat.event = global.event = cqrs.event;
saasplat.command = global.command = cqrs.command;

saasplat.commandhandler = class extends saasplat.mixins( cqrs.CommandHandler ) {

  model( name, module ) {
    return saasplat.model.get( name, checkModule( module || this.module ) );
  }

  getRepository( name, module ) {
    return {
      get: async( id, ...options ) => {
        let rep = await this.repository.get( name, id, checkModule( module || this.module ), options );
        if ( !rep ) {
          throw new Error( ( module || this.module ) + '/' + name + ':' + id + i18n.t( '不存在' ) )
        }
        return rep;
      }
    };
  }

  getAggregate( name, module ) {
    return cqrs.Aggregate.get( name, checkModule( module || this.module ) );
  }

  async save( ...aggregates ) {
    await cqrs.repository.getRepository().save( ...aggregates );
  }

  async commit() {
    await cqrs.repository.getRepository().commit();
  }
};

saasplat.eventhandler = class extends saasplat.mixins( cqrs.EventHandler ) {

  model( name, module ) {
    return saasplat.model.get( name, checkModule( module || this.module ) );
  }
};

saasplat.migration = class extends saasplat.mixins( saasplat.base ) {
  getRepository( name, id, module, ...porps ) {
    return cqrs.repository.getRepository().get( name, id, module || this.module, ...porps );
  }

  model( name, module ) {
    return saasplat.model.get( name, checkModule( module || this.module ) );
  }

  getAggregate( name, module ) {
    return cqrs.Aggregate.get( name, checkModule( module || this.module ) );
  }

  async save( ...aggregates ) {
    await cqrs.repository.getRepository().save( ...aggregates );
  }

  async commit() {
    await cqrs.repository.getRepository().commit();
  }

  up() {}
  down() {}
}

// 使用Sequelize orm
saasplat.model = {};
saasplat.model.base = class extends saasplat.mixins( saasplat.base ) {
  schame() {
    return null;
  }
  options() {
    return null;
  }
}

saasplat.model.migration = class extends saasplat.mixins( saasplat.base ) {
  constructor() {
    super();
    this.queryInterface = orm.data.db.getQueryInterface();
  }

  getTableName( tableName, options ) {
    if ( !tableName ) {
      return tableName;
    }
    return `${ (options && options.module) || this.module}_${tableName}`;
  }

  createTable( tableName, attributes, options, ...others ) {
    this.queryInterface.createTable( this.getTableName( tableName, options ), attributes, options, ...others );
  }

  dropTable( tableName, options, ...others ) {
    this.queryInterface.dropTable( this.getTableName( tableName, options ), options, ...others );
  }

  dropAllTables( options, ...others ) {
    return new Promise( ( resolve ) => {
      const module = options.module || this.module;
      this.showAllTables( options ).then( tableNames => {
        const skips = tableNames.filter( name => name.split( '_' )[ 0 ] != module );
        const sks = ( options.skip || [] ).map( name => `${module}_${name}` );
        options.skip = [
          ...sks,
          ...skips
        ];
        return this.queryInterface.dropAllTables( options, ...others );
      } );
    } );
  }

  renameTable( before, after, options, ...others ) {
    return this.queryInterface.renameTable( this.getTableName( before, options ), this.getTableName( after, options ), ...others );
  }

  showAllTables( options, ...others ) {
    return this.queryInterface.showAllTables( options, ...others ).then( tableNames => {
      const module = options.module || this.module;
      return tableNames.filter( name => name.split( '_' )[ 0 ] == module ).map( name => {
        return name.substr( name.indexOf( '_' ) + 1 );
      } );
    } );
  }

  describeTable( tableName, options, ...others ) {
    return this.queryInterface.describeTable( this.getTableName( tableName, options ), options, ...others );
  }

  addColumn( tableName, key, attribute, options, ...others ) {
    return this.queryInterface.addColumn( this.getTableName( tableName, options ), key, attribute, options, ...others );
  }

  removeColumn( tableName, attributeName, options, ...others ) {
    return this.queryInterface.removeColumn( this.getTableName( tableName, options ), attributeName, options, ...others );
  }

  changeColumn( tableName, attributeName, dataTypeOrOptions, options, ...others ) {
    return this.queryInterface.changeColumn( this.getTableName( tableName, options ), attributeName, dataTypeOrOptions, options, ...others );
  }

  renameColumn( tableName, attrNameBefore, attrNameAfter, options, ...others ) {
    return this.queryInterface.renameColumn( this.getTableName( tableName, options ), attributeName, attrNameAfter, options, ...others );
  }

  addIndex( tableName, attributes, options, rawTablename, ...others ) {
    return this.queryInterface.addIndex( this.getTableName( tableName, options ), attributes, options, this.getTableName( rawTablename, options ), ...others );
  }

  showIndex( tableName, options, ...others ) {
    return this.queryInterface.showIndex( this.getTableName( tableName, options ), options, ...others );
  }

  nameIndexes( indexes, rawTablename, ...others ) {
    return this.queryInterface.nameIndexes( ( indexes || [] ).map( name => this.getTableName( name, options ) ), this.getTableName( rawTablename, options ), ...others );
  }

  getForeignKeysForTables( tableNames, options, ...others ) {
    return this.queryInterface.getForeignKeysForTables( ( tableNames || [] ).map( tableName => this.getTableName( tableName, options ) ), options, ...others );
  }

  removeIndex( tableName, indexNameOrAttributes, options, ...others ) {
    return this.queryInterface.removeIndex( this.getTableName( tableName, options ), indexNameOrAttributes, options, ...others );
  }

  addConstraint( tableName, attributes, options, rawTablename, ...others ) {
    return this.queryInterface.addConstraint( this.getTableName( tableName, options ), attributes, options, this.getTableName( rawTablename, options ), ...others );
  }

  showConstraint( tableName, options, ...others ) {
    return this.queryInterface.showConstraint( this.getTableName( tableName, options ), options, ...others );
  }

  removeConstraint( tableName, constraintName, options, ...others ) {
    return this.queryInterface.removeConstraint( this.getTableName( tableName, options ), this.getTableName( constraintName, options ), options, ...others );
  }

  insert( instance, tableName, values, options, ...others ) {
    return this.queryInterface.insert( instance, this.getTableName( tableName, options ), values, options, ...others );
  }

  upsert( tableName, valuesByField, updateValues, where, model, options, ...others ) {
    return this.queryInterface.upsert( this.getTableName( tableName, options ), valuesByField, updateValues, where, model, options, ...others );
  }

  bulkInsert( tableName, records, options, attributes, ...others ) {
    return this.queryInterface.bulkInsert( this.getTableName( tableName, options ), records, options, attributes, ...others );
  }

  update( instance, tableName, values, identifier, options, ...others ) {
    return this.queryInterface.update( instance, this.getTableName( tableName, options ), values, identifier, options, ...others );
  }

  bulkUpdate( tableName, values, identifier, options, ...others ) {
    return this.queryInterface.bulkUpdate( this.getTableName( tableName, options ), values, identifier, options, ...others );
  }

  delete( instance, tableName, identifier, options, ...others ) {
    return this.queryInterface.delete( instance, this.getTableName( tableName, options ), identifier, options, ...others );
  }

  bulkDelete( tableName, identifier, options, ...others ) {
    return this.queryInterface.bulkDelete( this.getTableName( tableName, options ), identifier, options, ...others );
  }

  select( model, tableName, options, ...others ) {
    return this.queryInterface.select( model, this.getTableName( tableName, options ), options, ...others );
  }

  increment( instance, tableName, values, identifier, options, ...others ) {
    return this.queryInterface.increment( instance, this.getTableName( tableName, options ), tableName, values, options, ...others );
  }

  decrement( instance, tableName, values, identifier, options, ...others ) {
    return this.queryInterface.decrement( instance, this.getTableName( tableName, options ), values, identifier, options, ...others );
  }

  up() {}
  down() {}
}

global.TYPE = saasplat.model.TYPE = saasplat.model.type = orm.TYPE;
saasplat.model.get = ( name, module ) => {
  if ( !name ) {
    throw new Error( i18n.t( '查询对象未找到' ) );
  }
  if ( !module ) {
    const mn = name.split( '/' );
    if ( mn.length == 2 ) {
      module = mn[ 0 ];
      name = mn[ 1 ];
    }
  }
  if ( !module ) {
    throw new Error( name + i18n.t( '查询对象未找到，模块未知' ) );
  }
  return orm.get( module, name );
};

saasplat.bootstrap = class extends saasplat.mixins( saasplat.base ) {
  run() {}
}
