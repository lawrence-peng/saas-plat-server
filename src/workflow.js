
// 获取单据定义的工作流
const getWorkFlows = async(name, module) =>{

}

// 开始流转
const audit = async(id, wfName) => {

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

export default {
  getWorkFlows,
  audit,
  status,
  next,
  cancel,
  reject,
  isEnd,
  isPassed
}
