import alias from './util/alias';
import { spLogger as logger } from './util/log';
import i18n from './util/i18n';

const startup = async() => {
  for (let name in alias.filter(['bootstrap'])) {
    const Boot = alias.require(alias.alias[name]);
    if (!Boot) {
      logger.warn(i18n.t('无效启动程序'), name);
      continue;
    }
    const boot = new Boot();
    if (typeof boot.run === 'function') {
      try {
        await boot.run();
      } catch (err) {
        logger.error(err);
      }
    } else {
      logger.warn(i18n.t('无效启动入口'), name);
    }
  }
};

export default {
  startup
};
