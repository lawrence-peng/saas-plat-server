export default class extends think.logic.base {

  async auditAction() {
    this.allowMethods = 'post';
    this.rules = {
      id: 'required'
    };
  }
  async statusAction() {
    this.allowMethods = 'get';
    this.rules = {
      id: 'required'
    };
  }
  async passAction() {
    this.allowMethods = 'get';
    this.rules = {
      id: 'required'
    };
  }

}
