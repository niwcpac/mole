import { StartsWithPipe } from './startswith.pipe';

describe('StartsWithPipe', () => {
  let objItems: any[];

  beforeEach(() => {
    objItems = [
      {name: "AngUlar", value:0}, {name: "Angry", value:1},
      {name: "barometer", value:2}, {name: "slap", value:3},
      {name: "anguish", value:4}
    ];
  });

  it('create an instance', () => {
    const pipe = new StartsWithPipe();
    expect(pipe).toBeTruthy();
  });

  it('return a list of all words starting with "ang"', () => {
    const pipe = new StartsWithPipe();
    const returnValue = pipe.transform(objItems, "ang");

    let oracleArray: any[] = [
      {name: "AngUlar", value:0}, {name: "Angry", value:1}, {name: "anguish", value:4}
    ];

    expect(returnValue.length).toBe(3);
    expect(returnValue).toEqual(oracleArray);
  });

  it('return an empty list', () => {
    const pipe = new StartsWithPipe();

    const returnValue = pipe.transform(objItems, "ker");

    expect(returnValue.length).toBe(0);
    expect(returnValue).toEqual([]);
  });

  it('return original list', () => {
    const pipe = new StartsWithPipe();
    const returnValueNoFilter = pipe.transform(objItems, "");
    const returnValueNoItems = pipe.transform([], "ba");

    expect(returnValueNoFilter.length).toBe(5);
    expect(returnValueNoFilter).toEqual(objItems);

    expect(returnValueNoItems.length).toBe(0);
    expect(returnValueNoItems).toEqual([]);
  });

});
