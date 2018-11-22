import { Model } from '../dataModel';

export const supportToOneRelation = (model: Model): boolean => {
  const dataSource = model.getDataSource();
  return Boolean(dataSource.findOneByRelation &&
    dataSource.setToOne &&
    dataSource.unsetToOne);
};

export const supportFindOneByRelation = (model: Model): boolean => {
  return Boolean(model.getDataSource().findOneByRelation);
};
