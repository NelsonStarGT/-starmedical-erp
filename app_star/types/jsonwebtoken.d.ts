declare module "jsonwebtoken" {
  export function sign(payload: any, secretOrPrivateKey: any, options?: any): string;
  export function verify(token: string, secretOrPublicKey: any, options?: any): any;
  export function decode(token: string, options?: any): any;
  const _default: {
    sign: typeof sign;
    verify: typeof verify;
    decode: typeof decode;
  };
  export default _default;
}
