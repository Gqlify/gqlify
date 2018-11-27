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
        if (!get(data, relationImpl.getModelAField())) {
          return;
        }
        const connectWhere: Array<{id: string}> = get(data, [relationImpl.getModelAField(), 'connect']);
        const createRecords: any[] = get(data, [relationImpl.getModelAField(), 'create']);

        if (connectWhere) {
          const connectIds = connectWhere.map(v => v.id);
          await connectFromModelA(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelA(data.id, createRecords);
        }
      },

      // require id in where
      afterUpdate: async (where, data) => {
        if (!get(data, relationImpl.getModelAField())) {
          return;
        }
        const connectWhere: Array<{id: string}> = get(data, [relationImpl.getModelAField(), 'connect']);
        const createRecords: any[] = get(data, [relationImpl.getModelAField(), 'create']);
        const disconnectWhere: Array<{id: string}> = get(data, [relationImpl.getModelAField(), 'disconnect']);
        const deleteWhere: Array<{id: string}> = get(data, [relationImpl.getModelAField(), 'delete']);

        if (connectWhere) {
          const connectIds = connectWhere.map(v => v.id);
          await connectFromModelA(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelA(data.id, createRecords);
        }

        if (disconnectWhere) {
          const disconnectIds = disconnectWhere.map(v => v.id);
          await disconnectFromModelA(where.id, disconnectIds);
        }

        if (deleteWhere) {
          const deleteIds = deleteWhere.map(v => v.id);
          await destroyFromModelA(where.id, deleteIds);
        }
      },

      resolveFields: {
        [relationImpl.getModelAField()]: data => relationImpl.joinModelB(data.id),
      },
    },

    // ref side
    [relationImpl.getModelB().getName()]: {
      afterCreate: async data => {
        if (!get(data, relationImpl.getModelBField())) {
          return;
        }
        const connectWhere: Array<{id: string}> = get(data, [relationImpl.getModelBField(), 'connect']);
        const createRecords: any[] = get(data, [relationImpl.getModelBField(), 'create']);

        if (connectWhere) {
          const connectIds = connectWhere.map(v => v.id);
          await connectFromModelB(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelB(data.id, createRecords);
        }
      },

      // require id in where
      afterUpdate: async (where, data) => {
        if (!get(data, relationImpl.getModelBField())) {
          return;
        }
        const connectWhere: Array<{id: string}> = get(data, [relationImpl.getModelBField(), 'connect']);
        const createRecords: any[] = get(data, [relationImpl.getModelBField(), 'create']);
        const disconnectWhere: Array<{id: string}> = get(data, [relationImpl.getModelBField(), 'disconnect']);
        const deleteWhere: Array<{id: string}> = get(data, [relationImpl.getModelBField(), 'delete']);

        if (connectWhere) {
          const connectIds = connectWhere.map(v => v.id);
          await connectFromModelB(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelB(data.id, createRecords);
        }

        if (disconnectWhere) {
          const disconnectIds = disconnectWhere.map(v => v.id);
          await disconnectFromModelB(where.id, disconnectIds);
        }

        if (deleteWhere) {
          const deleteIds = deleteWhere.map(v => v.id);
          await destroyFromModelB(where.id, deleteIds);
        }
      },

      resolveFields: {
        [relationImpl.getModelBField()]: data => relationImpl.joinModelA(data.id),
      },
    },
  };

  return hookMap;
};
