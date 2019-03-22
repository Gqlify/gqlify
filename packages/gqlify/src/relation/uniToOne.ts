import { isEmpty } from 'lodash';
import { Model, RelationType } from '../dataModel';
import { Operator } from '../dataSource/interface';
import { Relation, WithForeignKey } from './interface';

// utils
const createForeignKey = (field: string) =>
  `${field.toLowerCase()}Id`;

// Unidirectional One-to-One
export default class UniToOne implements Relation, WithForeignKey {
  private sourceModel: Model;
  private targetModel: Model;
  private relationField: string;
  private foreignKey: string;

  constructor({
    sourceModel,
    targetModel,
    relationField,
    foreignKey,
  }: {
    sourceModel: Model,
    targetModel: Model,
    relationField: string,
    foreignKey?: string,
  }) {
    this.sourceModel = sourceModel;
    this.targetModel = targetModel;
    this.relationField = relationField;
    this.foreignKey = foreignKey || createForeignKey(this.relationField);
  }

  public getType() {
    return RelationType.uniOneToOne;
  }

  public getForeignKey() {
    return this.foreignKey;
  }

  public getForeignKeyConfig() {
    return [{
      model: this.sourceModel,
      foreignKey: this.getForeignKey(),
    }];
  }

  public getRelationField() {
    return this.relationField;
  }

  public setForeignKey(targetId: string) {
    return {[this.foreignKey]: targetId};
  }

  public async createAndSetForeignKey(targetData: Record<string, any>, context: any) {
    const mutation = this.targetModel.getCreateMutationFactory().createMutation(targetData);
    const created = await this.targetModel.getDataSource().create(mutation, context);
    return this.setForeignKey(created.id);
  }

  public async destroyAndUnsetForeignKey(data: Record<string, any>, context: any) {
    const foreignId = data[this.foreignKey];
    if (!foreignId) {
      return;
    }
    await this.targetModel.getDataSource().delete({id: {[Operator.eq]: foreignId}}, context);
    return this.unsetForeignKey();
  }

  public unsetForeignKey() {
    return {[this.foreignKey]: null};
  }

  public async join(data: Record<string, any>, context: any) {
    const targetId = data[this.foreignKey];
    if (!targetId) {
      return null;
    }
    const toOneData = await this.targetModel.getDataSource().findOneById(targetId, context);
    return isEmpty(toOneData) ? null : toOneData;
  }
}
