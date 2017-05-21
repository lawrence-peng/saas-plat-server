export default class extends saasplat.eventhandler {
  async accountCreated({
    contactPhone,
    userName,
    password,
    displayName,
    email,
    QQ,
    isAdmin
  }) {
    await this.get('account').create({
      name: userName,
      displayName,
      email,
      contactPhone,
      contactAddress: '',
      QQ,
      role: isAdmin ? 'admin' : 'user'
    });

    console.log('account created');
  }

  async accountUpdated({
    userName,
    address,
    email,
    QQ
  }) {
    const account = await this.get('account').findOne({
      where: {
        name: userName
      }
    });
    if (!account) {
      return;
    }

    if (address !== undefined) {
      account.address = address;
    }
    if (email !== undefined) {
      account.email = email;
    }

      if (QQ !== undefined) {
        account.QQ = QQ;
      }

    await account.save();

    console.log('account updated');
  }
}
