import {Campaign} from '../../models';
import {TrialApiAdapters} from '../trial/trial-api.adapter';

export class CampaignApiAdapters {

    trialApiAdapters = new TrialApiAdapters();

    campaignAdapter(json: any): Campaign {
        let campaign: Campaign = {
            url: json.url.replace("http://django:8000", ""),
            id: json.id,
            name: json.name,
            description: json.description,
            startDatetime: json.start_datetime,
            endDatetime: json.end_datetime,
            location: json.location,
            entities: json.entities,
            scenarios: json.scenarios.map(
                scenario => this.trialApiAdapters.scenarioAdapter(scenario)
            ),
            trialIdMajorName: json.trial_id_major_name,
            trialIdMinorName: json.trial_id_minor_name,
            trialIdMicroName: json.trial_id_micro_name,
            trials: json.trials,
            trialNames: json.trial_names
        }

        return campaign;
    }

}