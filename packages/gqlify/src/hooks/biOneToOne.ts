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
      wrapCreate: async (context, createOperation) => {
        const {data} = context;
        const relationData = get(data, owningSideField);
        if (!relationData) {
          return createOperation();
        }
        const connectId = get(relationData, ['connect', 'id']);
        const createData = get(relationData, 'create');

        // put id to data
        const dataWithoutRelation = omit(data, owningSideField);
        if (connectId) {
          const dataWithConnectId = await relationImpl.setForeignKeyOnOwningSide(connectId);
          context.data = {...dataWithoutRelation, ...dataWithConnectId};
          return createOperation();
        }

        if (createData) {
          const dataWithCreateId = await relationImpl.createAndSetForeignKeyOnOwningSide(createData);
          context.data = {...dataWithoutRelation, ...dataWithCreateId};
          return createOperation();
        }
      },

      wrapUpdate: async (context, updateOperation) => {
        const {data} = context;
        const relationData = get(data, owningSideField);
        if (!relationData) {
          return updateOperation();
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

        context.data = {...dataWithoutRelation, ...dataWithRelationField};
        return updateOperation();
      },

      resolveFields: {
        [relationImpl.getOwningSideField()]: parent => relationImpl.joinOnOwningSide(parent),
      },
    },

    // ref side
    [relationImpl.getRefSide().getName()]: {
      wrapCreate: async (context, createOperation) => {
        const {data} = context;
        const relationData = get(data, refSideField);
        if (!relationData) {
          return createOperation();
        }

        const connectId = get(relationData, ['connect', 'id']);
        const createData = get(relationData, 'create');

        // after create
        const dataWithoutRelation = omit(data, owningSideField);
        context.data = dataWithoutRelation;
        await createOperation();
        const created  = context.response;

        // bind relation
        if (connectId) {
          return relationImpl.connectOnRefSide(created.id, connectId);
        }

        if (createData) {
          return relationImpl.createAndConnectOnRefSide(created.id, createData);
        }
      },

      wrapUpdate: async (context, updateOperation) => {
        const {where, data} = context;
        const relationData = get(data, refSideField);
        if (!relationData) {
          return updateOperation();
        }

        // update first
        const dataWithoutRelation = omit(data, refSideField);
        context.data = dataWithoutRelation;
        const updated = await updateOperation();

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
