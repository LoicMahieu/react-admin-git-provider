import { JsonEntitySerializer } from "./json";

export type AnyEntitySerializer = JsonEntitySerializer

export interface ISerializers {
  json: typeof JsonEntitySerializer;
}

export const serializers = {
  json: JsonEntitySerializer
}
