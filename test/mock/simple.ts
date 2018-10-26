
import MemoryApi from './memoryApi';

const users = [
  {id: '1', username: 'wwwy3y3', email: 'wwwy3y3@gmail.com'},
  {id: '2', username: 'wwwy3y32', email: 'wwwy3y3@canner.io'},
];

const books = [
  {id: '1', name: 'book1', author: '1'},
  {id: '2', name: 'book2', author: '2'},
];

const groups = [
  {id: '1', name: 'group1', members: ['1']},
  {id: '2', name: 'group2', members: ['1', '2']},
];

export const userApi = new MemoryApi(users);
export const bookApi = new MemoryApi(books);
export const groupApi = new MemoryApi(groups);
