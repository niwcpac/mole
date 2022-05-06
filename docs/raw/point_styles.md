
## **Map / Timeline Marker Styles**

This section describes marker style definition and associating these styles with event_types and entity_types.  These marker styles are used to represent event types and entity types on the map and in the event timeline.  The icons are typically taken from the FontAwesome set or from locally-served .svg icons.

### **Marker Styles**

Markers are styled using the PointStyle model in Mole.  It has the following fields:

* **name:** Name of this point style
* **description:** Description of this point style
* **icon:** String representing the icon to be used from the FontAwesome 5 library. Find icons [here](https://fontawesome.com/v5/search).
* **color:** CSS color code to be applied to the icon (e.g., `#FFFFFF` for white)
* **use_marker_pin:** Boolean field indicating wheather this icon should be shown in a marker pin on the map.  Note this has no effect on the event timeline.
* **marker_color:** CSS color code to be applied to the map marker pin icon (e.g., `#FFFFFF` for white)
* **scale_factor:** An optional parameter to adjust sizing of the icon.

### **Marker Compositing**

Point style is an element (foreign key) of the EventType and EntityType models.  In order to determine how a particular event marker is to be styled, the following method is used:

* The point style associated with the event's event_type is used as a starting point.
* The metadata_style_fields (on event_type) is used to override this style.  It represents a list of fields (keys) within the event's metadata whose values represent the name of an entity.  
* For each entity in this list, the entity's entity_type point_style replaces (for any non-null values) the associated event's event_type point_style in order.  
* In this way, fields occuring at the end of the metadata_style_fields have precedence over earlier occuring fields.  
* Note: if only a single point_style element is desired to be replaced by the entity_type style (e.g. the icon string), all other fields within its point_style may be null.
* The resulting point_style is returned in the event's point_style field.