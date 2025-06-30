export class DomainValidateError extends Error {
  public status: 400;

  constructor(message: string) {
    super(message);
    this.status = 400;
  }
}
