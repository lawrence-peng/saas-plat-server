export default class extends saasplat.migration {
  async up() {
    // 包所有没有QQ的账户更新成noqq
    const list = await this.model('account').findAll();
    for (let item of list) {
        console.log('---');
      const user = await this.getRepository('user').get(item.id);
      user.updateQQ('noqq');
      await this.save(user);
    }
    await this.commit();
    console.log('migration up to 1.0.2');
  }

  down() {
    console.log('migration down to 1.0.2');
  }
}
