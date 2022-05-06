import { IncludesSubstrPipe } from './includessubstr.pipe';
import {StartsWithPipe} from './startswith.pipe';

describe('IncludesSubstrPipe', () => {
  let objItems: any[];

  beforeEach(() => {
    objItems = [
      {name: 'AngUlar', value: 0}, {name: 'Angry', value: 1},
      {name: 'barometer', value: 2}, {name: 'meter', value: 3},
      {name: 'centimeter', value: 4}, {name: 'odometer', value: 5}
    ];
  });

  it('create an instance', () => {
    const pipe = new IncludesSubstrPipe();
    expect(pipe).toBeTruthy();
  });

  it('return a list of all words containing "meter"', () => {
    const pipe = new IncludesSubstrPipe();
    const returnValue = pipe.transform(objItems, 'meter');

    const oracleArray: any[] = [
      {name: 'barometer', value: 2}, {name: 'meter', value: 3},
      {name: 'centimeter', value: 4}, {name: 'odometer', value: 5}
    ];

    expect(returnValue.length).toBe(4);
    expect(returnValue).toEqual(oracleArray);
  });

  it('return an empty list', () => {
    const pipe = new StartsWithPipe();

    const returnValue = pipe.transform(objItems, 'ker');

    expect(returnValue.length).toBe(0);
    expect(returnValue).toEqual([]);
  });

  it('return original list', () => {
    const pipe = new StartsWithPipe();
    const returnValueNoFilter = pipe.transform(objItems, '');
    const returnValueNoItems = pipe.transform([], 'ba');

    expect(returnValueNoFilter.length).toBe(6);
    expect(returnValueNoFilter).toEqual(objItems);

    expect(returnValueNoItems.length).toBe(0);
    expect(returnValueNoItems).toEqual([]);
  });

});
