import { isEmpty, isNil } from 'lodash';
import { Model, RelationType } from '../dataModel';
import { Operator } from '../dataSource/interface';
import { Relation } from './interface';

// many-to-many
export default class ManyToMany implements Relation {
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

  public getType() {
    return RelationType.biManyToMany;
  }

  public getModelA() {
    return this.modelA;
  }

  public getModelAField() {
    return this.modelAField;
  }

  public getModelB() {
    return this.modelB;
  }

  public getModelBField() {
    return this.modelBField;
  }

  public async addId({modelAId, modelBId}: {modelAId: string, modelBId: string}) {
    await this.modelA.getDataSource().addIdToManyRelation(
      this.modelA.getNamings().singular,
      this.modelB.getNamings().singular,
      modelAId,
      modelBId,
    );

    await this.modelB.getDataSource().addIdToManyRelation(
      this.modelB.getNamings().singular,
      this.modelA.getNamings().singular,
      modelBId,
      modelAId,
    );
  }

  public async createAndAddIdForModelA({modelAId, modelBData}: {modelAId: string, modelBData: Record<string, any>}) {
    const record = await this.modelB.getDataSource().create(modelBData);
    return this.addId({modelAId, modelBId: record.id});
  }

  public async createAndAddIdForModelB({modelBId, modelAData}: {modelBId: string, modelAData: Record<string, any>}) {
    const record = await this.modelA.getDataSource().create(modelAData);
    return this.addId({modelBId, modelAId: record.id});
  }

  public async removeId({modelAId, modelBId}: {modelAId: string, modelBId: string}) {
    await this.modelA.getDataSource().removeIdFromManyRelation(
      this.modelA.getNamings().singular,
      this.modelB.getNamings().singular,
      modelAId,
      modelBId,
    );

    await this.modelB.getDataSource().removeIdFromManyRelation(
      this.modelB.getNamings().singular,
      this.modelA.getNamings().singular,
      modelBId,
      modelAId,
    );
  }

  public async deleteAndRemoveIdFromModelA({modelAId, modelBId}: {modelAId: string, modelBId: string}) {
    await this.modelA.getDataSource().delete({id: {[Operator.eq]: modelAId}});
    return this.removeId({modelAId, modelBId});
  }

  public async deleteAndRemoveIdFromModelB({modelAId, modelBId}: {modelAId: string, modelBId: string}) {
    await this.modelB.getDataSource().delete({id: {[Operator.eq]: modelBId}});
    return this.removeId({modelAId, modelBId});
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
