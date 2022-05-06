import { PointStyle, Pose } from './map.model';

export interface Entity {
    url: string;
    name: string;
    displayName: string;
    physicalId: string;
    description: string;
    entityType: string;
    groups: string[];
    mods: string[];
    pointStyle?: PointStyle;
    latestPose?: any;
    allPoses?: Pose[];
}

export interface EntityPageResult {
    next: string;
    previous: string;
    results: Entity[];
}