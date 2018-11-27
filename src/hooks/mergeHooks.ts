import { Hook } from './interface';
import { IResolverObject } from 'graphql-tools';
import { reduce, forEach, mapValues } from 'lodash';
import { flow } from 'lodash/fp';

interface ReducedHook {
  // create
  beforeCreate?: Array<(data: Record<string, any>) => Promise<void>>;
  transformCreatePayload?: Array<(data: Record<string, any>) => Promise<Record<string, any>>>;
  afterCreate?: Array<(data: Record<string, any>) => Promise<void>>;

  // update
  beforeUpdate?: Array<(where: any, data: Record<string, any>) => Promise<void>>;
  transformUpdatePayload?: Array<(data: Record<string, any>) => Promise<Record<string, any>>>;
  afterUpdate?: Array<(where: any, data: Record<string, any>) => Promise<void>>;

  // delete
  beforeDelete?: Array<(where: any) => Promise<void>>;
  afterDelete?: Array<(where: any) => Promise<void>>;

  // query
  resolveFields?: IResolverObject;
}

const createEmptyHook = (): ReducedHook => ({
  beforeCreate: [],
  transformCreatePayload: [],
  afterCreate: [],
  beforeUpdate: [],
  transformUpdatePayload: [],
  afterUpdate: [],
  beforeDelete: [],
  afterDelete: [],
  resolveFields: {},
});

export default (hooks: Array<Record<string, Hook>>): Record<string, Hook> => {
  const reducedHookMap: Record<string, ReducedHook> = reduce(hooks, (result: ReducedHook, hookMap) => {
    forEach(hookMap, (hook, modelName) => {
      if (!result[modelName]) {
        result[modelName] = createEmptyHook();
      }

      // push individual crud hook
      forEach(hook, (method, methodName) => {
        if (methodName === 'resolveFields') {
          result[modelName].resolveFields = {
            ...result[modelName].resolveFields,
            ...method,
          };
        } else {
          result[modelName][methodName].push(method);
        }
      });
    });
    return result;
  }, {});

  // combine functions
  // todo: optimize the flow, maybe execute in parallel
  return mapValues(reducedHookMap, hookMap => {
    return mapValues(hookMap, (combinedHooks, key) => {
      if (key === 'resolveFields') {
        return combinedHooks;
      } else {
        return flow(combinedHooks as any[]) as any;
      }
    });
  });
};
