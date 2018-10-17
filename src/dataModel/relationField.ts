import Field from './field';
import Model from './model';
import { GraphqlType } from './type';

export default class RelationField extends Field {
  private relationTo: Model;

  constructor({
    name,
    relationTo,
    nonNull,
    list,
    nonNullItem,
    readOnly,
  }: {
    name: string,
    relationTo: Model,
    nonNull?: boolean,
    list?: boolean,
    nonNullItem?: boolean,
    readOnly?: boolean,
  }) {
    super({
      name,
      type: GraphqlType.RELATION,
      nonNull,
      list,
      nonNullItem,
      readOnly,
    });

    this.relationTo = relationTo;
  }

  public getTypename() {
    // typename of relationField should refer to the model relation to
    return this.getRelationTo().getTypename();
  }

  public getRelationTo() {
    return this.relationTo;
  }

  public getFields() {
    return this.relationTo.getFields();
  }
}
