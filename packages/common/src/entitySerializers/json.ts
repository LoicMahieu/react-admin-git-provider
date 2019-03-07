import { EntitySerializer } from "./EntitySerializer";

export class JsonEntitySerializer implements EntitySerializer {
  private readonly indent: number;

  constructor({ indent = 2 }: { indent?: number } = {}) {
    this.indent = indent;
  }

  public parse(data: any) {
    return JSON.parse(data);
  }

  public stringify(data: any) {
    return JSON.stringify(data, null, this.indent);
  }
}
