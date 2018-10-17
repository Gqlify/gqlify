// tslint:disable:no-unused-expression
import chai from 'chai';
import prettier from 'prettier';

// plugins
import BaseTypePlugin from '../src/plugins/baseType';
import WhereInputPlugin from '../src/plugins/whereInput';
import QueryPlugin from '../src/plugins/query';
import CreatePlugin from '../src/plugins/create';
import UpdatePlugin from '../src/plugins/update';
import DeletePlugin from '../src/plugins/delete';
import Generator from '../src/generator';

// fixtures
import { userModel } from './fixtures/simple';

const expect = chai.expect;

const plugins = [
  new BaseTypePlugin(),
  new WhereInputPlugin(),
  new QueryPlugin(),
  new CreatePlugin(),
  new UpdatePlugin(),
  new DeletePlugin(),
];

const generator = new Generator({ plugins });

describe('generator', () => {
  it('should generate graphql for simple model', () => {
    let graphql = generator.generate([userModel]);
    graphql = prettier.format(graphql, { parser: 'graphql' });
    // tslint:disable-next-line:no-console
    console.log(graphql);
  });
});
