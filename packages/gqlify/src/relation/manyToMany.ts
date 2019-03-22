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

  public async addId({modelAId, modelBId}: {modelAId: string, modelBId: string}, context: any) {
    await this.modelB.getDataSource().addIdToManyRelation(
      this.modelA.getNamings().singular,
      this.modelB.getNamings().singular,
      modelAId,
      modelBId,
      context,
    );

    await this.modelA.getDataSource().addIdToManyRelation(
      this.modelB.getNamings().singular,
      this.modelA.getNamings().singular,
      modelBId,
      modelAId,
      context,
    );
  }

  public async createAndAddIdForModelA(
    {modelAId, modelBData}: {modelAId: string, modelBData: Record<string, any>}, context: any) {
    const mutation = this.modelB.getCreateMutationFactory().createMutation(modelBData);
    const record = await this.modelB.getDataSource().create(mutation);
    return this.addId({modelAId, modelBId: record.id}, context);
  }

  public async createAndAddIdForModelB(
    {modelBId, modelAData}: {modelBId: string, modelAData: Record<string, any>}, context: any) {
    const mutation = this.modelA.getCreateMutationFactory().createMutation(modelAData);
    const record = await this.modelA.getDataSource().create(mutation);
    return this.addId({modelBId, modelAId: record.id}, context);
  }

  public async removeId({modelAId, modelBId}: {modelAId: string, modelBId: string}, context: any) {
    await this.modelB.getDataSource().removeIdFromManyRelation(
      this.modelA.getNamings().singular,
      this.modelB.getNamings().singular,
      modelAId,
      modelBId,
      context,
    );

    await this.modelA.getDataSource().removeIdFromManyRelation(
      this.modelB.getNamings().singular,
      this.modelA.getNamings().singular,
      modelBId,
      modelAId,
      context,
    );
  }

  public async deleteAndRemoveIdFromModelA({modelAId, modelBId}: {modelAId: string, modelBId: string}, context: any) {
    await this.modelA.getDataSource().delete({id: {[Operator.eq]: modelAId}});
    return this.removeId({modelAId, modelBId}, context);
  }

  public async deleteAndRemoveIdFromModelB({modelAId, modelBId}: {modelAId: string, modelBId: string}, context: any) {
    await this.modelB.getDataSource().delete({id: {[Operator.eq]: modelBId}});
    return this.removeId({modelAId, modelBId}, context);
  }

  // when joining data from modelB to modelA, the relationship is save at modelA datasource
  public async joinModelA(modelBId: string, context: any) {
    const records = await this.modelA.getDataSource().findManyFromManyRelation(
      this.modelB.getNamings().singular,
      this.modelA.getNamings().singular,
      modelBId,
      context,
    );
    return isEmpty(records) ? [] : records.filter(record => !isNil(record));
  }

  // when joining data from modelA to modelB, the relationship is save at modelB datasource
  public async joinModelB(modelAId: string, context: any) {
    const records = await this.modelB.getDataSource().findManyFromManyRelation(
      this.modelA.getNamings().singular,
      this.modelB.getNamings().singular,
      modelAId,
      context,
    );
    return isEmpty(records) ? [] : records.filter(record => !isNil(record));
  }
}
