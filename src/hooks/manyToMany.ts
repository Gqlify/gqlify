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
  const createFromModelA = (sourceId: string, records: any[]) => {
    return Promise.all(records.map(record => relationImpl.createAndAddIdToModelA(sourceId, record)));
  };

  const connectFromModelA = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.addIdToModelA(sourceId, id)));
  };

  const disconnectFromModelA = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.removeIdFromModelA(sourceId, id)));
  };

  const destroyFromModelA = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.deleteAndRemoveIdFromModelA(sourceId, id)));
  };

  // B side
  const createFromModelB = (sourceId: string, records: any[]) => {
    return Promise.all(records.map(record => relationImpl.createAndAddIdToModelB(sourceId, record)));
  };

  const connectFromModelB = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.addIdToModelB(sourceId, id)));
  };

  const disconnectFromModelB = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.removeIdFromModelB(sourceId, id)));
  };

  const destroyFromModelB = (sourceId: string, ids: string[]) => {
    return Promise.all(ids.map(id => relationImpl.deleteAndRemoveIdFromModelB(sourceId, id)));
  };

  const hookMap: Record<string, Hook> = {
    // todo: add cascade delete support
    [relationImpl.getModelA().getName()]: {
      wrapCreate: async (data, createOperation) => {
        const relationData = get(data, modelAField);
        if (!relationData) {
          return createOperation(data);
        }

        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');

        // create with filtered data
        const dataWithoutRelation = omit(data, modelAField);
        const created = await createOperation(dataWithoutRelation);

        // execute relations
        if (connectWhere) {
          const connectIds = connectWhere.map(where => where.id);
          await connectFromModelA(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelA(data.id, createRecords);
        }

        return created;
      },

      // require id in where
      wrapUpdate: async (where, data, updateOperation) => {
        const relationData = get(data, modelAField);
        if (!relationData) {
          return updateOperation(where, data);
        }

        // update with filtered data
        const dataWithoutRelation = omit(data, modelAField);
        const updated = await updateOperation(where, dataWithoutRelation);

        // execute relation
        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');
        const disconnectWhere: Array<{id: string}> = get(relationData, 'disconnect');
        const deleteWhere: Array<{id: string}> = get(relationData, 'delete');

        if (connectWhere) {
          const connectIds = connectWhere.map(v => v.id);
          await connectFromModelA(where.id, connectIds);
        }

        if (createRecords) {
          await createFromModelA(where.id, createRecords);
        }

        if (disconnectWhere) {
          const disconnectIds = disconnectWhere.map(v => v.id);
          await disconnectFromModelA(where.id, disconnectIds);
        }

        if (deleteWhere) {
          const deleteIds = deleteWhere.map(v => v.id);
          await destroyFromModelA(where.id, deleteIds);
        }

        return updated;
      },

      resolveFields: {
        [relationImpl.getModelAField()]: data => relationImpl.joinModelB(data.id),
      },
    },

    // ref side
    [relationImpl.getModelB().getName()]: {
      wrapCreate: async (data, createOperation) => {
        const relationData = get(data, modelBField);
        if (!relationData) {
          return createOperation(data);
        }

        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');

        // create with filtered data
        const dataWithoutRelation = omit(data, modelBField);
        const created = await createOperation(dataWithoutRelation);

        // execute relations
        if (connectWhere) {
          const connectIds = connectWhere.map(where => where.id);
          await connectFromModelB(data.id, connectIds);
        }

        if (createRecords) {
          await createFromModelB(data.id, createRecords);
        }

        return created;
      },

      // require id in where
      wrapUpdate: async (where, data, updateOperation) => {
        const relationData = get(data, modelBField);
        if (!relationData) {
          return updateOperation(where, data);
        }

        // update with filtered data
        const dataWithoutRelation = omit(data, modelBField);
        const updated = await updateOperation(where, dataWithoutRelation);

        // execute relation
        const connectWhere: Array<{id: string}> = get(relationData, 'connect');
        const createRecords: any[] = get(relationData, 'create');
        const disconnectWhere: Array<{id: string}> = get(relationData, 'disconnect');
        const deleteWhere: Array<{id: string}> = get(relationData, 'delete');

        if (connectWhere) {
          const connectIds = connectWhere.map(v => v.id);
          await connectFromModelB(where.id, connectIds);
        }

        if (createRecords) {
          await createFromModelB(where.id, createRecords);
        }

        if (disconnectWhere) {
          const disconnectIds = disconnectWhere.map(v => v.id);
          await disconnectFromModelB(where.id, disconnectIds);
        }

        if (deleteWhere) {
          const deleteIds = deleteWhere.map(v => v.id);
          await destroyFromModelB(where.id, deleteIds);
        }

        return updated;
      },

      resolveFields: {
        [relationImpl.getModelBField()]: data => relationImpl.joinModelA(data.id),
      },
    },
  };

  return hookMap;
};
