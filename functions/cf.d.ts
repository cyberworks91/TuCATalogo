declare type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
  params: Record<string, string>;
}) => Promise<Response> | Response;

declare class HTMLRewriter {
  on(selector: string, handlers: any): HTMLRewriter;
  transform(response: Response): Response;
}
