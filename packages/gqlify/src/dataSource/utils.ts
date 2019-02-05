import { Model } from '../dataModel';
import { Mutation } from './interface';

export const supportFindOneByRelation = (model: Model): boolean => {
  return Boolean(model.getDataSource().findOneByRelation);
};

export const createPayloadOnlyMutation = (payload: any): Mutation => {
  return {
    getData: () => payload,
    // tslint:disable-next-line:no-empty
    addField: () => {},
    getArrayOperations: () => [],
  };
};
