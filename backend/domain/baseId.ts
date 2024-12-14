import { v7 as uuidv7 } from "uuid";

import { BaseVO } from "./baseVo";

export class BaseId extends BaseVO<string> {
  constructor(value: string) {
    super(value);
  }

  static create(value?: string): BaseId {
    return new this(value || uuidv7());
  }
}
