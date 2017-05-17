
export default class extends saasplat.controller.rest{

  getAction(){
    return this.success({
      ok: 'hello module1'
    });
  }
}
