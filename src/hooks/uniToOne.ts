import { ModelRelation } from '../dataModel';
import { Hook } from './interface';
import { UniToOneRelation } from '../relation';
import { get, omit } from 'lodash';

export const createHookMap = (relation: ModelRelation): Record<string, Hook> => {
  const relationImpl = new UniToOneRelation({
    sourceModel: relation.source,
    targetModel: relation.target,
    relationField: relation.sourceField,
  });

  const relationField = relationImpl.getRelationField();

  // id required to be in model fields
  // todo: it there anyway to get the unique fields of model to filter data?
  const hookMap: Record<string, Hook> = {
    // todo: add cascade delete support
    [relation.source.getName()]: {
      // connect or create relation
      wrapCreate: async (data, createOperation) => {
        const relationData = get(data, relationField);
        if (!relationData) {
          return createOperation(data);
        }
        const connectId = get(relationData, ['connect', 'id']);
        const createData = get(relationData, 'create');

        // put id to data
        const dataWithoutRelation = omit(data, relationField);
        if (connectId) {
          const dataWithConnectId = await relationImpl.setForeignKey(connectId);
          return createOperation({...dataWithoutRelation, ...dataWithConnectId});
        }

        if (createData) {
          const dataWithCreateId = await relationImpl.createAndSetForeignKey(createData);
          return createOperation({...dataWithoutRelation, ...dataWithCreateId});
        }
      },

      wrapUpdate: async (where, data, updateOperation) => {
        const relationData = get(data, relationField);
        if (!relationData) {
          return updateOperation(where, data);
        }

        // connect -> create -> disconnect -> delete
        const connectId = get(relationData, ['connect', 'id']);
        const ifDisconnect: boolean = get(relationData, 'disconnect');
        const createData = get(relationData, 'create');
        const ifDelete = get(relationData, 'delete');

        // return to update operation with relation field
        const dataWithoutRelation = omit(data, relationField);
        let dataWithRelationField: any;
        if (connectId) {
          dataWithRelationField = await relationImpl.setForeignKey(connectId);
        } else if (createData) {
          dataWithRelationField = await relationImpl.createAndSetForeignKey(createData);
        } else if (ifDisconnect) {
          dataWithRelationField = await relationImpl.unsetForeignKey();
        } else if (ifDelete) {
          dataWithRelationField = await relationImpl.destroyAndUnsetForeignKey(data);
        }

        return updateOperation(where, {...dataWithoutRelation, ...dataWithRelationField});
      },

      resolveFields: {
        [relation.sourceField]: parent => relationImpl.join(parent),
      },
    },
  };

  return hookMap;
};
