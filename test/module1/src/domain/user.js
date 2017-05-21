import Account from './account';

export default class extends Account {
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
    const userAccount = new UserAccount(userName);
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
      userName: this.id,
      address
    });
  }

  updateEmail(email) {
    if (!email) {
      throw Error('email不能为空');
    }
    this.raiseEvent('accountUpdated', {
      userName: this.id,
      email
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
    ...contactAddress
  }) {
    //this.userName = userName;
    this.password = password;
    this.displayName = displayName;
    this.email = email;
    this.contactPhone = contactPhone;
    this.contactAddress = contactAddress;
  }

  accountUpdated({
    address,
    email
  }) {
    if (address !== undefined) {
      this.contactAddress = address;
    }
    if (email !== undefined) {
      this.contactAddress = email;
    }
  }

}
