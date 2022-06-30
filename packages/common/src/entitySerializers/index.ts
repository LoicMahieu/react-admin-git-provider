import { JsonEntitySerializer } from "./json";

export type AnyEntitySerializer = JsonEntitySerializer;

export type SerializerOption = "json" | ["json", { indent: number }];

export const createSerializer = (
  option: SerializerOption,
): AnyEntitySerializer => {
  if (option === "json") {
    return new JsonEntitySerializer();
  }
  return new JsonEntitySerializer(option[1]);
};

