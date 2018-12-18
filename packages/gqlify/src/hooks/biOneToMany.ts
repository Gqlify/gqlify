import { ModelRelation } from '../dataModel';
import { Hook } from './interface';
import { OneToManyRelation } from '../relation';
import { get, omit } from 'lodash';

export const createHookMap = (relation: ModelRelation): Record<string, Hook> => {
  const relationImpl = new OneToManyRelation({
    oneSideModel: relation.source,
    manySideModel: relation.target,
    oneSideField: relation.sourceField,
    manySideField: relation.targetField,
    foreignKey: get(relation.metadata, 'foreignKey'),
  });

  // fields
  const oneSideField = relationImpl.getOneSideField();
  const manySideField = relationImpl.getManySideField();

  // operations
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
  const connectOne = (connectId: string) => {
    return relationImpl.setForeignKeyOnManySide(connectId);
  };

  const createOne = targetData => {
    return relationImpl.createAndSetForeignKeyOnManySide(targetData);
  };

  const disconnectOne = () => {
    return relationImpl.unsetForeignKeyOnManySide();
  };

  const destroyOne = async data => {
    data = await relationImpl.destroyAndUnsetForeignKeyOnManySide(data);
    return data;
  };

  // todo: add cascade delete
  const hookMap: Record<string, Hook> = {
    // one side
    [relation.source.getName()]: {
      wrapCreate: async (context, createOperation) => {
        const {data} = context;
        const relationData = get(data, oneSideField);
        if (!relationData) {
          return createOperation();
        }

        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');

        // create with filtered data
        const dataWithoutRelation = omit(data, oneSideField);
        context.data = dataWithoutRelation;
        await createOperation();
        const created  = context.response;

        // execute relations
        if (connectWhere) {
          const connectIds = connectWhere.map(where => where.id);
          await connect(created.id, connectIds);
        }

        if (createRecords) {
          await create(created.id, createRecords);
        }

        return created;
      },

      // require id in where
      wrapUpdate: async (context, updateOperation) => {
        const {where, data} = context;
        const relationData = get(data, oneSideField);
        if (!relationData) {
          return updateOperation();
        }

        // update with filtered data
        const dataWithoutRelation = omit(data, oneSideField);
        context.data = dataWithoutRelation;
        await updateOperation();
        const updated  = context.response;

        // execute relation
        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');
        const disconnectWhere: Array<{id: string}> = get(relationData, 'disconnect');
        const deleteWhere: Array<{id: string}> = get(relationData, 'delete');

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

        return updated;
      },

      resolveFields: {
        [oneSideField]: data => relationImpl.joinManyOnOneSide(data),
      },
    },

    // many side
    [relation.target.getName()]: {
      // connect or create relation
      wrapCreate: async (context, createOperation) => {
        const {data} = context;
        const relationData = get(data, manySideField);
        if (!relationData) {
          return createOperation();
        }

        const connectId = get(relationData, ['connect', 'id']);
        const createData = get(relationData, 'create');

        // put id to data
        const dataWithoutRelation = omit(data, manySideField);
        if (connectId) {
          const dataWithConnectId = await connectOne(connectId);
          context.data = {...dataWithoutRelation, ...dataWithConnectId};
          return createOperation();
        }

        if (createData) {
          const dataWithCreateId = await createOne(createData);
          context.data = {...dataWithoutRelation, ...dataWithCreateId};
          return createOperation();
        }
      },

      wrapUpdate: async (context, updateOperation) => {
        const {where, data} = context;
        const relationData = get(data, manySideField);
        if (!relationData) {
          return updateOperation();
        }

        // connect -> create -> disconnect -> delete
        const connectId = get(relationData, ['connect', 'id']);
        const ifDisconnect: boolean = get(relationData, 'disconnect');
        const createData = get(relationData, 'create');
        const ifDelete = get(relationData, 'delete');

        // return to update operation with relation field
        const dataWithoutRelation = omit(data, manySideField);
        let dataWithRelationField: any;
        if (connectId) {
          dataWithRelationField = await connectOne(connectId);
        } else if (createData) {
          dataWithRelationField = await createOne(createData);
        } else if (ifDisconnect) {
          dataWithRelationField = await disconnectOne();
        } else if (ifDelete) {
          dataWithRelationField = await destroyOne(data);
        }

        context.data = {...dataWithoutRelation, ...dataWithRelationField};
        return updateOperation();
      },

      resolveFields: {
        [relationImpl.getManySideField()]: parent => relationImpl.joinOneOnManySide(parent),
      },
    },
  };

  return hookMap;
};
