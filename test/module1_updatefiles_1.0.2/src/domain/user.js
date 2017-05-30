import Account from './account';

export default class UserAccount extends Account {
  contactPhone;
  contactAddress;

  static create({
    userName,
    password,
    ...others
  }) {
    if (!userName) {
      throw Error('用户名不能为空');
    }
    if (!password || password.length < 5) {
      throw Error('密码不能少于5位');
    }
    const userAccount = new UserAccount;
    userAccount.raiseEvent('accountCreated', {
      userName,
      password,
      ...others
    });
    return userAccount;
  }

  updateAddress(address) {
    if (!address) {
      throw Error('地址不能为空');
    }
    this.raiseEvent('accountUpdated', {
      userName: this.userName,
      address
    });
  }

  updateEmail(email) {
    if (!email) {
      throw Error('email不能为空');
    }
    this.raiseEvent('accountUpdated', {
      userName: this.userName,
      email
    });
  }

  updateQQ(QQ) {

    this.raiseEvent('accountUpdated', {
      userName: this.userName,
      QQ
    });
  }

  when({
    name,
    data
  }) {
    //console.log('when', name, JSON.stringify( data));
  }

  accountCreated({
    contactPhone,
    userName,
    password,
    displayName,
    email,
    QQ,
    ...contactAddress
  }) {
    this.userName = userName;
    this.password = password;
    this.displayName = displayName;
    this.email = email;
    this.contactPhone = contactPhone;
    this.contactAddress = contactAddress;
    this.QQ = QQ;
  }

  accountUpdated({
    address,
    email,
    QQ
  }) {
    if (address !== undefined) {
      this.contactAddress = address;
    }
    if (email !== undefined) {
      this.contactAddress = email;
    }
      if (QQ !== undefined) {
        //console.log(' update qq finished')
        this.QQ = QQ;
      }
  }

}
