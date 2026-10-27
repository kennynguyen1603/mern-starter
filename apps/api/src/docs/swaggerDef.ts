import pkg from '../../package.json' with { type: 'json' };
import { env } from '@/config/env/env.js';

const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'MERN Starter API',
    version: pkg.version,
  },
  servers: [
    {
      url: `http://localhost:${env.port}/api/v1`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
      },
    },
  },
};

export default swaggerDef;
