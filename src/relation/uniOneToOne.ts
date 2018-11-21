import { isEmpty } from 'lodash';
import { Model } from '../dataModel';
import { supportToOneRelation } from '../dataSource/utils';

enum relationType {
  belongsTo = 'belongsTo',
  hasOne = 'hasOne',
}

const createForeignKey = (field: string, model: Model) =>
  `${field.toLowerCase()}${model.getNamings().capitalSingular}Id`;

// Unidirectional One-to-One
export default class UniOneToOne {
  private sourceModel: Model;
  private targetModel: Model;
  private relationField: string;
  private foreignKey: string;

  constructor({
    sourceModel,
    targetModel,
    relationField,
  }: {
    sourceModel: Model,
    targetModel: Model,
    relationField: string,
  }) {
    this.sourceModel = sourceModel;
    this.targetModel = targetModel;
    this.relationField = relationField;

    // uni one-to-one relation will put a foreign key on source side
    // check if sourceModel suppport to-one relation
    if (!supportToOneRelation(this.sourceModel)) {
      throw new Error(`Data source of ${sourceModel.getName()} do not support to one relation`);
    }

    this.foreignKey = createForeignKey(this.relationField, this.targetModel);
  }

  public setForeignKey(data: Record<string, any>, targetId: string) {
    data[this.foreignKey] = targetId;
    return data;
  }

  public async createAndSetForeignKey(data: Record<string, any>, targetData: Record<string, any>) {
    const created = await this.targetModel.getDataSource().create(targetData);
    return this.setForeignKey(data, created.id);
  }

  public unsetForeignKey(data: Record<string, any>) {
    data[this.foreignKey] = null;
    return data;
  }

  public async join(data: Record<string, any>) {
    const targetId = data[this.foreignKey];
    if (!targetId) {
      return null;
    }
    const toOneData = await this.targetModel.getDataSource().findOne({where: {id: targetId}});
    return isEmpty(toOneData) ? null : toOneData;
  }
}
