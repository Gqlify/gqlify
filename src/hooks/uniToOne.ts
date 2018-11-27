import { ModelRelation } from '../dataModel';
import { Hook } from './interface';
import { UniToOneRelation } from '../relation';
import { get } from 'lodash';

export const createHookMap = (relation: ModelRelation): Record<string, Hook> => {
  const relationImpl = new UniToOneRelation({
    sourceModel: relation.source,
    targetModel: relation.target,
    relationField: relation.sourceField,
  });

  // id required to be in model fields
  // todo: it there anyway to get the unique fields of model to filter data?
  const connect = (data, connectId: string) => {
    data = relationImpl.setForeignKey(data, connectId);
    delete data[relation.sourceField];
    return data;
  };

  const create = (data, targetData) => {
    data = relationImpl.createAndSetForeignKey(data, targetData);
    delete data[relation.sourceField];
    return data;
  };

  const disconnect = data => {
    data = relationImpl.unsetForeignKey(data);
    delete data[relation.sourceField];
    return data;
  };

  const destroy = async data => {
    data = await relationImpl.destroyAndUnsetForeignKey(data);
    delete data[relation.sourceField];
    return data;
  };

  const hookMap: Record<string, Hook> = {
    // todo: add cascade delete support
    [relation.source.getName()]: {
      // connect or create relation
      transformCreatePayload: async data => {
        if (!get(data, relation.sourceField)) {
          return;
        }
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const createData = get(data, [relation.sourceField, 'create']);
        if (connectId) {
          return connect(data, connectId);
        }

        if (createData) {
          return create(data, createData);
        }
      },

      transformUpdatePayload: async data => {
        if (!get(data, relation.sourceField)) {
          return;
        }
        // connect -> create -> disconnect -> delete
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const ifDisconnect: boolean = get(data, [relation.sourceField, 'disconnect']);
        const createData = get(data, [relation.sourceField, 'create']);
        const ifDelete = get(data, [relation.sourceField, 'delete']);

        if (connectId) {
          return connect(data, connectId);
        }

        if (createData) {
          return create(data, createData);
        }

        if (ifDisconnect) {
          return disconnect(data);
        }

        if (ifDelete) {
          return destroy(data);
        }
      },

      resolveFields: {
        [relation.sourceField]: parent => relationImpl.join(parent),
      },
    },
  };

  return hookMap;
};
