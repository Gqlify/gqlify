import { ModelRelation } from '../dataModel';
import { Hook } from './interface';
import { BiOneToOneRelation } from '../relation';
import { get, omit } from 'lodash';

export const createHookMap = (relation: ModelRelation): Record<string, Hook> => {
  const relationImpl = new BiOneToOneRelation({
    modelA: relation.source,
    modelB: relation.target,
    modelAField: relation.sourceField,
    modelBField: relation.targetField,
  });

  // fields
  const owningSideField = relationImpl.getOwningSideField();
  const refSideField = relationImpl.getRefSideField();

  const hookMap: Record<string, Hook> = {
    // todo: add cascade delete support
    [relationImpl.getOwningSide().getName()]: {
      // connect or create relation
      wrapCreate: async (data, createOperation) => {
        const relationData = get(data, owningSideField);
        if (!relationData) {
          return createOperation(data);
        }
        const connectId = get(relationData, ['connect', 'id']);
        const createData = get(relationData, 'create');

        // put id to data
        const dataWithoutRelation = omit(data, owningSideField);
        if (connectId) {
          const dataWithConnectId = await relationImpl.setForeignKeyOnOwningSide(connectId);
          return createOperation({...dataWithoutRelation, ...dataWithConnectId});
        }

        if (createData) {
          const dataWithCreateId = await relationImpl.createAndSetForeignKeyOnOwningSide(createData);
          return createOperation({...dataWithoutRelation, ...dataWithCreateId});
        }
      },

      wrapUpdate: async (where, data, updateOperation) => {
        const relationData = get(data, owningSideField);
        if (!relationData) {
          return updateOperation(where, data);
        }

        // connect -> create -> disconnect -> delete
        const connectId = get(relationData, ['connect', 'id']);
        const ifDisconnect: boolean = get(relationData, 'disconnect');
        const createData = get(relationData, 'create');
        const ifDelete = get(relationData, 'delete');

        // return to update operation with relation field
        const dataWithoutRelation = omit(data, owningSideField);
        let dataWithRelationField: any;
        if (connectId) {
          dataWithRelationField = await relationImpl.setForeignKeyOnOwningSide(connectId);
        } else if (createData) {
          dataWithRelationField = await relationImpl.createAndSetForeignKeyOnOwningSide(createData);
        } else if (ifDisconnect) {
          dataWithRelationField = await relationImpl.unsetForeignKeyOnOwningSide();
        } else if (ifDelete) {
          dataWithRelationField = await relationImpl.deleteAndUnsetForeignKeyOnOwningSide(data);
        }

        return updateOperation(where, {...dataWithoutRelation, ...dataWithRelationField});
      },

      resolveFields: {
        [relationImpl.getOwningSideField()]: parent => relationImpl.joinOnOwningSide(parent),
      },
    },

    // ref side
    [relationImpl.getRefSide().getName()]: {
      wrapCreate: async (data, createOperation) => {
        const relationData = get(data, refSideField);
        if (!relationData) {
          return createOperation(data);
        }

        const connectId = get(relationData, ['connect', 'id']);
        const createData = get(relationData, 'create');

        // after create
        const dataWithoutRelation = omit(data, owningSideField);
        const created = await createOperation(dataWithoutRelation);

        // bind relation
        if (connectId) {
          return relationImpl.connectOnRefSide(created.id, connectId);
        }

        if (createData) {
          return relationImpl.createAndConnectOnRefSide(created.id, createData);
        }
      },

      wrapUpdate: async (where, data, updateOperation) => {
        const relationData = get(data, refSideField);
        if (!relationData) {
          return updateOperation(where, data);
        }

        // update first
        const dataWithoutRelation = omit(data, refSideField);
        const updated = await updateOperation(where, dataWithoutRelation);

        // connect -> create -> disconnect -> delete
        const connectId = get(relationData, ['connect', 'id']);
        const ifDisconnect: boolean = get(relationData, 'disconnect');
        const createData = get(relationData, 'create');
        const ifDelete = get(relationData, 'delete');

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
