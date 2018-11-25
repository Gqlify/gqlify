import { ModelRelation } from '../dataModel';
import { Hook } from './interface';
import { ManyToManyRelation } from '../relation';
import { get } from 'lodash';

export const createHookMap = (relation: ModelRelation): Record<string, Hook> => {
  const relationImpl = new ManyToManyRelation({
    modelA: relation.source,
    modelB: relation.target,
    modelAField: relation.sourceField,
    modelBField: relation.targetField,
  });

  // A side
  const createFromModelA = (sourceId: string, records: any[]) => {
    return Promise.all(records.map(record => relationImpl.createAndAddIdToModelA(sourceId, record)));
  };

  const connectFromModelA = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.addIdToModelA(sourceId, id)));
  };

  const disconnectFromModelA = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.removeIdFromModelA(sourceId, id)));
  };

  const destroyFromModelA = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.deleteAndRemoveIdFromModelA(sourceId, id)));
  };

  // B side
  const createFromModelB = (sourceId: string, records: any[]) => {
    return Promise.all(records.map(record => relationImpl.createAndAddIdToModelB(sourceId, record)));
  };

  const connectFromModelB = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.addIdToModelB(sourceId, id)));
  };

  const disconnectFromModelB = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.removeIdFromModelB(sourceId, id)));
  };

  const destroyFromModelB = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.deleteAndRemoveIdFromModelB(sourceId, id)));
  };

  const hookMap: Record<string, Hook> = {
    // todo: add cascade delete support
    [relationImpl.getModelA().getName()]: {
      afterCreate: async data => {
        const connectIds: string[] = get(data, [relation.sourceField, 'connect']);
        const createRecords: any[] = get(data, [relation.sourceField, 'create']);

        if (connectIds) {
          await connectFromModelA(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelA(data.id, createRecords);
        }
      },

      // require id in where
      afterUpdate: async (where, data) => {
        const connectIds: string[] = get(data, [relation.sourceField, 'connect']);
        const createRecords: any[] = get(data, [relation.sourceField, 'create']);
        const disconnectIds: string[] = get(data, [relation.sourceField, 'disconnect']);
        const deleteIds: any[] = get(data, [relation.sourceField, 'delete']);

        if (connectIds) {
          await connectFromModelA(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelA(data.id, createRecords);
        }

        if (disconnectIds) {
          await disconnectFromModelA(where.id, disconnectIds);
        }

        if (deleteIds) {
          await destroyFromModelA(where.id, deleteIds);
        }
      },

      resolveFields: {
        [relation.sourceField]: data => relationImpl.joinModelB(data.id),
      },
    },

    // ref side
    [relationImpl.getModelB().getName()]: {
      afterCreate: async data => {
        const connectIds: string[] = get(data, [relation.sourceField, 'connect']);
        const createRecords: any[] = get(data, [relation.sourceField, 'create']);

        if (connectIds) {
          await connectFromModelB(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelB(data.id, createRecords);
        }
      },

      // require id in where
      afterUpdate: async (where, data) => {
        const connectIds: string[] = get(data, [relation.sourceField, 'connect']);
        const createRecords: any[] = get(data, [relation.sourceField, 'create']);
        const disconnectIds: string[] = get(data, [relation.sourceField, 'disconnect']);
        const deleteIds: any[] = get(data, [relation.sourceField, 'delete']);

        if (connectIds) {
          await connectFromModelB(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelB(data.id, createRecords);
        }

        if (disconnectIds) {
          await disconnectFromModelB(where.id, disconnectIds);
        }

        if (deleteIds) {
          await destroyFromModelB(where.id, deleteIds);
        }
      },

      resolveFields: {
        [relation.sourceField]: data => relationImpl.joinModelA(data.id),
      },
    },
  };

  return hookMap;
};
