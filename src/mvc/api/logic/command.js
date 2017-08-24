import i18n from '../../../util/i18n';

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
    // 功能权限验证，这里的服务一般有平台user模块提供，如果没有不启用权限验证
    const privilegeService = saasplat.service('privilege');
    if (privilegeService) {
      const module = this.post('module') || this.post('name').split('/')[0];
      const enabled = await privilegeService.check(
        'enable', 'command', module, this.post('name'));
      if (!enabled) {
        const privilege = await privilegeService.getPrivilege('command', module,
          this.post('name'));
        return this.fail(i18n.t('无') + privilege ? privilege.name : '' +
          i18n.t('权限'));
      }
    }
  }
}
