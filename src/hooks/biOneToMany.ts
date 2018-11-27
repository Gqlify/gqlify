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
        if (!get(data, [relationImpl.getOneSideField()])) {
          return;
        }
        const connectWhere: Array<{id: string}> = get(data, [relationImpl.getOneSideField(), 'connect']);
        const createRecords: any[] = get(data, [relationImpl.getOneSideField(), 'create']);

        if (connectWhere) {
          const connectIds = connectWhere.map(where => where.id);
          await connect(data.id, connectIds);
        }

        if (createRecords) {
          await create(data.id, createRecords);
        }
      },

      // require id in where
      afterUpdate: async (where, data) => {
        if (!get(data, [relationImpl.getOneSideField()])) {
          return;
        }
        const connectWhere: Array<{id: string}> = get(data, [relationImpl.getOneSideField(), 'connect']);
        const createRecords: any[] = get(data, [relationImpl.getOneSideField(), 'create']);
        const disconnectWhere: Array<{id: string}> = get(data, [relationImpl.getOneSideField(), 'disconnect']);
        const deleteWhere: Array<{id: string}> = get(data, [relationImpl.getOneSideField(), 'delete']);

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
        [relationImpl.getOneSideField()]: data => relationImpl.joinManyOnOneSide(data),
      },
    },

    // many side
    [relation.target.getName()]: {
      // connect or create relation
      transformCreatePayload: async data => {
        if (!get(data, [relationImpl.getManySideField()])) {
          return;
        }
        const connectId = get(data, [relationImpl.getManySideField(), 'connect', 'id']);
        const createData = get(data, [relationImpl.getManySideField(), 'create']);
        if (connectId) {
          return connectOne(data, connectId);
        }

        if (createData) {
          return createOne(data, createData);
        }
      },

      transformUpdatePayload: async data => {
        if (!get(data, [relationImpl.getManySideField()])) {
          return;
        }
        // connect -> create -> disconnect -> delete
        const connectId = get(data, [relationImpl.getManySideField(), 'connect', 'id']);
        const ifDisconnect: boolean = get(data, [relationImpl.getManySideField(), 'disconnect']);
        const createData = get(data, [relationImpl.getManySideField(), 'create']);
        const ifDelete = get(data, [relationImpl.getManySideField(), 'delete']);

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
        [relationImpl.getManySideField()]: parent => relationImpl.joinOneOnManySide(parent),
      },
    },
  };

  return hookMap;
};
