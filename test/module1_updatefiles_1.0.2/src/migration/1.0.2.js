export default class extends saasplat.migration {
  async up() {
    // 包所有没有QQ的账户更新成noqq
    // for (let item of this.model('account').findAll()) {
    //   await this.repository.get('user', item.id).updateQQ('noqq');
    //   await this.repository.commit();
    // }
    console.log('migration up to 1.0.2');
  }

  down() {
    console.log('migration down to 1.0.2');
  }
}
