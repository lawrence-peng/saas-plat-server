export default class extends saasplat.migration {
  up() {
    // 包所有没有QQ的账户更新成noqq
    this.model('account').findAll().forEach(item => {
      await this.repository.get('user', item.id).updateQQ('noqq');
      await this.repository.commit();
    });
  }

  down() {
    console.log('noqq 不需要处理')
  }
}
