import { isEmpty } from 'lodash';
import { Model } from '../dataModel';
import { supportToOneRelation } from '../dataSource/utils';
import { Operator } from '../dataSource/interface';
const noop = val => val;

enum relationType {
  belongsTo = 'belongsTo',
  hasOne = 'hasOne',
}

const createForeignKey = (model: Model) =>
  `${model.getNamings().singular}Id`;

// one-to-many
// put a foreign key on many side
export default class OneToMany {
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
  }: {
    oneSideModel: Model,
    manySideModel: Model,
    oneSideField: string,
    manySideField?: string,
  }) {
    this.oneSideModel = oneSideModel;
    this.manySideModel = manySideModel;
    this.oneSideField = oneSideField;
    this.manySideField = manySideField;
    this.foreignKey = createForeignKey(this.manySideModel);
  }

  public setForeignKeyOnManySide(data: Record<string, any>, targetId: string) {
    data[this.foreignKey] = targetId;
    return data;
  }

  public async createAndSetForeignKeyOnManySide(data: Record<string, any>, targetData: Record<string, any>) {
    const created = await this.oneSideModel.getDataSource().create(targetData);
    return this.setForeignKeyOnManySide(data, created.id);
  }

  public unsetForeignKeyOnManySide(data: Record<string, any>) {
    data[this.foreignKey] = null;
    return data;
  }

  public async addIdFromOneSide(oneSideId: string, manySideId: string) {
    await this.manySideModel.getDataSource().update({id: {[Operator.eq]: manySideId}}, {[this.foreignKey]: oneSideId});
  }

  public async createAndAddFromOneSide(oneSideId: string, manySideData: any) {
    manySideData[this.foreignKey] = oneSideId;
    await this.manySideModel.getDataSource().create(manySideData);
  }

  public async removeIdFromOneSide(oneSideId: string, manySideId: string) {
    await this.manySideModel.getDataSource().update({id: {[Operator.eq]: manySideId}}, {[this.foreignKey]: oneSideId});
  }

  public async deleteRecordFromOneSide(manySideId: string) {
    await this.manySideModel.getDataSource().delete({id: {[Operator.eq]: manySideId}});
  }

  public async joinManyOnOneSide(data: Record<string, any>) {
    const records = await this.manySideModel.getDataSource().findManyFromOneRelation(this.foreignKey, data.id);
    return records;
  }

  public async joinOneOnManySide(data: Record<string, any>) {
    const targetId = data[this.foreignKey];
    if (!targetId) {
      return null;
    }
    const toOneData = await this.oneSideModel.getDataSource().findOneById(targetId);
    return isEmpty(toOneData) ? null : toOneData;
  }
}
