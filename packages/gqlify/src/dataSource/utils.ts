import { Model } from '../dataModel';

export const supportFindOneByRelation = (model: Model): boolean => {
  return Boolean(model.getDataSource().findOneByRelation);
};
