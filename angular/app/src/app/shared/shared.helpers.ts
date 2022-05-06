import {Event} from "./models";

/**
 * Compares two Date objects and returns e number value that represents
 * the result:
 * 0 if the two dates are equal.
 * 1 if the first date is greater than second.
 * -1 if the first date is less than second.
 * @param date1 First date object to compare.
 * @param date2 Second date object to compare.
 */
export class SharedHelpers {
  compareDate(date1: Date, date2: Date): number {
    // With Date object we can compare dates them using the >, <, <= or >=.
    // The ==, !=, ===, and !== operators require to use date.getTime(),
    // so we need to create a new instance of Date with 'new Date()'
    let d1 = new Date(date1);
    let d2 = new Date(date2);

    // Check if the dates are equal
    let same = d1.getTime() === d2.getTime();
    if (same) return 0;

    // Check if the first is greater than second
    if (d1 > d2) return 1;

    // Check if the first is less than second
    if (d1 < d2) return -1;
  }

  /**
   * Function to return duration between two dates in milliseconds
   * -1 end date does not come before start date
   * @param startDate earlier date
   * @param endDate later date
   */
  getDuration(startDate: Date, endDate: Date): number {
    let start = startDate.getTime();
    let end = endDate.getTime();
    var duration = -1;

    if (end >= start) {
      duration = end - start;
    }

    return duration;
  }


// helper method that removes duplicates from array
// First item is kept second is removed
// Works on all arrays that have an id property
  arrayUnique(array: any[]): any[] {
    // if array doesn't exist, has no elements, or doesn't have an id property, simply return the array unmodified
    if (array === undefined || array.length == 0 || !("id" in array[0])) {
      return array
    }
    let a = array.concat();
    for (let i = 0; i < a.length; ++i) {
      for (let j = i + 1; j < a.length; ++j) {
        if (a[i].id === a[j].id)
          a.splice(j--, 1);
      }
    }

    return a;
  }

  // random sub names are necessary to not conflict the websocket with multiple clients
  makeRandomSubName() {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    const lengthOfCode = 12;
    for (let i = 0; i < lengthOfCode; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

}
