import {fakeAsync, TestBed} from '@angular/core/testing';

import { PointStyleService } from './point-style.service';
import {HttpClientTestingModule, HttpTestingController} from "@angular/common/http/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {Router} from "@angular/router";
import Spy = jasmine.Spy;
import {PointStyle} from "../../models";

describe('PointStyleService', () => {
  let pointstyle_service: PointStyleService;
  let http_testing_client: HttpTestingController;
  let auth_router: Router;
  let pointstyle_service_spy: Spy;


  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [PointStyleService]
    });
    /*
    * Must use spy on TrialApiService since its constructor uses a method that uses a get request.
    * If not mocked for initialization then all tests with http requests will fail since the HttpTestingController
    * will think there are unresolved http requests.
    * */
    pointstyle_service_spy = spyOn<any>(PointStyleService.prototype, 'initPointStyles').and.returnValue(null);
    pointstyle_service = TestBed.inject(PointStyleService);
    auth_router = TestBed.inject<any>(Router);
    http_testing_client = TestBed.inject(HttpTestingController);
    auth_router.initialNavigation();
  });

  /*
    run after every single test to make sure that our httpMock expectations are met
   */
  afterEach(() => {
    http_testing_client.verify();
  }); //end of afterEach()

  it('should be created', fakeAsync(() => {
    expect(pointstyle_service).toBeTruthy();
  }));


  it('initPointStyles() >> grab list of Pointstyles and convert to camel case and add mappings for event types and entity types', fakeAsync(() => {
    let mock_pointstyle_list = <PointStyle[]>[
      <PointStyle>{ event_types_styled: ["evtyst1", "evtyst2"],
        entity_types_styled: ["entyst1", "entyst2"]
      },
      <PointStyle>{ event_types_styled: ["evtyst3", "evtyst4"],
        entity_types_styled: ["entyst3", "entyst4"]
      }
    ];

    let mock_map = new Map();
    mock_map.set("evtyst1", mock_pointstyle_list[0]);
    mock_map.set("evtyst2", mock_pointstyle_list[0]);
    mock_map.set("entyst1", mock_pointstyle_list[0]);
    mock_map.set("entyst2", mock_pointstyle_list[0]);
    mock_map.set("evtyst3", mock_pointstyle_list[1]);
    mock_map.set("evtyst4", mock_pointstyle_list[1]);
    mock_map.set("entyst3", mock_pointstyle_list[1]);
    mock_map.set("entyst4", mock_pointstyle_list[1]);


    pointstyle_service_spy.and.callThrough();

    pointstyle_service['initPointStyles']();

    let pointstyle_adapter_spy = spyOn<any>(pointstyle_service['pointStyleApiAdapters'], 'pointStyleAdapter').and.callFake(data => {
      return data;
    });

    const req = http_testing_client.expectOne('/api/point_styles/');
    expect(req.request.method).toEqual('GET');

    req.flush(mock_pointstyle_list);
    expect(pointstyle_adapter_spy).toHaveBeenCalledWith(mock_pointstyle_list[0]);
    expect(pointstyle_adapter_spy).toHaveBeenCalledWith(mock_pointstyle_list[1]);
    expect(pointstyle_service['pointStylesMap']).toEqual(mock_map);
  }));


  it('getPointStyleFromTypeURL(typeURL) >> return pointstyle related to passed url',() => {
    let mock_pointstyle_list = <PointStyle[]>[
      <PointStyle>{ event_types_styled: ["evtyst1", "evtyst2"],
        entity_types_styled: ["entyst1", "entyst2"]
      },
    ];
    let mock_map = new Map();
    mock_map.set("evtyst1", mock_pointstyle_list[0]);
    mock_map.set("evtyst2", mock_pointstyle_list[0]);
    mock_map.set("entyst1", mock_pointstyle_list[0]);
    mock_map.set("entyst2", mock_pointstyle_list[0]);

    pointstyle_service['pointStylesMap'] = mock_map;

    let point_style: PointStyle = pointstyle_service.getPointStyleFromTypeURL("evtyst1");
    expect(point_style).toEqual(mock_pointstyle_list[0]);

    pointstyle_service['pointStylesMap'] = null;
    let point_style_not_found: PointStyle = pointstyle_service.getPointStyleFromTypeURL("evtyst3");
    expect(point_style_not_found).toEqual(null);
  });

}); //end of PointStyleService test suite
