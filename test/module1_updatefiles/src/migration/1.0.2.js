export default class extends saasplat.migration {
  up() {
    // 包所有没有QQ的账户更新成noqq
    this.model('account').findAll().forEach(item => {
      item.QQ = 'noqq';
      item.save();
    });
  }

  down() {
    console.log('noqq 不需要处理')
  }
}
