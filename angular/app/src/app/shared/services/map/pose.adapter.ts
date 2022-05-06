import { Pose } from '../../models';
import { PosePageResult } from '../../models/map.model';

export class PoseAdapters {   

  static poseAdapter(pose: any) : Pose {
    let coordinate = null;
    if(pose.point != null) {
      coordinate = pose.point.coordinates;
    }
    let poseObject: Pose ={
        coordinates: coordinate,
        elevation: pose.elevation,
        heading: pose.heading,
        entity: pose.entity,
        pose_source: pose.pose_source,
        url: pose.url
      }

    if(pose.timestamp){
        poseObject.timestamp = pose.timestamp;
    }

    return poseObject;
  }

  static posePageResultAdapter(json: any): PosePageResult {
    let pageResult = {
        next: json.next,
        previous: json.previous,
        results: json.results.map(item => this.poseAdapter(item))
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