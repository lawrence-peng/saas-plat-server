import user from '../../../user';
import privilege from '../../../privilege';

export default class extends think.controller.base {
  async syncAction() {
    // 平台同步用户权限请求
    await user.refresh();
    await privilege.refresh();
    return this.success();
  }
}
