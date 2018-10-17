import { Context } from './plugins/interface';
import { values, reduce } from 'lodash';

export default class RootNode {
  private queryMap: Record<string, string> = {};
  private mutationMap: Record<string, string> = {};
  private typeMap: Record<string, string> = {};
  private inputMap: Record<string, string> = {};
  private scalarMap: Record<string, string> = {};
  private interfaceMap: Record<string, string> = {};
  private enumMap: Record<string, string[]> = {};
  private unionMap: Record<string, string[]> = {};

  public addQuery(name: string, content: string) {
    this.queryMap[name] = content;
  }

  public addMutation(name: string, content: string) {
    this.mutationMap[name] = content;
  }

  public addType(typename: string, content: string) {
    this.typeMap[typename] = content;
  }

  public addInput(name: string, content: string) {
    this.inputMap[name] = content;
  }

  public addScalar(typename: string) {
    this.scalarMap[typename] = typename;
  }

  public addInterface(name: string, content: string) {
    this.interfaceMap[name] = content;
  }

  public addEnum(name: string, elements: string[]) {
    this.enumMap[name] = elements;
  }

  public addUnion(name: string, types: string[]) {
    this.unionMap[name] = types;
  }

  public buildRoot() {
    return `
      ${this.stringifyRecord(this.scalarMap)}
      ${this.stringifyEnum()}
      ${this.stringifyRecord(this.interfaceMap)}
      ${this.stringifyRecord(this.typeMap)}
      ${this.stringifyUnion()}
      ${this.stringifyRecord(this.inputMap)}

      type Query {
        ${this.buildQuery()}
      }

      type Mutation {
        ${this.buildMutation()}
      }
    `;
  }

  public buildQuery() {
    return values(this.queryMap).join(' ');
  }

  public buildMutation() {
    return values(this.mutationMap).join(' ');
  }

  private stringifyRecord(record: Record<string, string>) {
    return values(record).join(' ');
  }

  private stringifyEnum() {
    return reduce(this.enumMap, (result, value, key) => {
      result += `
        enum ${key}: {${value.join(' ')}}
      `;
      return result;
    }, '');
  }

  private stringifyUnion() {
    return reduce(this.unionMap, (result, value, key) => {
      result += `
        union ${key} = {${value.join('|')}}
      `;
      return result;
    }, '');
  }
}
