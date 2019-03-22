import { isEmpty, sortBy, find } from 'lodash';
import { Model, RelationType } from '../dataModel';
import { supportFindOneByRelation } from '../dataSource/utils';
import { Operator } from '../dataSource/interface';
import { Relation, WithForeignKey } from './interface';

enum relationType {
  belongsTo = 'belongsTo',
  hasOne = 'hasOne',
}

const createForeignKey = (field: string, model: Model) =>
  `${field.toLowerCase()}${model.getNamings().capitalSingular}Id`;

// Bidirectional One-to-One
export default class BiOneToOne implements Relation, WithForeignKey {
  private owningSideModel: Model;
  private owningSideField: string;
  private refSideModel: Model;
  private refSideField: string;
  private foreignKey: string;

  constructor({
    modelA,
    modelB,
    modelAField,
    modelBField,
    foreignKey,
    owningSideModelName,
  }: {
    modelA: Model,
    modelB: Model,
    modelAField: string,
    modelBField: string,
    foreignKey?: string,
    owningSideModelName?: string,
  }) {
    // determine which side we save the foreign key
    // if both side dont support findOneByRelation, throw
    if (!supportFindOneByRelation(modelA) && !supportFindOneByRelation(modelB)) {
      throw new Error(`Both ${modelA.getName()} & ${modelB.getName()} dont support findOneByRelation`);
    }

    if (owningSideModelName) {
      const owningSideModelWithField = find([
        {model: modelA, field: modelAField},
        {model: modelB, field: modelBField},
      ], obj => obj.model.getName() === owningSideModelName);
      if (!owningSideModelWithField) {
        throw new Error(`no model found from name \`${owningSideModelName}\``);
      }

      if (!supportFindOneByRelation(owningSideModelWithField.model)) {
        throw new Error(`specified model \`${owningSideModelName}\` dont support findOneByRelation`);
      }

      this.owningSideModel = owningSideModelWithField.model;
      this.owningSideField = owningSideModelWithField.field;

      // other side
      const otherSideModelField = owningSideModelWithField.model === modelA
        ? {model: modelB, field: modelBField}
        : {model: modelA, field: modelAField};
      this.refSideModel = otherSideModelField.model;
      this.refSideField = otherSideModelField.field;
    } else {
      // prefer the first-order model (alphabetically) to keep foreign key
      const orderedModelWithField = sortBy([
        {model: modelA, field: modelAField},
        {model: modelB, field: modelBField},
      ], obj => obj.model.getName());

      const firstModelWithField = orderedModelWithField[0];
      const secondModelWithField = orderedModelWithField[1];
      if (supportFindOneByRelation(firstModelWithField.model)) {
        this.owningSideModel = firstModelWithField.model;
        this.owningSideField = firstModelWithField.field;
        this.refSideModel = secondModelWithField.model;
        this.refSideField = secondModelWithField.field;
      } else {
        this.owningSideModel = secondModelWithField.model;
        this.owningSideField = secondModelWithField.field;
        this.refSideModel = firstModelWithField.model;
        this.refSideField = firstModelWithField.field;
      }
    }

    this.foreignKey = foreignKey || createForeignKey(this.owningSideField, this.refSideModel);
  }

  public getType() {
    return RelationType.biOneToOne;
  }

  public getForeignKey() {
    return this.foreignKey;
  }

  public getForeignKeyConfig() {
    return [{
      model: this.owningSideModel,
      foreignKey: this.getForeignKey(),
    }];
  }

  public getOwningSide() {
    return this.owningSideModel;
  }

  public getOwningSideField() {
    return this.owningSideField;
  }

  public getRefSide() {
    return this.refSideModel;
  }

  public getRefSideField() {
    return this.refSideField;
  }

  public setForeignKeyOnOwningSide(targetId: string) {
    return {[this.foreignKey]: targetId};
  }

  public async createAndSetForeignKeyOnOwningSide(targetData: Record<string, any>, context: any) {
    const mutation = this.refSideModel.getCreateMutationFactory().createMutation(targetData);
    const created = await this.refSideModel.getDataSource().create(mutation, context);
    return this.setForeignKeyOnOwningSide(created.id);
  }

  public unsetForeignKeyOnOwningSide() {
    return {[this.foreignKey]: null};
  }

  public async deleteAndUnsetForeignKeyOnOwningSide(data: Record<string, any>, context: any) {
    const foreignId = data[this.foreignKey];
    if (!foreignId) {
      return;
    }
    await this.refSideModel.getDataSource().delete({id: {[Operator.eq]: foreignId}}, context);
    return this.unsetForeignKeyOnOwningSide();
  }

  public async connectOnRefSide(refSideId: string, owningSideId: string, context: any) {
    const owningSideDataSource = this.owningSideModel.getDataSource();
    // add refSideId to owningSide record
    await owningSideDataSource.updateOneRelation(owningSideId, this.foreignKey, refSideId, context);
  }

  public async createAndConnectOnRefSide(refSideId: string, data: Record<string, any>, context: any) {
    data[this.foreignKey] = refSideId;
    const mutation = this.owningSideModel.getCreateMutationFactory().createMutation(data);
    await this.owningSideModel.getDataSource().create(mutation, context);
  }

  public async disconnectOnRefSide(refSideId: string, context: any) {
    const owningSideDataSource = this.owningSideModel.getDataSource();
    const owningSideRecord = await owningSideDataSource.findOneByRelation(this.foreignKey, refSideId, context);
    const mutation = this.owningSideModel.getUpdateMutationFactory().createMutation({[this.foreignKey]: null});
    await owningSideDataSource.update({id: {[Operator.eq]: owningSideRecord.id}}, mutation, context);
  }

  public async deleteAndDisconnectOnRefSide(refSideId: string, context: any) {
    // simply delete the owning side
    const owningSideDataSource = this.owningSideModel.getDataSource();
    const owningSideRecord = await owningSideDataSource.findOneByRelation(this.foreignKey, refSideId, context);
    return owningSideDataSource.delete({id: {[Operator.eq]: owningSideRecord.id}}, context);
  }

  public async joinOnOwningSide(data: Record<string, any>, context: any) {
    const targetId = data[this.foreignKey];
    if (!targetId) {
      return null;
    }
    const toOneData = await this.refSideModel.getDataSource().findOneById(targetId, context);
    return isEmpty(toOneData) ? null : toOneData;
  }

  public async joinOnRefSide(data: Record<string, any>, context: any) {
    const toOneData = await this.owningSideModel.getDataSource().findOneByRelation(this.foreignKey, data.id, context);
    return isEmpty(toOneData) ? null : toOneData;
  }
}
