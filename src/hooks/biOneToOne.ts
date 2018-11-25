import { ModelRelation } from '../dataModel';
import { Hook } from './interface';
import { BiOneToOneRelation } from '../relation';
import { get } from 'lodash';

export const createHookMap = (relation: ModelRelation): Record<string, Hook> => {
  const relationImpl = new BiOneToOneRelation({
    modelA: relation.source,
    modelB: relation.target,
    modelAField: relation.sourceField,
    modelBField: relation.targetField,
  });

  // owningSide
  const connectOwningSide = (data, connectId: string) => {
    data = relationImpl.setForeignKeyOnOwningSide(data, connectId);
    delete data[relationImpl.getOwningSideField()];
    return data;
  };

  const createOwningSide = (data, targetData) => {
    data = relationImpl.createAndSetForeignKeyOnOwningSide(data, targetData);
    delete data[relationImpl.getOwningSideField()];
    return data;
  };

  const disconnectOwningSide = data => {
    data = relationImpl.unsetForeignKeyOnOwningSide(data);
    delete data[relationImpl.getOwningSideField()];
    return data;
  };

  const destroyOwningSide = async data => {
    data = await relationImpl.deleteAndUnsetForeignKeyOnOwningSide(data);
    delete data[relationImpl.getOwningSideField()];
    return data;
  };

  // refSide
  const connectRefSide = async (refSideId: string, owningSideId: string) => {
    return relationImpl.connectOnRefSide(refSideId, owningSideId);
  };

  const createRefSide = (refSideId: string, targetData) => {
    return relationImpl.createAndConnectOnRefSide(refSideId, targetData);
  };

  const disconnectRefSide = data => {
    data = relationImpl.disconnectOnRefSide(data);
    delete data[relationImpl.getRefSideField()];
    return data;
  };

  const destroyRefSide = async data => {
    data = await relationImpl.deleteAndUnsetForeignKeyOnOwningSide(data);
    delete data[relationImpl.getRefSideField()];
    return data;
  };

  const hookMap: Record<string, Hook> = {
    // todo: add cascade delete support
    [relationImpl.getOwningSide().getName()]: {
      // connect or create relation
      transformCreatePayload: async data => {
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const createData = get(data, [relation.sourceField, 'create']);
        if (connectId) {
          return connectOwningSide(data, connectId);
        }

        if (createData) {
          return createOwningSide(data, createData);
        }
      },

      transformUpdatePayload: async data => {
        // connect -> create -> disconnect -> delete
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const ifDisconnect: boolean = get(data, [relation.sourceField, 'disconnect']);
        const createData = get(data, [relation.sourceField, 'create']);
        const ifDelete = get(data, [relation.sourceField, 'delete']);

        if (connectId) {
          return connectOwningSide(data, connectId);
        }

        if (createData) {
          return createOwningSide(data, createData);
        }

        if (ifDisconnect) {
          return disconnectOwningSide(data);
        }

        if (ifDelete) {
          return destroyOwningSide(data);
        }
      },

      resolveFields: {
        [relationImpl.getOwningSideField()]: parent => relationImpl.joinOnOwningSide(parent),
      },
    },

    // ref side
    [relationImpl.getRefSide().getName()]: {
      afterCreate: async data => {
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const createData = get(data, [relation.sourceField, 'create']);

        if (connectId) {
          return relationImpl.connectOnRefSide(data.id, connectId);
        }

        if (createData) {
          return relationImpl.createAndConnectOnRefSide(data.id, createData);
        }
      },

      afterUpdate: async (where, data) => {
        // connect -> create -> disconnect -> delete
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const ifDisconnect: boolean = get(data, [relation.sourceField, 'disconnect']);
        const createData = get(data, [relation.sourceField, 'create']);
        const ifDelete = get(data, [relation.sourceField, 'delete']);

        if (connectId) {
          return relationImpl.connectOnRefSide(where.id, connectId);
        }

        if (createData) {
          return relationImpl.createAndConnectOnRefSide(where.id, createData);
        }

        if (ifDisconnect) {
          return relationImpl.disconnectOnRefSide(where.id);
        }

        if (ifDelete) {
          return relationImpl.deleteAndDisconnectOnRefSide(where.id);
        }
      },

      resolveFields: {
        [relationImpl.getRefSideField()]: data => relationImpl.joinOnRefSide(data),
      },
    },
  };

  return hookMap;
};
