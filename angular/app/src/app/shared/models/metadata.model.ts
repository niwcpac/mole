export interface MetadataKey {
  url: string;
  name: string;
  description: string;
  metadatavalue_set: Array<string>;
}

export interface MetadataValue {
  url: string;
  name: string;
  description: string;
  metadata_keys: Array<string>;
}
