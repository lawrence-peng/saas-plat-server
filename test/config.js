export const IP = 'localhost'

export const querydb = {
  username: "root",
  password: "123456",
  database: "testserver1_querys",
  host: IP,
  dialect: "mysql"
}

export const eventmq = {
  host: IP
}

export const eventdb = {
  url: 'mongodb://' + IP + ':27017/cqrs_TEST'
}
