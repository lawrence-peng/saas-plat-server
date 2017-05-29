export default class extends saasplat.migration {
  async up() {
    // 包所有没有QQ的账户更新成noqq
    const items = await this.model('account').findAll();
    for (let item of items) {
      const user = await this.getRepository('user', item.id);
      user.updateQQ('noqq');
      this.save(user);
      await this.commit();
    }
  }

  down() {
    console.log('migration down to 1.0.2');
  }
}
