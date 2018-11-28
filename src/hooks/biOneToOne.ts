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

  // owningSide field
  const owningSideField = relationImpl.getOwningSideField();
  const refSideField = relationImpl.getRefSideField();

  // owningSide
  const connectOwningSide = (connectId: string) => {
    return relationImpl.setForeignKeyOnOwningSide(connectId);
  };

  const createOwningSide = targetData => {
    return relationImpl.createAndSetForeignKeyOnOwningSide(targetData);
  };

  const disconnectOwningSide = () => {
    return relationImpl.unsetForeignKeyOnOwningSide();
  };

  const destroyOwningSide = data => {
    return relationImpl.deleteAndUnsetForeignKeyOnOwningSide(data);
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
          const dataWithConnectId = await connectOwningSide(connectId);
          return createOperation({...dataWithoutRelation, ...dataWithConnectId});
        }

        if (createData) {
          const dataWithCreateId = await createOwningSide(createData);
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
          dataWithRelationField = await connectOwningSide(connectId);
        } else if (createData) {
          dataWithRelationField = await createOwningSide(createData);
        } else if (ifDisconnect) {
          dataWithRelationField = await disconnectOwningSide();
        } else if (ifDelete) {
          dataWithRelationField = await destroyOwningSide(data);
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
