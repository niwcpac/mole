import { Entity } from "cesium";

export class MoleGeocoder {

    mole_entities;

    constructor(){
        this.mole_entities = new Map();
    }

    geocode(input) {

        var searchlist = this.searchEntities(input);
    
        let returnResults =searchlist.map(function (resultObject) {                
            var returnObject =  {
                displayName: resultObject.id.toString(),
                // We are not using the geocoder to zoom to a location so using a placeholder value for destination
                destination: 'none' 
            };
            return returnObject;
        });
        return new Promise( (resolve, reject) => {
            resolve(returnResults)});
    }

    searchEntities(searchText){
        let searchList = [];
        this.mole_entities.forEach( (value, key, map) =>
        {
            if ( key.toLowerCase().includes( searchText.toLowerCase() )) {
                searchList.push(value);
            }
        });        

        return searchList;
    }

    public addEntity(entity) {
        if(!this.mole_entities.has(entity.id.toString())) {
            this.mole_entities.set(entity.id.toString(),entity);
        }
    }
}
