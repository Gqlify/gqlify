import { ModelRelation } from '../dataModel';
import { Hook } from './interface';
import { OneToManyRelation } from '../relation';
import { get, omit } from 'lodash';

export const createHookMap = (relation: ModelRelation): Record<string, Hook> => {
  const relationImpl = new OneToManyRelation({
    oneSideModel: relation.source,
    manySideModel: relation.target,
    oneSideField: relation.sourceField,
    manySideField: relation.targetField,
  });

  const oneSideField = relationImpl.getOneSideField();

  const create = (sourceId: string, records: any[]) => {
    return Promise.all(records.map(record => relationImpl.createAndAddFromOneSide(sourceId, record)));
  };

  const connect = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.addIdFromOneSide(sourceId, id)));
  };

  const disconnect = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.removeIdFromOneSide(sourceId, id)));
  };

  const destroy = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.addIdFromOneSide(sourceId, id)));
  };

  // todo: add cascade delete
  const hookMap: Record<string, Hook> = {
    // one side
    [relation.source.getName()]: {
      wrapCreate: async (context, createOperation) => {
        const {data} = context;
        const relationData = get(data, oneSideField);
        if (!relationData) {
          return createOperation();
        }

        // create data
        const dataWithoutRelation = omit(data, oneSideField);
        context.data = dataWithoutRelation;
        await createOperation();
        const created  = context.response;

        // bind relation
        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');

        if (connectWhere) {
          const connectIds = connectWhere.map(v => v.id);
          await connect(created.id, connectIds);
        }

        if (createRecords) {
          await create(created.id, createRecords);
        }
      },

      // require id in where
      wrapUpdate: async (context, updateOperation) => {
        const {where, data} = context;
        const relationData = get(data, oneSideField);
        if (!relationData) {
          return updateOperation();
        }

        // update first
        const dataWithoutRelation = omit(data, oneSideField);
        context.data = dataWithoutRelation;
        await updateOperation();
        const updated  = context.response;

        // bind relation
        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');
        const disconnectWhere: Array<{id: string}> = get(relationData, 'disconnect');
        const deleteWhere: any[] = get(relationData, 'delete');

        if (connectWhere) {
          const connectIds = connectWhere.map(v => v.id);
          await connect(where.id, connectIds);
        }

        if (createRecords) {
          await create(where.id, createRecords);
        }

        if (disconnectWhere) {
          const disconnectIds = disconnectWhere.map(v => v.id);
          await disconnect(where.id, disconnectIds);
        }

        if (deleteWhere) {
          const deleteIds = deleteWhere.map(v => v.id);
          await destroy(where.id, deleteIds);
        }

        return updated;
      },

      resolveFields: {
        [relation.sourceField]: data => relationImpl.joinManyOnOneSide(data),
      },
    },
  };

  return hookMap;
};
