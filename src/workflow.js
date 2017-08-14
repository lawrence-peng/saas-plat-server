
// 获取单据定义的工作流
const getWorkFlows = async(vId) =>{

}

// 开始流转
const audit = async(vId, wfName) => {

}

// 当前状态
const status = async(wfId) => {

}

// 下一步
const next = async(wfId, agreeOrNot, reason, approver) => {

}

// 取消全部流转
const cancel = async(wfId) => {

}

// 驳回上一步
const reject = async(wfId) => {

}

// 是否流转完成并通过
const isPassed = async(wfId) => {
  return true;
}

const isEnd = async(wfId) => {
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
