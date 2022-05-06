export interface Trial {
  url: string;
  id: number;
  name: string;
  idMajor: number;
  idMinor: number;
  idMicro: number;
  campaign?: string;
  scenario?: Scenario;
  testers: Array<string>;
  entities: Array<any>;
  testCondition: string;
  bagfile: string;
  systemConfiguration: SystemConfiguration;
  startDatetime: Date;
  endDatetime: Date;
  note: string;
  current: boolean;
  reported: boolean;
  clockConfig?: string;
}

export interface TrialId {
  idMajor: number;
  idMinor: number;
  idMicro: number;
}

export interface Scenario {
  url: string;
  id: number;
  name: string;
  description: string;
  variant: string;
  testMethodVariant: string;
  location: string;
  testMethod: string;
  entityGroups: Array<string>;
  hasSegments: boolean;
  potentialSegments: Array<any>;
  timeLimit: string;
}
export interface SystemConfiguration {
  url: string;
  id: number;
  name: string;
  description: string;
  capabilitiesUnderTest: Array<any>;
}

export interface Testers {
  url: string;
  id: number;
  name: string;
  userUrl: string;
  userId: number;
  roleName: string;
  roleUrl: string;
  roleId: number;
  roleDescription: string;
}

export interface TrialEventCount {
  total: number
  events: {name:string, count: number}[]
}


export interface ClockConfig {
  url?: string;
  name?: string;
}

export interface TrialClockState {
  trialId?: number;
  timezone?: string;
  message?: string;
  messageOnly?: boolean;
  countdown?: boolean;
  baseTime?: Date;
  nextTime?: Date;
  trialStartTime?: Date,
  trialEndTime?: Date,
  minor?: TrialClockState;
  major?: TrialClockState;
  reported?: TrialClockState;
}