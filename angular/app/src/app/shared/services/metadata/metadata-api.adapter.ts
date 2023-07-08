import { MetadataKey, MetadataValue } from '../../models';

export class MetadataApiAdapters {
  MetadataKeyAdapter(json: any): MetadataKey {
    let url = new URL(json.url);
    let metadataKey = {
      url: url.pathname,
      name: json.name,
      description: json.description,
      metadatavalue_set: json.metadatavalue_set
    };

    return metadataKey;
  }

  MetadataValueAdapter(json: any): MetadataValue {
    let url = new URL(json.url);
    let metadataValue = {
      url: url.pathname,
      name: json.name,
      description: json.description,
      metadata_keys: json.metadata_keys
    };

    return metadataValue;
  }
}