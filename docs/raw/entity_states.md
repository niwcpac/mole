Entity states add the ability to track how events affect entities, as well as modify 
entity appearance in the UI via point style overrides and transforms. The fields in the 
Entity State model describe entity point style overrides and transforms that will be 
serialized when an Entity is related to an Event (seen on the `related_entities` 
property on the event).

## EntityState
``` python
example_entity_state = factories.EntityStateFactory(
    name="example_state",
    point_style_icon_transform="{icon}_example",
    point_style_color_transform="#00AA00",
    point_style_use_marker_pin_override=True,
    point_style_marker_color_transform="{marker_color}33",
    point_style_scale_factor_override=7,
    point_style_animation_transform="Previous animation: {animation}",
    point_style_render_as_symbol_override=True,
)
```

**Field Descriptions:**

- **`name`**: the name of the entity state
- **`point_style_icon_transform`**: transforms or overrides the entity's icon, 
transforms must use keyword `icon` in curly braces. The above example would transform 
the icon string "test.svg" into "test_example.svg". Notice that transforms are applied 
before the file extension.
- **`point_style_color_transform`**: transforms or overrides the entity's color, 
transforms must use keyword `color` in curly braces. Colors are represented as hex 
strings. If you are confident that the entity type point style color property does not 
include an alpha value, you could use the transform to add an alpha value. Otherwise, 
common use for this property would be to override the color entirely. The above example 
would transform the color string "#00FF00" into "#00AA00".
- **`point_style_use_marker_pin_override`**: overrides the entity's `use_marker_pin` 
property. The above example would change the property "False" to "True".
- **`point_style_marker_color_transform`**: transforms or overrides the entity's marker 
color, transforms must use keyword `marker_color` in curly braces. Colors are 
represented as hex strings. If you are confident that the entity type point style 
marker color property does not include an alpha value, you could use the transform to 
add an alpha value. Otherwise, common use for this property would be to override the 
marker color entirely. The above example would transform the color string "#00FF00" 
into "#00FF0033".
- **`point_style_scale_factor_override`**: overrides the entity's `scale_factor` 
property. The above example would override the scale factor "3" into "7".
- **`point_style_animation_transform`**: transforms or overrides the entity's animation 
color, transforms must use keyword `animation` in curly braces. The above example would 
change the animation "test" into "Previous animation: test".
- **`point_style_render_as_symbol_override`**: overrides the entity's `render_as_symbol` 
property. The above example would change the property "False" to "True".

By default, the base point style will be inherited from the point style on the entity's 
type. Learn more about point styles [here](basic_config.md#marker-styles). The fields 
with the `_transform` suffix use a Python string format to inject the previous value 
(from the entity's point style) into the new value using the point style property name 
as the format argument. The fields with the `_override` suffix will do a direct value 
override. Overrides are also possible on `_transform` fields by omitting the point 
style property reference.

The state is then associated to the `EntityEventRole` that correlates to it. 

## EntityEventRole
``` python
example_role = factories.EntityEventRoleFactory(
    name="example_role", 
    metadata_key="example_role",
    entity_state=example_entity_state,
    valid_event_types=[example_event_type],
    valid_entity_types=[example_entity_type]
    valid_entity_groups=[example_entity_group]
)
```

**Field Descriptions:**

- **`name`**: the name of the entity event role
- **`metadata_key`**: event metadata key used to relate an entity to the event
- **`entity_state`**: the entity state to apply to the entity related to the event
- **`valid_event_types`**: entities will only be related to events of an event type 
listed in this field, or to an event of any type if none specified
- **`valid_entity_types`**: entities will only be related to events if the entity's 
entity type is listed in this field, or will be related regardless of entity type if 
none specified
- **`valid_entity_groups`**: entities will only be related to events if the entity is in 
an entity group listed in this field, or will be related regardless of entity group if 
none specified

In brief, entity event roles define the part an entity plays in an event. 

When an event is created, the serializer will check the event `metadata` for the 
`metadata_key` defined in the EntityEventRole instance and validate its value. If the 
value of this key matches the `name` of an existing entity, the serializer will attempt 
to relate the entity to the event and apply the state to the entity. 

You may optionally define entity types, event types, and `entity_groups` to qualify the 
entity for state transitions in the `valid_entity_types`, `valid_event_types`, and 
`valid_entity_groups` fields respectively. If either list is empty, a validation check 
will not be run on it. 

Validated entities will be serialized in the `related_entities` property on the event 
along with their transformed point style. The names of entities that were found in the 
metadata but did not pass validation will be listed in the `invalid_entities` property 
on the event. If the entity does not exist, it will be listed in the `unfound_entities` 
property on the event.