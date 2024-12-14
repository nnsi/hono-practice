export class BaseVO<T> {
  protected readonly _value: T;

  protected constructor(value: T) {
    this._value = value;
  }

  get value(): T {
    return this._value;
  }

  public toString(): string {
    return String(this._value);
  }

  public equals(other?: BaseVO<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    return this.value === other.value;
  }
}
