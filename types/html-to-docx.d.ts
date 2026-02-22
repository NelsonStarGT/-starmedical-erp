declare module "html-to-docx" {
  const htmlToDocx: (html: string, options?: any, additionalOptions?: any) => Promise<Buffer>;
  export default htmlToDocx;
}
