// tslint:disable:max-classes-per-file
import { Mutation } from '../dataSource/interface';
import { omit, pick, isEmpty, forEach, get } from 'lodash';

const mutationWithoutArrayField = (originPayload: any) => {
  const payload = {...originPayload};
  return {
    getData: () => payload,
    addField: (name: string, value: any) => { payload[name] = value; },
    getArrayOperations: () => [],
  };
};

export class PluginMutation implements Mutation {
  private payload: any;
  private arrayFields: string[];

  constructor(payload: any, arrayFields: string[]) {
    // copy payload to avoid mutation to referenced object
    this.payload = {...payload};
    this.arrayFields = arrayFields;
  }

  public getData = () => {
    return omit(this.payload, this.arrayFields);
  };

  public addField = (name: string, value: any) => {
    this.payload[name] = value;
  };

  public getArrayOperations = () => {
    const arrayFieldData = pick(this.payload, this.arrayFields);
    const operations = [];
    forEach(arrayFieldData, (operationValue, fieldName) => {
      const value = get(operationValue, 'set');
      if (!value) {
        return;
      }
      operations.push({
        fieldName,
        operator: 'set',
        value,
      });
    });

    return operations;
  };
}

export class MutationFactory {
  private arrayFieldMarks: Record<string, true> = {};

  public markArrayField = (field: string) => {
    this.arrayFieldMarks[field] = true;
  };

  public createMutation = (payload: any): Mutation => {
    if (isEmpty(this.arrayFieldMarks)) {
      return mutationWithoutArrayField(payload);
    }

    const arrayFields = Object.keys(this.arrayFieldMarks);
    const mutation: Mutation = new PluginMutation(payload, arrayFields);
    return mutation;
  };
}
