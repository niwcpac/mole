# **Configuration**

## **First Steps**

If we're starting with a blank slate, we have a couple initial steps to go through to configure Django. We need to create a series of Django model instances to tailor the Mole instrumentation to a specific domain. There are two ways to create instances: using the Django ORM or using third-party library `factory_boy`. The main difference between the two is how much data must be specified. The ORM requires all the fields to be filled out but `factory_boy` is configured to fill in fields that are left blank. Regardless of which is chosen, this should be implemented in a custom Django command. An example of one can be found at `mole/data_collection/management/commands/configure_mole.py`.

### **Locations**

The first thing we need to create is a location. 

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    location_1 = dcm.Location.objects.create(
        name="Location 1", 
        description="description of location 1", 
        point="POINT(-117.248 32.709)",
        timezone="America/Los_Angeles",
    )
    ```

=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    location_1 = factories.LocationFactory(
        name="Location 1", 
        description="description of location 1", 
        point="POINT(-117.248 32.709)",
        timezone="America/Los_Angeles",
    )
    ```

The name and description fields are self-explanatory. The point field is a well-known text representation (WKT) of a point geometry. The timezone field is a string indicating the TZ database name.

### **Campaigns**
Next we need to create a campaign. A campaign can represent a high level field experiment or test event. 

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    campaign_1 = dcm.Campaign.objects.create(
        name="Test Event 1",
        description="info about test event 1",
        start_datetime="2018-10-21T05:00:00-0800",
        end_datetime="2018-10-25T19:00:00-0800",
        location=location_1,
        trial_id_major_name="Day",
        trial_id_minor_name="Shift",
        trial_id_micro_name="Attempt",
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    campaign_1 = factories.CampaignFactory(
        name="Test Event 1",
        description="info about test event 1",
        start_datetime="2018-10-21T05:00:00-0800",
        end_datetime="2018-10-25T19:00:00-0800",
        location=location_1,
        trial_id_major_name="Day",
        trial_id_minor_name="Shift",
        trial_id_micro_name="Attempt",
    )
    ```

`start_datetime` and `end_datetime` indicate the start and end time respectively. 

`location` should be a reference to the Location object created earlier. 

`trial_id_major_name`, `trial_id_minor_name`,  and `trial_id_micro_name` are strings that describe the numbering scheme for trials. Each trial has a major, minor, and micro id, visualized as `x.y.z`. For example, the following code block marks the `x` id as the day. These strings are optional and will default to the empty string if not specified. 

### **Scenarios**
Next we'll create a Scenario. But first we need to create a Test Method. A Test Method represents a defined procedure to test a capability. It could be focused on a low level capability such as obstacle detection or path planning, or a system-level test that is intended to exercise the fully-integrated system. A Scenario is a specific instantiation of a Test Method that defines parameters that may be variable in the Test Method (e.g., location, number of agents, test duration, dynamic elements, etc.). So the Test Method might be "Persistent Swarm Surveillance", and the Scenario might be "<Location 1> 3-agent surveillance". This is intended to allow association of similar Test Methods while allowing some variation in location or parameters.  

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    test_method = dcm.TestMethod.objects.create(
        name="Interactive Swarm Exercise",
        description="Testing swarm capabilities",
        version_major=1,
        version_minor=0,
        version_micro=0,
        variant="autonomy",
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    test_method = factories.TestMethodFactory(
        name="Interactive Swarm Exercise",
        description="Testing swarm capabilities",
        version_major=1,
        version_minor=0,
        version_micro=0,
        variant="autonomy",
    )
    ```
The version numbers and variant can be used to track changes to test procedures. 

Now we can create the scenario.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    scenario_1 = dcm.Scenario.objects.create(
        name="Scenario 1",
        description="description of scenario 1",
        location=location_1,
        test_method=test_method,
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    scenario_1 = factories.ScenarioFactory(
        name="Scenario 1",
        description="description of scenario 1",
        location=location_1,
        test_method=test_method,
    )
    ```

The scenario's location could be the same or different than the campaign's location. If different, follow the steps for creating a location to create another one.

### **Trials**

Now we move on to our trials. A Trial can represent a single run or attempt. Events of interest or data about the run can be saved in these trials, giving us an easy container to compare and contrast test results. Since trials contain a lot of data about a run, we'll need to create a couple of pre-requisite instances. The first is a Tester which needs both a user and a role.

We use the Django authentication [user](https://docs.djangoproject.com/en/4.0/ref/contrib/auth/#django.contrib.auth.models.User) so unlike the other models, we have to use the `factory_boy` implementation to ensure that the password is saved correctly.

=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    main_user = factories.UserFactory(
        username="admin", 
        password="admin",
    )
    ```
!!! Warning
    You'll want to adjust this to have more secure credentials.

Next we'll create the role.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    my_role = dcm.Role.objects.create(
        name="test_administrator", 
        description="description of test administrator",
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    my_role = factories.RoleFactory(
        name="test_administrator", 
        description="description of test administrator",
    )
    ```


Now that we have both a user and a role, we can create a tester.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    my_tester = dcm.Tester.objects.create(
        user=main_user, 
        role=my_role,
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    my_tester = factories.TesterFactory(
        user=main_user, 
        role=my_role,
    )
    ```

Next we need a system configuration. A system configuration can  consist of one or more capability under test, each of which has a performer. We'll start at the bottom with the performer.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    performer_1 = dcm.Performer.objects.create(
        name="Integrator Team 1", 
        description="info about team 1",
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    performer_1 = factories.PerformerFactory(
        name="Integrator Team 1", 
        description="info about team 1",
    )
    ```

Next up is capability under test.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    capability_under_test = dcm.CapabilityUnderTest.objects.create(
        name="Swarm Capability",
        description="Swarm Capability",
        performer=performer_1,
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    capability_under_test = factories.CapabilityUnderTestFactory(
        name="Swarm Capability",
        description="Swarm Capability",
        performer=performer_1,
    )
    ```

Then we round it out with a system configuration.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    sys_conf = dcm.SystemConfiguration.objects.create(
        name="System Configuration 1",
        description="total set of performers",
        capabilities_under_test=(capability_under_test,),
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    sys_conf = factories.SystemConfigurationFactory(
        name="System Configuration 1",
        description="total set of performers",
        capabilities_under_test=(capability_under_test,),
    )
    ```

Next we have to create a test condition, as well as a weather instance. First we'll start with the weather.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    current_weather = dcm.Weather.objects.create(
        name="Sunny",
        description="no clouds in the sky",
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    current_weather = factories.WeatherFactory(
        name="Sunny",
        description="no clouds in the sky",
    )
    ```
Then onto the test condition.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    my_test_condition = dcm.TestCondition.objects.create(
        weather=current_weather,
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    my_test_condition = factories.TestConditionFactory(
        weather=current_weather,
    )
    ```

Now we can finally create an initial trial.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    dcm.Trial.objects.create(
        id_major=0,
        id_minor=0,
        id_micro=0,
        campaign=campaign_1,
        scenario=scenario_1,
        testers=(my_tester,),
        test_condition=my_test_condition,
        system_configuration=sys_conf,
        start_datetime="2018-10-22T07:00:00-0800",
        reported=False,
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    factories.TrialFactory(
        id_major=0,
        id_minor=0,
        id_micro=0,
        campaign=campaign_1,
        scenario=scenario_1,
        testers=(my_tester,),
        test_condition=my_test_condition,
        system_configuration=sys_conf,
        start_datetime="2018-10-22T07:00:00-0800",
        reported=False,
    )
    ```

The ternary id (`id_major`, `id_minor`, `id_micro` taken together) have to be unique within each campaign, but there is no restriction otherwise on their integer values.

`reported` is a boolean flag that will tell the report generator whether or not to create graphs and charts for this trial.

### **Event Types**

With a trial in place, we can start creating event types to track the things we are interested in. These event types can represent 'bookmarks' during the test run or a change in state. It can be used to show an interaction of interest or a noteworthy exchange.

We'll first create an event level.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    event_level = dcm.EventLevel.objects.create(
        name="Info", 
        description="Informational events", 
        key="info", 
        visibility=1,
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    event_level = factories.EventLevelFactory(
        name="Info", 
        description="Informational events", 
        key="info", 
        visibility=1,
    )
    ```

The name and key fields are both unique strings and the visibility is set to some integer value, used to dictate a hierarchy of event types.

Now we move on to the event type itself.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    dcm.EventType.objects.create(
        name="Interaction",
        description="interaction of note",
        event_level=event_level,
        is_manual=True,
        has_duration=False,
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    factories.EventTypeFactory(
        name="Interaction",
        description="interaction of note",
        event_level=event_level,
        is_manual=True,
        has_duration=False,
    )
    ```

## **Entities**
This model provides an abstraction for any unit or system we wish to track. This could be a system that's undergoing testing or an orchestration element that we're configuring. 

Each entity will need an entity type. We can also assign a list of capabilities to an entity type, signifying that every entity of this type has these properties. We can further distinguish individual entities by assigning mods to them, where mods can have multiple capabilities.

We'll start with defining a couple of capabilities.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    radar_cap = dcm.Capability.objects.create(
        name="radar", 
        description="24 GHz Radar",
        display_name="Radar",
    )
    ble_cap = dcm.Capability.objects.create(
        name="ble", 
        description="Capability using Bluetooth Low Energy",
        display_name="Bluetooth Low Energy",
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    radar_cap = factories.CapabilityFactory(
        name="radar", 
        description="Radar Capability",
        display_name="Radar",
    )
    ble_cap = factories.CapabilityFactory(
        name="ble", 
        description="Capability using Bluetooth Low Energy",
        display_name="Bluetooth Low Energy",
    )
    ```

`display_name` is a more human-friendly string that can be used for a UI for example.

Next we'll make a mod combining the two capabilities.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    comms_mod = dcm.Mod.objects.create(
        name="comms_mod", 
        description="A combination mod that contains both radar and bluetooth low energy",
        display_name="Combined communication mod",
    )
    comms_mod.capabilities.set([radar_cap, ble_cap])
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    comms_mod = factories.ModFactory(
        name="comms_mod", 
        description="A combination mod that contains both radar and bluetooth low energy",
        display_name="Combined communication mod",
        capabilities=[radar_cap, ble_cap],
    )
    ```

Note that when using the Django ORM, the process to add a capability to a mod is slightly more complicated than the creation of the mod. It must be set outside of the creation of the mod due to technical limitations. This occurs in various other models throughout Mole as well. This limitation does not occur in the `factory_boy` factories.

We'll make an entity type next, a ugv entity type with an inherent radar capability.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    ugv_type = dcm.EntityType.objects.create(
        name="ugv", 
        description="Unmanned ground vehicle t ype",
        display_name="UGV",
    )
    ugv_type.capabilities.set([radar_cap])
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    ugv_type = factories.EntityTypeFactory(
        name="ugv", 
        description="Unmanned ground vehicle type",
        display_name="UGV",
        capabilities=[radar_cap],
    )
    ```

Then we can make an individual entity that contains the `comms_mod` mod.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    alpha_1 = dcm.Entity.objects.create(
        name="alpha_1",
        description="A motorized ground rover with multi-comms",
        entity_type=ugv_type,
        display_name="Alpha 1",
        physical_id="raspberry pi 3b+",
    )
    alpha_1.mods.set([comms_mod])
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    alpha_1 = factories.EntityFactory(
        name="alpha_1",
        description="A motorized ground rover with multi-comms",
        entity_type=ugv_type,
        display_name="Alpha 1",
        physical_id="raspberry pi 3b+",
        mods=[comms_mod],
    )
    ```

## **EntityGroups**
We can also cluster entities together if there is some other commonality between them. They could be part of a specific scenario, which we could then relate directly on the scenario. They might share a physical property that is not otherwise recorded in Mole or used to denote valid entities for a entity state. Alternatively, EntityGroups can be used to 'tag' entities with an attribute. 

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    rpi_group = dcm.EntityGroup.objects.create(
        name="rpi",
        description="Entities based on a Raspberry Pi platform",
        basemap_element=False,
    )
    alpha_1.groups.set([rpi_group])

    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    rpi_group = factories.EntityGroupFactory(
        name="rpi",
        description="Entities based on a Raspberry Pi platform",
        basemap_element=False,
    )
    alpha_1.groups.set([rpi_group])
    ```

`basemap_element` indicates whether or not the entities in the given group should be drawn on the front end map or not. 


## **Regions**
Regions represent geographical areas of interest. They can represent a keep-out zone, an activation area, an entity's area of control, etc. Regions are named and are defined by their region type, the geometry of the area it represents, a z-value layer, and an optional geographical point. Scenarios can also optionally be related with specific regions. This could happen if different scenarios affect different test areas or if an activation area changes between rounds. However this relation would need to be specified on the `scenario` creation rather than the `region` creation. 

We'll create a region type first.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    koz_type = dcm.RegionType.objects.create(
        name="keep_out_zone",
        description="A keep-out zone",
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    koz_type = factories.RegionTypeFactory(
        name="keep_out_zone",
        description="A keep-out zone",
    )
    ```

Now we'll create the region.

=== "Django ORM"

    ``` python
    import json
    import data_collection.models as dcm
    geometry = {
        "coordinates": [
            [
                [-117.2443986,32.6648668],
                [-117.2354937,32.6667635],
                [-117.2352576,32.6721824],
                [-117.2471023,32.6707012],
                [-117.2443986,32.6648668]
            ]
        ],
        "type": "Polygon"
    }
    dcm.Region.objects.create(
        name="keep_out_zone_command_center",
        region_type=koz_type,
        geom=json.dumps(geometry),
        z_layer=1.0,
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    factories.RegionFactory(
        name="keep_out_zone_command_center",
        region_type=koz_type,
        geom="POLYGON ((-117.2443986 32.6648668, -117.2354937 32.6667635, -117.2354722 32.6697800, -117.2465873 32.6684434, -117.2443986 32.6648668))",
        z_layer=1.0,
        key_point=None,
    )
    ```
`geom` can take either a GeoJSON string (as seen in the Django ORM example) or WKT (as seen in the `factory_boy` example).

`z_layer` can be an arbitrary float value that makes sense in the given context.

!!! info "Note using `factory_boy` for Region"
    If `key_point` is not explicitly set to `None`, the factory will create an arbitrary point for it.

## **PoseSources**
Mole also has the ability to track entities as they move. We do this through the `Pose` model. Poses have a `PoseSource`, which distinguishes poses of different origins. 

For creating poses later, we'll need to have at least one `PoseSource`.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    gps_pose_source = dcm.PoseSource.objects.create(
        name="GPS",
        description="GPS provided pose source",
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    gps_pose_source = factories.PoseSourceFactory(
        name="GPS",
        description="GPS provided pose source",
    )
    ```

## **Servers**
In order to display maps, we'll need to set up a `Server`. This is a model that captures parameters used for the map display. 

We'll start with a `ServerType`.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    server_type = dcm.ServerType.objects.create(
        name="Tiled Aerial Imagery Server",
        description="Server that provides tiled aerial imagery",
        key="tiled_imagery",
    )
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    server_type = factories.ServerTypeFactory(
        name="Tiled Aerial Imagery Server",
        description="Server that provides tiled aerial imagery",
        key="tiled_imagery",
    )
    ```

Then we'll create some `ServerParams`.

=== "Django ORM"

    ``` python
    import json
    import data_collection.models as dcm
    value = {
        "lat":"32.709",
        "lng":"-117.248",
    }
    map_center_param = dcm.ServerParam.objects.create(
        name="Map Center",
        description="provides parameters for a map's center point",
        param="mapOptions",
        value=json.dumps(value),
    )
    zoom_param = dcm.ServerParam.objects.create(
        name="Zoom levels",
        description="provides parameters for a map's zoom levels",
        param="mapOptions",
        value='{"minZoom":1, "maxZoom":20}',
    )
    ```
=== "Factory Boy"

    ``` python
    import json
    from data_collection.factories import factories
    value = {
        "lat":"32.709",
        "lng":"-117.248",
    }
    map_center_param = factories.ServerParamFactory(
        name="Map Center",
        description="provides parameters for a map's center point",
        param="mapOptions",
        value=json.dumps(value),
    )
    zoom_param = factories.ServerParamFactory(
        name="Zoom levels",
        description="provides parameters for a map's zoom levels",
        param="mapOptions",
        value='{"minZoom":1, "maxZoom":20}',
    )
    ```

Now we can put it together into a `Server`. For using OpenStreetMap tiles, you can set the `base_url` to `https://a.tile.openstreetmap.org/{z}/{x}/{y}.png`. If using the OpenStreetMap tiles, keep the [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) in mind.

=== "Django ORM"

    ``` python
    import data_collection.models as dcm
    server = dcm.Server.objects.create(
        name="Local World Tiles",
        server_type=server_type",
        base_url="http://{window.location.hostname}/maps/styles/ne_simple_style/{z}/{x}/{y}.png",
    )
    server.server_params.set([map_center_param, zoom_param])
    ```
=== "Factory Boy"

    ``` python
    from data_collection.factories import factories
    server = factories.ServerFactory(
        name="Local World Tiles",
        server_type=server_type",
        base_url="http://{window.location.hostname}/maps/styles/ne_simple_style/{z}/{x}/{y}.png",
        server_params=[map_center_param, zoom_param],
    )
    ```

`base_url` contains the url for the map tiles, whether that's locally served (as in our example) or remotely hosted.


## **Further Configuration**

### **Game Clock**
See [Game Clock](game_clock.md).

### **Scripted Events**
See [Scenario Scripts](scenario_scripts.md).

### **Point Styles**
See [Map/Timeline Marker Styles](point_styles.md)

### **Entity States**
See [Entity States](entity_states.md)

### **Metadata Keys/Values**
See [Metadata Keys/Values](metadata_keyvalue.md)




## **Access Logs**

An access log for django can be found at `mole/_logs/access.log`. This will contain the remote address, username, date of request, where the request is for, HTTP status, response length, and referer.
