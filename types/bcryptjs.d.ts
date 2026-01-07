declare module "bcryptjs" {
  export function hash(data: any, saltOrRounds: any): Promise<string>;
  export function compare(data: any, encrypted: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
  const _default: {
    hash: typeof hash;
    compare: typeof compare;
    genSalt: typeof genSalt;
  };
  export default _default;
}
