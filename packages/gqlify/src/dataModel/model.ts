import Field from './field';
import * as pluralize from 'pluralize';
import { capitalize, isEmpty, pickBy, mapValues, isFunction } from 'lodash';
import { IResolverObject } from 'graphql-tools';
import { DataSource } from '../dataSource/interface';
import { MutationFactory } from '../plugins/mutation';

export default class Model {
  private name: string;
  private fields: Record<string, Field>;
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

  // mutation Factory
  private createMutationFactory: MutationFactory = new MutationFactory();
  private updateMutationFactory: MutationFactory = new MutationFactory();

  constructor({
    name,
    fields,
  }: {
    name: string,
    fields?: Record<string, Field>,
  }) {
    this.name = name;
    // lowercase and singular it first
    const key = pluralize.singular(name.toLowerCase());
    this.namings = {
      plural: pluralize.plural(key),
      singular: key,
      capitalSingular: capitalize(key),
    };
    this.fields = fields || {};
  }

  public appendField(name: string, field: Field) {
    this.fields[name] = field;
  }

  public getField(name: string) {
    return this.fields[name];
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
    return pickBy(this.getFields(), field => field.isUnique());
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

  public overrideResolver(resolver: any) {
    this.resolver = resolver;
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

  // since mutationFactory is tightly bind with model schema
  // and is shared between plugins & relation hooks,
  // we put it in model.
  // todo: find a better way to share this variable
  public getCreateMutationFactory = () => {
    return this.createMutationFactory;
  };

  public getUpdateMutationFactory = () => {
    return this.updateMutationFactory;
  };
}
