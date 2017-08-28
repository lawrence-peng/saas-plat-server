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
    await this.model('account').create({
      id: userName,
      displayName,
      email,
      contactPhone,
      contactAddress: '',
      QQ,
      role: isAdmin
        ? 'admin'
        : 'user'
    });

  //  console.log('account created');
  }

  async accountUpdated({userName, address, email, QQ}) {
    const account = await this.model('account').findOne({
      where: {
        id: userName
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

    console.log('accountUpdated event handler',QQ)

    if (QQ !== undefined) {
      account.QQ = QQ;
    }

    await account.save();
  }
}
