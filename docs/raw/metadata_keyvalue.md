Specifying metadata keys/values reduce the amount of data cleaning required for analysis and reporting, especially in cases where the user types information in. They provide a kind of template for events by suggesting the provided metadata keys and offering a dropdown list of values to assign to those keys. 

## Metadata Key
``` python
example_metadatakey = factories.MetadataKeyFactory(
    name="Behavior",
    description="",
    event_type_list=[factories.EventTypeFactory(name="Interaction")],
    metadatavalue_set=[factories.MetadataValueFactory(name="Appropriate")],
)
```

**Field Descriptions:**

- **`name`**: the unique name of the metadata key
- **`description`**: the description of the metadata key
- **`event_type_list`**: the list of event types this metadata key should be expected on
- **`metadatavalue_set`**: the list of expected metadata values this key could be set to


## Metadata Value
``` python
factories.MetadataValueFactory(
    name="Appropriate", 
    description="Executed a behavior or maneuver as designed and expected within given tolerances and boundaries",
    metadata_keys=[factories.MetadataKeyFactory(name="Behavior"),],
)
```

**Field Descriptions:**

- **`name`**: the unique name of the metadata value
- **`description`**: the description or long form text of the metadata value
- **`metadata_keys`**: the list of metadata keys that this value could applied to

`metadatavalue_set` on MetadataKey and `metadata_keys` on MetadataValue do the same thing. Only one of these fields needs to be populated to tie the key and value together. There is no need to define them both. 