import userrole from '../../../userrole';

export default class extends think.controller.base {
  async userroleAction() {
    // 平台同步用户权限请求
    await userrole.refresh();
    // 清空thinkjs的缓存
    // await this.cache('userrole',null);
    return this.success();
  }
}
