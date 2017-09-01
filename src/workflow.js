import StateMachine from 'javascript-state-machine';
import StateMachineHistory from 'javascript-state-machine/lib/history';
import { data as db } from './orm';
import i18n from './util/i18n';

let WorkFlow;
let History;

const createTable = async(force) => {
  WorkFlow = db.sysdb.define({
    name: db.sysdb.STRING(255), // module.name
    title: db.sysdb.STRING(255),
    flows: db.sysdb.STRING(20480),
    version: db.sysdb.INTEGER,
    status: {
      type: db.sysdb.ENUM('enabled', 'disabled'),
      allowNull: false
    }
  });
  History = db.sysdb.define({
    vId: db.sysdb.STRING(255), // voucher id
    state: db.sysdb.STRING(255),
    history: db.sysdb.STRING(20480),
    status: {
      type: db.sysdb.ENUM('enabled', 'disabled'),
      allowNull: false
    }
  });

  History.belongsTo(WorkFlow, {
    foreignKey: 'workflowId'
  });

  await WorkFlow.sync({ force });
  await History.sync({ force });
};

const createFsm = async(resume = true) => {
  // 审批流使用有限工作机定义一个特殊的工作流
  const fsm = new StateMachine({
    init: 'A',
    transitions: [
      { name: 'step', from: 'A', to: 'B' }
    ],
    data: {
      color: 'red'
    },
    methods: {
      describe: function() {
        console.log('I am ' + this.color);
      }
    },
    plugins: [
      new StateMachineHistory() //  <-- plugin enabled here
    ]
  });

  // fsm.history;  // [ 'A', 'B' ]
};

// 获取单据定义的工作流
const getFlows = async(name, module) => {
  const wfs = await WorkFlow.findAll({
    where: {
      name: (module ? module + '.' : '') + name,
      status: 'enabled'
    },
    order: ['version', 'DESC']
  });
  return wfs;
}

// 开始流转
const start = async(id, wfId) => {
  const wf = await WorkFlow.findById(wfId);
  if (!wf) {
    throw new Error(404, i18n.t('流程不存在'));
  }
}

// 当前状态
const status = async(id) => {

}

// 下一步
const next = async(id, agreeOrNot, reason, approver) => {

}

// 取消全部流转
const cancel = async(id) => {

}

// 驳回上一步
const reject = async(wfId) => {

}

// 是否流转完成并通过
const isPassed = async(id) => {
  return true;
}

const isEnd = async(id) => {
  return true;
}

const init = async(force = false) => {
  await createTable(force);
}

export default {
  init,
  getFlows,
  start,
  status,
  next,
  cancel,
  reject,
  isEnd,
  isPassed
}
