import { serialize as borshSerialize } from "borsh";

const FastfsSchema = new (class BorshSchema {
  FastfsFileContent = {
    struct: {
      mimeType: "string",
      content: { array: { type: "u8" } },
    },
  };
  SimpleFastfs = {
    struct: {
      relativePath: "string",
      content: { option: this.FastfsFileContent },
    },
  };
  FastfsData = {
    enum: [{ struct: { simple: this.SimpleFastfs } }],
  };
})();

export function encodeFfs(ffs) {
  return borshSerialize(FastfsSchema.FastfsData, ffs);
}
