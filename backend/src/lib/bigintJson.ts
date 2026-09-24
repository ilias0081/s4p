// JSON.stringify throws on bigint by default; Postgres int8/bigserial columns map to bigint here.
export {};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function toJSON(this: bigint) {
  return this.toString();
};
