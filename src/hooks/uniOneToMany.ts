import { ModelRelation } from '../dataModel';
import { Hook } from './interface';
import { OneToManyRelation } from '../relation';
import { get } from 'lodash';

export const createHookMap = (relation: ModelRelation): Record<string, Hook> => {
  const relationImpl = new OneToManyRelation({
    oneSideModel: relation.source,
    manySideModel: relation.target,
    oneSideField: relation.sourceField,
    manySideField: relation.targetField,
  });

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
      // todo: fix that relation fields would be inserted into data
      afterCreate: async data => {
        if (!get(data, relation.sourceField)) {
          return;
        }
        const connectWhere: Array<{id: string}> = get(data, [relation.sourceField, 'connect']);
        const createRecords: any[] = get(data, [relation.sourceField, 'create']);

        if (connectWhere) {
          const connectIds = connectWhere.map(v => v.id);
          await connect(data.id, connectIds);
        }

        if (createRecords) {
          await create(data.id, createRecords);
        }
      },

      // require id in where
      afterUpdate: async (where, data) => {
        if (!get(data, relation.sourceField)) {
          return;
        }
        const connectWhere: Array<{id: string}> = get(data, [relation.sourceField, 'connect']);
        const createRecords: any[] = get(data, [relation.sourceField, 'create']);
        const disconnectWhere: Array<{id: string}> = get(data, [relation.sourceField, 'disconnect']);
        const deleteWhere: any[] = get(data, [relation.sourceField, 'delete']);

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
      },

      resolveFields: {
        [relation.sourceField]: data => relationImpl.joinManyOnOneSide(data),
      },
    },
  };

  return hookMap;
};
