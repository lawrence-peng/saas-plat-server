import * as cqrs from 'cqrs-fx';
import * as cqrsCore from 'cqrs-fx/lib/core';
import config from 'cqrs-fx/lib/config';

const init = (cfg) => {
  config.init({
    bus: {
      commandBus: 'direct',
      eventBus: 'mq',
      eventMQ: {
        name: 'eventqueue',
        port: 6379,
        host: '127.0.0.1',
        ...cfg.eventmq
      }
    },
    event: {
      storage: 'mongo_domain_event',
      collection: 'events'
    },
    repository: {
      type: 'event_sourced'
    },
    snapshot: {
      provider: 'event_number',
      storage: 'mongo', // redis mysql mongo memory ...
      collection: 'snapshots'
    },
    mongo: {
      url: 'mongodb://localhost:27017/cqrs',
      ...cfg.eventdb
    }
  });
}

export default {
  init,
  fxData: cqrsCore.fxData,
  alias: cqrsCore.alias,
  ...cqrs
}
