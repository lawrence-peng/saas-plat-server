export default class extends think.logic.base {

  postAction() {
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
    const privilegeService = saasplat.service('privilege');
    if (privilegeService) {
      const module = this.post('module') || this.post('name').split('/')[0];
      if (!privilegeService.check('enable', 'command',
          module, this.post('name'))) {
        return this.status(403);
      }
    }
  }
}
