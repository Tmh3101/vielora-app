declare module "*.css" {
  const content: string;
  export default content;
}

declare module "jschardet" {
  export function detect(buffer: Buffer | string): {
    encoding: string | null;
    confidence: number;
  };
}
