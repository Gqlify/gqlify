import { readFileSync } from 'fs';
import path from 'path';

// use same testsuite with one-to-one
export const sdl = readFileSync(path.resolve(__dirname, '../fixtures/oneToOneWithFK.graphql'), {encoding: 'utf8'});

export { testSuits } from './oneToOne';
