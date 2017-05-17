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

### 基于Thinkjs MVC框架的restful api实现

### 基于CQRS框架的业务逻辑实现

### 工作流

### 定时任务

### Socket.io

### 启动运行

### 模块配置

## 运行

```
  npm start
```

## 授权

saas-plat-server和saas-plat-cli工具遵循Apache License许可

**部分由saas-plat.com开发者开发的业务单元可能采用非商业授权许可**
