# saas-plat-server

## 概述
为saas-plat.com平台提供应用服务器，提供基于Restful Api、CQRS、sequelize的ORM、Workflow和定时服务的运行环境。

## 安装

```
  npm install saas-plat-server
```

仅仅saas-plat-server是没有意义，你还需要安装业务模块

```
  npm install saas-plat-erp-base saas-plat-retail_pos saas-plat-stock_control saas-plat-purchase_sale
```

需要在项目跟目录创建一个tenant.json配置服务器信息

```
{
  "modules": "saas-plat-*",  // glob 或 ['xxx','xxx2']
  "eventdb": {
    "username": "root",
    "password": "123456",
    "database": "testserver1_events",
    "host": "localhost",
    "dialect": "mysql"
  },
  "querydb": {
    "username": "root",
    "password": "123456",
    "database": "testserver1_querys",
    "host": "localhost",
    "dialect": "mysql"
  }
}
```

## 开发

按业务单元开发，每个单元划分成一个模块，一个模块包含如下项目结构：

+ saas-plat-erp-base-department
  - src     // es6
    - controller
    - logic
    - service
    - model
    - domain
    - migration
    - command
    - event
    - workflow
    - task
  - app     // es5
  - package.json

saas-plat-server是前后端分离的模式，server只能提供api接口，
如果需要高体验的前端，参见<https://github.com/saas-plat/saas-plat-native>

**可以安装saas-plat-cli工具构建项目**

```
  npm i -g saas-plat-cli

  saasplat module mymodule1
  cd mymodule1
```

### CQRS DDD

业务模块采用DDD领域驱动设计方式开发

相关文件夹

```
  - domain    // 领域对象或服务，主要实现业务逻辑代码
  - command   // 命令Handler，调用领域对象或服务执行逻辑
  - event     // 事件Handler，在发生了某个业务事件后处理保存成供查询的一维表数据、系统集成等其他逻辑
  - model     // 查询对象，简单的一维表，直接提供查询数据
  - migration // 业务迁移逻辑
```

**业务迁移**

业务迁移适用于调整业务逻辑或者错误产生的数据错误

### ORM

查询对象采用ORM方式操作

相关文件夹

```
  - model
```

**数据迁移**

数据迁移并不需要编写创建表脚本或升级脚本，也不需要写错误数据修改脚本，
系统会计算相关模块，采用重塑业务事件方式，重建所有相关数据


### 工作流

### 定时任务

### Restful Api

### Socket.io

### 配置

### 路由

## 运行

```
  npm start
```

## 授权

saas-plat-server和saas-plat-cli工具遵循GPL许可

**部分由saas-plat.com开发者开发的业务模块可能采用非商业授权许可**
