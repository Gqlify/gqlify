import { isEmpty } from 'lodash';
import { Model } from '../dataModel';
import { Operator } from '../dataSource/interface';

const createForeignKey = (field: string, model: Model) =>
  `${field.toLowerCase()}${model.getNamings().capitalSingular}Id`;

// Unidirectional One-to-One, or Many-to-One
export default class UniToOne {
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
    this.foreignKey = createForeignKey(this.relationField, this.targetModel);
  }

  public getRelationField() {
    return this.relationField;
  }

  public setForeignKey(targetId: string) {
    return {[this.foreignKey]: targetId};
  }

  public async createAndSetForeignKey(targetData: Record<string, any>) {
    const created = await this.targetModel.getDataSource().create(targetData);
    return this.setForeignKey(created.id);
  }

  public async destroyAndUnsetForeignKey(data: Record<string, any>) {
    const foreignId = data[this.foreignKey];
    if (!foreignId) {
      return;
    }
    await this.targetModel.getDataSource().delete({id: {[Operator.eq]: foreignId}});
    return this.unsetForeignKey();
  }

  public unsetForeignKey() {
    return {[this.foreignKey]: null};
  }

  public async join(data: Record<string, any>) {
    const targetId = data[this.foreignKey];
    if (!targetId) {
      return null;
    }
    const toOneData = await this.targetModel.getDataSource().findOneById(targetId);
    return isEmpty(toOneData) ? null : toOneData;
  }
}
