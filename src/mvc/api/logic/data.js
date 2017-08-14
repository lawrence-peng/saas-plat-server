export default class extends think.logic.base {

  async insertAction() {
    this.allowMethods = 'post';
    this.rules = {
      id: 'required'
    };
  }
  async deleteAction() {
    this.allowMethods = 'post';
    this.rules = {
      id: 'required'
    };
  }
  async findAction() {
    this.allowMethods = 'get';
  }
  async firstAction() {
    this.allowMethods = 'get';
  }
  async lastAction() {
    this.allowMethods = 'get';
  }
  async updateAction() {
    this.allowMethods = 'post';
    this.rules = {
      id: 'required'
    };
  }
  async countAction() {
    this.allowMethods = 'get';
  }
}
