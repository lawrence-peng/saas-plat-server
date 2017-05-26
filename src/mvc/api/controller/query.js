export default class extends think.controller.base {

  async getAction() {
    const Model = saasplat.model.get(this.param('name'), this.param('module'));
    let data;
    let dataCount;
    if (this.param('id')) {
      data = await Model.findOne({
        attributes: this.param('attributes'),
        where: {
          id: this.param('id')
        },
        order: this.param('order'),
        offset: this.param('offset')
      });
    } else {
      const {
        name,
        module,
        attributes,
        id,
        offset,
        limit,
        version,
        count,
        where,
        ...eqlWhere
      } = this.get();
      if (this.param('count')) {
        const result = await Model.findAndCountAll({
          attributes: this.param('attributes'),
          where: eqlWhere || JSON.parse(this.param('where')),
          order: this.param('order'),
          offset: this.param('offset') || 0,
          limit: this.param('limit')
        });
        data = result.rows;
        dataCount = result.count;
      } else {
        data = await Model.findAll({
          attributes: this.param('attributes'),
          where: eqlWhere || JSON.parse(this.param('where')),
          order: this.param('order'),
          offset: this.param('offset') || 0,
          limit: this.param('limit')
        });
      }
    }
    return this.success(this.param('count') ? {
      data,
      count: dataCount
    } : data);
  }
}
