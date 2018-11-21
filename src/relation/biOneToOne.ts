import { isEmpty } from 'lodash';
import { Model } from '../dataModel';
import { supportFindOneByRelation } from '../dataSource/utils';
import { Operator } from '../dataSource/interface';

enum relationType {
  belongsTo = 'belongsTo',
  hasOne = 'hasOne',
}

const createForeignKey = (field: string, model: Model) =>
  `${field.toLowerCase()}${model.getNamings().capitalSingular}Id`;

// Bidirectional One-to-One
export default class BiOneToOne {
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
  }: {
    modelA: Model,
    modelB: Model,
    modelAField: string,
    modelBField: string,
  }) {
    // determine which side we save the foreign key
    // if both side dont support findOneByRelation, throw
    if (!supportFindOneByRelation(modelA) && !supportFindOneByRelation(modelB)) {
      throw new Error(`Both ${modelA.getName()} & ${modelB.getName()} dont support findOneByRelation`);
    }

    // prefer modelA to keep foreign key
    if (supportFindOneByRelation(modelA)) {
      this.owningSideModel = modelA;
      this.owningSideField = modelAField;
      this.refSideModel = modelB;
      this.refSideField = modelBField;
    } else {
      this.owningSideModel = modelB;
      this.owningSideField = modelBField;
      this.refSideModel = modelA;
      this.refSideField = modelAField;
    }
    this.foreignKey = createForeignKey(this.owningSideField, this.refSideModel);
  }

  public setForeignKeyOnOwningSide(data: Record<string, any>, targetId: string) {
    data[this.foreignKey] = targetId;
    return data;
  }

  public async createAndSetForeignKeyOnOwningSide(data: Record<string, any>, targetData: Record<string, any>) {
    const created = await this.refSideModel.getDataSource().create(targetData);
    return this.setForeignKeyOnOwningSide(data, created.id);
  }

  public unsetForeignKeyOnOwningSide(data: Record<string, any>) {
    data[this.foreignKey] = null;
    return data;
  }

  public async connectOnRefSide(refSideId: string, owningSideId: string) {
    const owningSideDataSource = this.owningSideModel.getDataSource();
    // add refSideId to owningSide record
    await owningSideDataSource.update({id: {[Operator.eq]: owningSideId}}, {[this.foreignKey]: refSideId});
  }

  public async createAndConnectOnRefSide(refSideId: string, data: Record<string, any>) {
    data[this.foreignKey] = refSideId;
    await this.owningSideModel.getDataSource().create(data);
  }

  public async disconnectOnRefSide(refSideId: string) {
    const owningSideDataSource = this.owningSideModel.getDataSource();
    const owningSideRecord = await owningSideDataSource.findOneByRelation(this.foreignKey, refSideId);
    await owningSideDataSource.update({id: {[Operator.eq]: owningSideRecord.id}}, {[this.foreignKey]: null});
  }

  public async joinOnOwningSide(data: Record<string, any>) {
    const targetId = data[this.foreignKey];
    if (!targetId) {
      return null;
    }
    const toOneData = await this.refSideModel.getDataSource().findOneById(targetId);
    return isEmpty(toOneData) ? null : toOneData;
  }

  public async joinOnRefSide(data: Record<string, any>) {
    const toOneData = await this.owningSideModel.getDataSource().findOneByRelation(this.foreignKey, data.id);
    return isEmpty(toOneData) ? null : toOneData;
  }
}
