import { Pipe, PipeTransform } from '@angular/core';

/*
    This pipe requires filtered items to have a name property and
    returns list of items that contain the substring of specified
    filter.
*/
@Pipe({
    name: 'includesSubstr',
    pure: false
})
export class IncludesSubstrPipe implements PipeTransform {
    transform(items: any[], filter: string): any {
        
        if (!items || !filter) {
            return items;
        }

        var filteredItems = [];

        items.forEach(item => {
            if (item.name && typeof(item.name) != 'undefined') {
                if (item.name.toLowerCase().includes(filter.toLowerCase())) {
                    filteredItems.push(item);
                }
            }
            
        })

        return filteredItems;
    }
}