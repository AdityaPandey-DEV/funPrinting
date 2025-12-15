declare module 'node-fetch' {
  export default function fetch(
    url: string | URL,
    init?: RequestInit
  ): Promise<Response>;
  
  export class Response {
    ok: boolean;
    status: number;
    statusText: string;
    buffer(): Promise<Buffer>;
    json(): Promise<any>;
    text(): Promise<string>;
  }
  
  export interface RequestInit {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }
}

