
import {
  Trial,
  TrialEventCount,
  TrialClockState,
  Scenario,
  SystemConfiguration,
  Testers,
  ClockConfig,
  Pose, PointStyle
} from "../../models";
import {Entities} from "../../models/trial.model";

export class TrialApiAdapters {
  trialAdapter(json: any): Trial {
    let trial: Trial = {
      url: json.url.replace("http://django:8000", ""),
      id: json.id,
      name: json.name,
      idMajor: json.id_major,
      idMinor: json.id_minor,
      idMicro: json.id_micro,
      testers: json.testers,
      entities: json.entities,
      testCondition: json.test_condition,
      bagfile: json.bagfile,
      systemConfiguration: json.system_configuration,
      startDatetime: json.start_datetime,
      endDatetime: json.end_datetime,
      note: json.note,
      current: json.current,
      reported: json.reported,
    };

    if (json.campaign) {
      trial.campaign = json.campaign.replace("http://django:8000", "");
    }
    else {
      trial.campaign = null;
    }

    if (json.scenario) {
      trial.scenario = this.scenarioAdapter(json.scenario);
    }
    else {
      trial.scenario = null;
    }

    if (json.clock_config) {
      trial.clockConfig = json.clock_config.replace("http://django:8000", "");
    }

    return trial;
  }

  scenarioAdapter(json: any): Scenario {
    let scenario: Scenario = {
      url: json.url,
      id: json.id,
      name: json.name,
      description: json.description,
      variant: json.variant,
      testMethodVariant: json.test_method_variant,
      location: json.location,
      testMethod: json.test_method,
      entityGroups: json.entity_groups,
      hasSegments: json.has_segments,
      potentialSegments: json.potential_segments,
      timeLimit: json.time_limit
    };

    return scenario;
  }


  systemConfigurationAdapter(json: any): SystemConfiguration {
    let systemConfig: SystemConfiguration = {
      url: json.url,
      id: json.id,
      name: json.name,
      description: json.description,
      capabilitiesUnderTest: json.capabilities_under_test
    };
    return systemConfig;
  }


  testersAdapter(json: any): Testers {
    let testers: Testers = {
      url: json.url,
      id: json.id,
      name: json.name,
      userUrl: json.user_url,
      userId: json.user_id,
      roleName: json.role_name,
      roleUrl: json.role_url,
      roleId: json.role_id,
      roleDescription: json.role_description
    };
    return testers;
  }


  clockConfigAdapter(json: any): ClockConfig {
    let config: ClockConfig = {};

    if (json.url) {
      config.url = json.url;
    }
    if (json.name) {
      config.name = json.name;
    }

    return config;
  }


  eventCountAdapter(json: any): TrialEventCount {
    let eventCounts: { name: string; count: number }[] = [];
    Object.keys(json.by_type).forEach(key => {
      eventCounts.push({name: key, count: json.by_type[key]})
    });

    return {
      total: json.total_events,
      events: eventCounts
    }
  }

  clockStateAdapter(json: any): TrialClockState {
    let clockState: TrialClockState = {}

    if (json.trial_id) {
      clockState.trialId = json.trial_id;
    }
    if (json.timezone) {
      clockState.timezone = json.timezone;
    }

    if (json.message) {
      clockState.message = json.message;
    }
    else {
      clockState.message = "Clock state not configured";
    }

    if (json.message_only) {
      clockState.messageOnly = json.message_only;
    }

    if (json.countdown) {
      clockState.countdown = json.countdown;
    }
    if (json.base_time) {
      clockState.baseTime = json.base_time;
    }
    if (json.next_time) {
      clockState.nextTime = json.next_time;
    }
    if (json.trial_start_time) {
      clockState.trialStartTime = json.trial_start_time;
    }
    if (json.trial_end_time) {
      clockState.trialEndTime = json.trial_end_time;
    }
    if (json.minor) {
      clockState.minor = this.clockStateAdapter(json.minor);
    }
    if (json.major) {
      clockState.major = this.clockStateAdapter(json.major);
    }
    if (json.reported) {
      clockState.reported = this.clockStateAdapter(json.reported);
    }

    return clockState;
  }

  entitiesAdapter(json: any): Entities {
    let entities: Entities = {
      next:json.next,
      previous:json.previous,
      results:json.results
      // url:json.url,
      // name: json.name,
      // display_name:json.display_name,
      // physical_id:json.physical_id,
      // entity_type:json.entity_type,
      // description:json.description,
      // trials: json.trials,
      // campaigns: json.campaigns,
      // groups:json.groups,
      // mods: json.mods,
      // region:json.region,
      // latest_pose: json.pose,
      // module_type: json.module_type,
      // point_style: json.point_style
    };
    return entities;
  }

}


