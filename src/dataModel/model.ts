import Field from './field';
import * as pluralize from 'pluralize';
import { capitalize, isEmpty } from 'lodash';
import { IResolverObject } from 'graphql-tools';
import { DataSource } from '../dataSource/interface';

export default class Model {
  private name: string;
  private fields: Field[];
  private fieldMap: Record<string, Field> = {};
  private namings: {
    plural: string;
    singular: string;
    capitalSingular: string;
  };

  // data
  private dataSource: DataSource;

  // resolver
  private resolver: IResolverObject = {};

  // other metadata
  private metadata: Record<string, any> = {};

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
    this.fields.forEach(field => {
      this.fieldMap[field.getName()] = field;
    });
  }

  public appendField(field: Field) {
    this.fieldMap[field.getName()] = field;
    this.fields.push(field);
  }

  public getField(name: string) {
    return this.fieldMap[name];
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

  public getMetadata(key: string) {
    return this.metadata[key];
  }

  public setMetadata(key: string, value: any) {
    return this.metadata[key] = value;
  }

  public setFieldResolver(field: string, resolver: any) {
    this.resolver[field] = resolver;
  }

  public getResolver() {
    return isEmpty(this.resolver) ? null : this.resolver;
  }

  public setDataSource(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  public getDataSource() {
    return this.dataSource;
  }
}
