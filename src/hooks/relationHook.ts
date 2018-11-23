import {
  UniToOneRelation,
  BiOneToOneRelation,
  OneToManyRelation,
  ManyToManyRelation,
} from '../relation';
import { Hook } from './interface';
import { Model,
  RelationType,
  ModelRelation
} from '../dataModel';
import { get, reduce } from 'lodash';

const defaultRelationImpl = {
  [RelationType.uniOneToOne]: UniToOneRelation,
  [RelationType.uniManyToOne]: UniToOneRelation,
  [RelationType.uniOneToMany]: OneToManyRelation,
  [RelationType.biOneToOne]: BiOneToOneRelation,
  [RelationType.biOneToMany]: OneToManyRelation,
  [RelationType.biManyToMany]: ManyToManyRelation,
};

const createUniToOneRelationHooks = (relation: ModelRelation): Record<string, Hook> => {
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

  const create = data => {
    data = relationImpl.createAndSetForeignKey(data, data.create);
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

  const hooks: Record<string, Hook> = {
    // todo: add cascade delete support
    [relation.source.getName()]: {
      // connect or create relation
      transformCreatePayload: async data => {
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const createData = get(data, [relation.sourceField, 'create']);
        if (connectId) {
          return connect(data, connectId);
        }

        if (createData) {
          return create(createData);
        }
      },

      transformUpdatePayload: async data => {
        // connect -> create -> disconnect -> delete
        const connectId = get(data, [relation.sourceField, 'connect', 'id']);
        const ifDisconnect: boolean = get(data, [relation.sourceField, 'disconnect']);
        const createData = get(data, [relation.sourceField, 'create']);
        const ifDelete = get(data, [relation.sourceField, 'delete']);

        if (connectId) {
          return connect(data, connectId);
        }

        if (createData) {
          return create(createData);
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

  return hooks;
};

export const createRelationHook = (relations: ModelRelation[]): Record<string, Hook> => {
  const hooks = relations.map(relation => {
    switch (relation.type) {
      case RelationType.uniManyToOne:
      case RelationType.uniOneToOne:
        return createUniToOneRelationHooks(relation);

      default:
        throw new Error(`unknown relation type ${relation.type}`);
    }
  });

  // merge all hooks to one hook
};
