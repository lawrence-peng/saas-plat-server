export default class extends saasplat.migration {
  async up() {
    // 包所有没有QQ的账户更新成noqq
    const rep = await this.getRepository('user');
    await rep.visit(async(item) => {
      const user = await rep.get(item.id);
      user.updateQQ('noqq');
      this.save(user);
    });
    await this.commit();
  }

  down() {
    console.log('migration down to 1.0.2');
  }
}
