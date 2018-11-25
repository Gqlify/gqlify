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

  // many side
  const connectOne = (data, connectId: string) => {
    data = relationImpl.setForeignKeyOnManySide(data, connectId);
    delete data[relation.targetField];
    return data;
  };

  const createOne = (data, targetData) => {
    data = relationImpl.createAndSetForeignKeyOnManySide(data, targetData);
    delete data[relation.targetField];
    return data;
  };

  const disconnectOne = data => {
    data = relationImpl.unsetForeignKeyOnManySide(data);
    delete data[relation.sourceField];
    return data;
  };

  const destroyOne = async data => {
    data = await relationImpl.destroyAndUnsetForeignKeyOnManySide(data);
    delete data[relation.sourceField];
    return data;
  };

  // todo: add cascade delete
  const hookMap: Record<string, Hook> = {
    // one side
    [relation.source.getName()]: {
      afterCreate: async data => {
        const connectIds: string[] = get(data, [relation.sourceField, 'connect']);
        const createRecords: any[] = get(data, [relation.sourceField, 'create']);

        if (connectIds) {
          await connect(data.id, connectIds);
        }

        if (createRecords) {
          await create(data.id, createRecords);
        }
      },

      // require id in where
      afterUpdate: async (where, data) => {
        const connectIds: string[] = get(data, [relation.sourceField, 'connect']);
        const createRecords: any[] = get(data, [relation.sourceField, 'create']);
        const disconnectIds: string[] = get(data, [relation.sourceField, 'disconnect']);
        const deleteIds: any[] = get(data, [relation.sourceField, 'delete']);

        if (connectIds) {
          await connect(where.id, connectIds);
        }

        if (createRecords) {
          await create(where.id, createRecords);
        }

        if (disconnectIds) {
          await disconnect(where.id, disconnectIds);
        }

        if (deleteIds) {
          await destroy(where.id, deleteIds);
        }
      },

      resolveFields: {
        [relation.sourceField]: data => relationImpl.joinManyOnOneSide(data),
      },
    },

    // many side
    [relation.target.getName()]: {
      // connect or create relation
      transformCreatePayload: async data => {
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const createData = get(data, [relation.sourceField, 'create']);
        if (connectId) {
          return connectOne(data, connectId);
        }

        if (createData) {
          return createOne(data, createData);
        }
      },

      transformUpdatePayload: async data => {
        // connect -> create -> disconnect -> delete
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const ifDisconnect: boolean = get(data, [relation.sourceField, 'disconnect']);
        const createData = get(data, [relation.sourceField, 'create']);
        const ifDelete = get(data, [relation.sourceField, 'delete']);

        if (connectId) {
          return connectOne(data, connectId);
        }

        if (createData) {
          return createOne(data, createData);
        }

        if (ifDisconnect) {
          return disconnectOne(data);
        }

        if (ifDelete) {
          return destroyOne(data);
        }
      },

      resolveFields: {
        [relation.targetField]: parent => relationImpl.joinOneOnManySide(parent),
      },
    },
  };

  return hookMap;
};
