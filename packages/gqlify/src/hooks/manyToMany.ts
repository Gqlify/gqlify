import { ModelRelation } from '../dataModel';
import { Hook } from './interface';
import { ManyToManyRelation } from '../relation';
import { get, omit } from 'lodash';

export const createHookMap = (relation: ModelRelation): Record<string, Hook> => {
  const relationImpl = new ManyToManyRelation({
    modelA: relation.source,
    modelB: relation.target,
    modelAField: relation.sourceField,
    modelBField: relation.targetField,
  });

  // fields
  const modelAField = relationImpl.getModelAField();
  const modelBField = relationImpl.getModelBField();

  // A side
  const createForModelA = (sourceId: string, records: any[], context: any) => {
    return Promise.all(records.map(record =>
      relationImpl.createAndAddIdForModelA({modelAId: sourceId, modelBData: record}, context)));
  };

  const connectForModelA = (sourceId: string, ids: string[], context: any) => {
    return Promise.all(ids.map(id => relationImpl.addId({modelAId: sourceId, modelBId: id}, context)));
  };

  const disconnectForModelA = (sourceId: string, ids: string[], context: any) => {
    return Promise.all(ids.map(id =>
        relationImpl.removeId({modelAId: sourceId, modelBId: id}, context)));
  };

  const destroyForModelA = (sourceId: string, ids: string[], context: any) => {
    return Promise.all(ids.map(id =>
      relationImpl.deleteAndRemoveIdFromModelB({modelAId: sourceId, modelBId: id}, context)));
  };

  // B side
  const createForModelB = (sourceId: string, records: any[], context: any) => {
    return Promise.all(records.map(record =>
      relationImpl.createAndAddIdForModelB({modelBId: sourceId, modelAData: record}, context)));
  };

  const connectForModelB = (sourceId: string, ids: string[], context: any) => {
    return Promise.all(ids.map(id => relationImpl.addId({modelBId: sourceId, modelAId: id}, context)));
  };

  const disconnectForModelB = (sourceId: string, ids: string[], context: any) => {
    return Promise.all(ids.map(id =>
        relationImpl.removeId({modelAId: id, modelBId: sourceId}, context)));
  };

  const destroyForModelB = (sourceId: string, ids: string[], context: any) => {
    return Promise.all(ids.map(id =>
      relationImpl.deleteAndRemoveIdFromModelA({modelAId: id, modelBId: sourceId}, context)));
  };

  const hookMap: Record<string, Hook> = {
    // todo: add cascade delete support
    [relationImpl.getModelA().getName()]: {
      wrapCreate: async (context, createOperation) => {
        const {data, graphqlContext} = context;
        const relationData = get(data, modelAField);
        if (!relationData) {
          return createOperation();
        }

        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');

        // create with filtered data
        const dataWithoutRelation = omit(data, modelAField);
        context.data = dataWithoutRelation;
        await createOperation();
        const created  = context.response;

        // execute relations
        if (connectWhere) {
          const connectIds = connectWhere.map(where => where.id);
          await connectForModelA(created.id, connectIds, graphqlContext);
        }

        if (createRecords) {
          await createForModelA(created.id, createRecords, graphqlContext);
        }

        return created;
      },

      // require id in where
      wrapUpdate: async (context, updateOperation) => {
        const {where, data, graphqlContext} = context;
        const relationData = get(data, modelAField);
        if (!relationData) {
          return updateOperation();
        }

        // update with filtered data
        const dataWithoutRelation = omit(data, modelAField);
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
          await connectForModelA(where.id, connectIds, graphqlContext);
        }

        if (createRecords) {
          await createForModelA(where.id, createRecords, graphqlContext);
        }

        if (disconnectWhere) {
          const disconnectIds = disconnectWhere.map(v => v.id);
          await disconnectForModelA(where.id, disconnectIds, graphqlContext);
        }

        if (deleteWhere) {
          const deleteIds = deleteWhere.map(v => v.id);
          await destroyForModelA(where.id, deleteIds, graphqlContext);
        }

        return updated;
      },

      resolveFields: {
        [relationImpl.getModelAField()]: (data, _, graphqlContext) => relationImpl.joinModelB(data.id, graphqlContext),
      },
    },

    // ref side
    [relationImpl.getModelB().getName()]: {
      wrapCreate: async (context, createOperation) => {
        const {data, graphqlContext} = context;
        const relationData = get(data, modelBField);
        if (!relationData) {
          return createOperation();
        }

        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');

        // create with filtered data
        const dataWithoutRelation = omit(data, modelBField);
        context.data = dataWithoutRelation;
        await createOperation();
        const created  = context.response;

        // execute relations
        if (connectWhere) {
          const connectIds = connectWhere.map(where => where.id);
          await connectForModelB(created.id, connectIds, graphqlContext);
        }

        if (createRecords) {
          await createForModelB(created.id, createRecords, graphqlContext);
        }

        return created;
      },

      // require id in where
      wrapUpdate: async (context, updateOperation) => {
        const {where, data, graphqlContext} = context;
        const relationData = get(data, modelBField);
        if (!relationData) {
          return updateOperation();
        }

        // update with filtered data
        const dataWithoutRelation = omit(data, modelBField);
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
          await connectForModelB(where.id, connectIds, graphqlContext);
        }

        if (createRecords) {
          await createForModelB(where.id, createRecords, graphqlContext);
        }

        if (disconnectWhere) {
          const disconnectIds = disconnectWhere.map(v => v.id);
          await disconnectForModelB(where.id, disconnectIds, graphqlContext);
        }

        if (deleteWhere) {
          const deleteIds = deleteWhere.map(v => v.id);
          await destroyForModelB(where.id, deleteIds, graphqlContext);
        }

        return updated;
      },

      resolveFields: {
        [relationImpl.getModelBField()]: (data, _, graphqlContext) => relationImpl.joinModelA(data.id, graphqlContext),
      },
    },
  };

  return hookMap;
};
