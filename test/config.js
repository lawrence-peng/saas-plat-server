export const IP = '10.11.70.22'

export const querydb= {
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
  url: 'mongodb://' + IP + ':27017/cqrs'
}
