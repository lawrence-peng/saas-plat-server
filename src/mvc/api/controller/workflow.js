export default class extends think.controller.base {
  async auditAction() {
    const data = saasplat.data.first({ id: this.post('id') });
    if (!data) {
      // 单据不存在
      return this.status(404);
    }
    const auditAt = new Date();
    const wfId = await saasplat.workflow.audit(data.id, this.post('wfName'));
    // 保存单据状态
    await saasplat.data.update({ id: data.id }, { wfId, auditAt });
    return this.success();
  }

  async statusAction() {
    const data = saasplat.data.first({ id: this.get('id') });
    if (!data) {
      // 单据不存在
      return this.status(404);
    }
    if (!data.wfId){
      // 工作流未启动
      return this.status(404.1);
    }
    const status = await saasplat.workflow.getStatus(data.wfId);
    return this.success(status);
  }

  async passAction() {
    const data = saasplat.data.first({ id: this.get('id') });
    if (!data) {
      // 单据不存在
      return this.status(404);
    }
    if (!data.wfId){
      // 工作流未启动
      return this.success(false);
    }
    const isPassed = await saasplat.workflow.isPassed(data.wfId);
    return this.success(isPassed);
  }
}
