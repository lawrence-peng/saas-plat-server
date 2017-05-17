export default class extends saasplat.controller.rest{
  getAction(){
    return this.success({
      ok: 'this is module2'
    });
  }
}
