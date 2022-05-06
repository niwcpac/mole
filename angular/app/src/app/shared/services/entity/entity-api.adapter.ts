import { Entity, EntityPageResult } from '../../models';
import { PointStyleApiAdapters } from '../point-style/point-style-api.adapter';

export class EntityApiAdapters {
    pointStyleAdapters = new PointStyleApiAdapters();
    entityAdapter(json: any): Entity {
        let entity = {
            url: json.url,
            name: json.name,
            displayName: json.display_name,
            physicalId: json.physical_id,
            description: json.description,
            entityType: json.entity_type,
            latestPose: json.latest_pose,
            groups: json.groups,
            mods: json.mods,
            pointStyle: json.point_style
        }

        if (json.point_style) {
            entity.pointStyle = this.pointStyleAdapters.pointStyleAdapter(json.point_style);
        }

        return entity;
    }

    entityPageResultAdapter(json: any): EntityPageResult {
        let pageResult = {
            next: json.next,
            previous: json.previous,
            results: json.results.map(item => this.entityAdapter(item))
        }

        if (pageResult.next) {
            pageResult.next = pageResult.next.replace("http://django:8000", "");
        }
    
        if (pageResult.previous) {
            pageResult.previous = pageResult.previous.replace("http://django:8000", "");
        }
    
        return pageResult;
    }
}