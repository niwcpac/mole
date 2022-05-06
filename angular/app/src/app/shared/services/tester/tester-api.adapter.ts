import { Tester } from '../../models';

export class TesterApiAdapters {
  testerAdapter(json: any): Tester {
    if (typeof(json) != 'undefined') {
      let tester: Tester = {
        url: json.url,
        id: json.id,
        name: json.name,
        username: json.username,
        userUrl: json.user_url,
        userId: json.user_id,
        roleName: json.role_name,
        roleUrl: json.role_url,
        roldId: json.role_id,
        roleDescription: json.role_description
      };
      return tester;
    }
    else {
      return null;
    }
  }
}
