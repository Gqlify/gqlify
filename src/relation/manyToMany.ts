import { isEmpty, isNil } from 'lodash';
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

// many-to-many
export default class ManyToMany {
  private modelA: Model;
  private modelB: Model;
  private modelAField: string;
  private modelBField: string;

  constructor({
    modelA,
    modelB,
    modelAField,
    modelBField,
  }: {
    modelA: Model,
    modelB: Model,
    modelAField: string,
    modelBField?: string,
  }) {
    this.modelA = modelA;
    this.modelB = modelB;
    this.modelAField = modelAField;
    this.modelBField = modelBField;
  }

  public getModelA() {
    return this.modelA;
  }

  public getModelB() {
    return this.modelB;
  }

  public async addIdToModelA(modelAId: string, modelBId: string) {
    return this.modelA.getDataSource().addIdToManyRelation(
      this.modelA.getNamings().singular,
      this.modelB.getNamings().singular,
      modelAId,
      modelBId,
    );
  }

  public async addIdToModelB(modelBId: string, modelAId: string) {
    return this.modelB.getDataSource().addIdToManyRelation(
      this.modelB.getNamings().singular,
      this.modelA.getNamings().singular,
      modelBId,
      modelAId,
    );
  }

  public async createAndAddIdToModelA(modelAId: string, modelBData: Record<string, any>) {
    const modelBRecord = await this.modelB.getDataSource().create(modelBData);
    return this.addIdToModelA(modelAId, modelBRecord.id);
  }

  public async createAndAddIdToModelB(modelBId: string, modelAData: Record<string, any>) {
    const modelARecord = await this.modelA.getDataSource().create(modelAData);
    return this.addIdToModelB(modelBId, modelARecord.id);
  }

  public async removeIdFromModelA(modelAId: string, modelBId: string) {
    return this.modelA.getDataSource().removeIdFromManyRelation(
      this.modelA.getNamings().singular,
      this.modelB.getNamings().singular,
      modelAId,
      modelBId,
    );
  }

  public async removeIdFromModelB(modelBId: string, modelAId: string) {
    return this.modelB.getDataSource().removeIdFromManyRelation(
      this.modelB.getNamings().singular,
      this.modelA.getNamings().singular,
      modelBId,
      modelAId,
    );
  }

  public async deleteAndRemoveIdFromModelA(modelBId: string, modelAId: string) {
    await this.modelB.getDataSource().delete({id: {[Operator.eq]: modelBId}});
    return this.removeIdFromModelA(modelAId, modelBId);
  }

  public async deleteAndRemoveIdFromModelB(modelAId: string, modelBId: string) {
    await this.modelA.getDataSource().delete({id: {[Operator.eq]: modelAId}});
    return this.removeIdFromModelB(modelBId, modelAId);
  }

  public async joinModelA(modelBId: string) {
    const records = await this.modelA.getDataSource().findManyFromManyRelation(
      this.modelB.getNamings().singular,
      this.modelA.getNamings().singular,
      modelBId,
    );
    return isEmpty(records) ? [] : records.filter(record => !isNil(record));
  }

  public async joinModelB(modelAId: string) {
    const records = await this.modelB.getDataSource().findManyFromManyRelation(
      this.modelA.getNamings().singular,
      this.modelB.getNamings().singular,
      modelAId,
    );
    return isEmpty(records) ? [] : records.filter(record => !isNil(record));
  }
}
