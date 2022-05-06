import { Scenario } from '../models'

export interface Campaign {
    url: string;
    id: number;
    name: string;
    description: string;
    startDatetime: Date;
    endDatetime: Date;
    location: string;
    entities: Array<string>;
    scenarios: Array<Scenario>;
    trialIdMajorName: string;
    trialIdMinorName: string;
    trialIdMicroName: string;
    trials: Array<string>;
    trialNames: Array<string>;
}