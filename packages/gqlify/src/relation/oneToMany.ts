import { isEmpty } from 'lodash';
import { Model, RelationType } from '../dataModel';
import { Operator } from '../dataSource/interface';
import { Relation, WithForeignKey } from './interface';

const createForeignKey = (model: Model) =>
  `${model.getNamings().singular}Id`;

// one-to-many, can be used for unidirectional and bidirectional
// put a foreign key on many side
export default class OneToMany implements Relation, WithForeignKey {
  private oneSideModel: Model;
  private manySideModel: Model;
  private oneSideField: string;
  // exists if it's bidirectional
  private manySideField?: string;
  // foreignKey will be on many side
  private foreignKey: string;

  constructor({
    oneSideModel,
    manySideModel,
    oneSideField,
    manySideField,
    foreignKey,
  }: {
    oneSideModel: Model,
    manySideModel: Model,
    oneSideField: string,
    manySideField?: string,
    foreignKey?: string,
  }) {
    this.oneSideModel = oneSideModel;
    this.manySideModel = manySideModel;
    this.oneSideField = oneSideField;
    this.manySideField = manySideField;
    // foreignKey will be put on many-side record
    this.foreignKey = foreignKey || createForeignKey(this.oneSideModel);
  }

  public getType() {
    return this.manySideField ? RelationType.biOneToMany : RelationType.uniOneToMany;
  }

  public getForeignKey() {
    return this.foreignKey;
  }

  public getForeignKeyConfig() {
    return [{
      model: this.manySideModel,
      foreignKey: this.getForeignKey(),
    }];
  }

  public getOneSideField() {
    return this.oneSideField;
  }

  public getManySideField() {
    return this.manySideField;
  }

  public setForeignKeyOnManySide(targetId: string) {
    return {[this.foreignKey]: targetId};
  }

  public async createAndSetForeignKeyOnManySide(targetData: Record<string, any>, context: any) {
    const mutation = this.oneSideModel.getCreateMutationFactory().createMutation(targetData);
    const created = await this.oneSideModel.getDataSource().create(mutation, context);
    return this.setForeignKeyOnManySide(created.id);
  }

  public unsetForeignKeyOnManySide() {
    return {[this.foreignKey]: null};
  }

  public async destroyAndUnsetForeignKeyOnManySide(data: Record<string, any>, context: any) {
    const foreignId = data[this.foreignKey];
    if (!foreignId) {
      return;
    }
    await this.oneSideModel.getDataSource().delete({id: {[Operator.eq]: foreignId}}, context);
    return this.unsetForeignKeyOnManySide();
  }

  public async addIdFromOneSide(oneSideId: string, manySideId: string, context: any) {
    const mutation = this.manySideModel.getUpdateMutationFactory().createMutation({[this.foreignKey]: oneSideId});
    await this.manySideModel.getDataSource().update({id: {[Operator.eq]: manySideId}}, mutation, context);
  }

  public async createAndAddFromOneSide(oneSideId: string, manySideData: any, context: any) {
    manySideData[this.foreignKey] = oneSideId;
    const mutation = this.manySideModel.getCreateMutationFactory().createMutation(manySideData);
    await this.manySideModel.getDataSource().create(mutation, context);
  }

  public async removeIdFromOneSide(oneSideId: string, manySideId: string, context: any) {
    const mutation = this.manySideModel.getUpdateMutationFactory().createMutation({[this.foreignKey]: null});
    await this.manySideModel.getDataSource().update({id: {[Operator.eq]: manySideId}}, mutation, context);
  }

  public async deleteRecordFromOneSide(manySideId: string, context: any) {
    await this.manySideModel.getDataSource().delete({id: {[Operator.eq]: manySideId}}, context);
  }

  public async joinManyOnOneSide(data: Record<string, any>, context: any) {
    const records = await this.manySideModel.getDataSource().findManyFromOneRelation(this.foreignKey, data.id, context);
    return records;
  }

  public async joinOneOnManySide(data: Record<string, any>, context: any) {
    const targetId = data[this.foreignKey];
    if (!targetId) {
      return null;
    }
    const toOneData = await this.oneSideModel.getDataSource().findOneById(targetId, context);
    return isEmpty(toOneData) ? null : toOneData;
  }
}
