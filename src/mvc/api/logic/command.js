import i18n from '../../../util/i18n';
import privilege from '../../../privilege';

export default class extends think.logic.base {

  async postAction() {
    const rules = {
      name: 'string|alphaNumericDash|required',
      module: 'string|alphaNumericDash',
      version: 'string|in:1.0|default:1.0'
    }
    const flag = this.validate(rules);
    if (!flag) {
      return this.fail(this.errors());
    }
    // 功能权限验证
    if (privilege) {
      const module = this.post('module') || this.post('name').split('/')[0];
      const enabled = await privilege.check(
        'enable', 'command', module, this.post('name'));
      if (!enabled) {
        const privilege = await privilege.getPrivilege('command', module,
          this.post('name'));
        return this.fail(i18n.t('无') + privilege ? privilege.name : '' +
          i18n.t('权限'));
      }
    }
  }
}
