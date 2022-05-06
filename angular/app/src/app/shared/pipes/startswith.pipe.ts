import { Pipe, PipeTransform } from '@angular/core';

/*
    This pipe requires filtered items to have a name property and
    returns list of items that start with the substring of specified
    filter.
*/

@Pipe({
    name: 'startsWith',
    pure: false
})
export class StartsWithPipe implements PipeTransform {
    transform(items: any[], filter: string): any {
        
        if (!items || !filter) {
            return items;
        }

        var filteredItems = [];

        items.forEach(item => {
            if (item.name && typeof(item.name) != 'undefined') {
                if (item.name.toLowerCase().indexOf(filter.toLowerCase()) == 0) {
                    filteredItems.push(item);
                }
            }
        })

        return filteredItems;
    }
}