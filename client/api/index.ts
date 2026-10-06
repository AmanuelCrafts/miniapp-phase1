import { createApp } from './server/src/app.js';

const app = createApp({ enableRequestLogging: false });

export default function handler(req: any, res: any) {
  return app(req, res);
}