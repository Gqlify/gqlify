import Field from './field';
import * as pluralize from 'pluralize';
import { capitalize } from 'lodash';

export default class Model {
  private name: string;
  private fields: Field[];
  private namings: {
    plural: string;
    singular: string;
    capitalSingular: string;
  };

  constructor({
    name,
    fields,
  }: {
    name: string,
    fields?: Field[],
  }) {
    this.name = name;
    // lowercase and singular it first
    const key = pluralize.singular(name.toLowerCase());
    this.namings = {
      plural: pluralize.plural(key),
      singular: key,
      capitalSingular: capitalize(key),
    };
    this.fields = fields || [];
  }

  public appendField(field: Field) {
    this.fields.push(field);
  }

  public getFields() {
    return this.fields;
  }

  public getName() {
    return this.name;
  }

  public getNamings() {
    return this.namings;
  }

  public getTypename() {
    // use capitalSingular as typename
    return this.namings.capitalSingular;
  }

  public getUniqueFields() {
    return this.fields.filter(field => field.isUnique());
  }
}
