import { Request } from 'express';
import * as UAParser from 'ua-parser-js';

export interface SecurityContext {
  ip: string;
  userAgent: string;
  deviceInfo: {
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    deviceType?: string;
    deviceVendor?: string;
    deviceModel?: string;
  };
}

/**
 * Get the actual IP address of the client, handling cases where the client is behind a proxy
 */
export function getClientIp(req: Request): string {
  // Priority order of headers to get IP
  const ipHeaders = [
    'x-client-ip',
    'x-forwarded-for',
    'cf-connecting-ip', // Cloudflare
    'x-real-ip',
    'x-forwarded',
    'forwarded-for',
    'x-cluster-client-ip',
    'x-forwarded',
  ];

  for (const header of ipHeaders) {
    const value = req.headers[header] as string | undefined;
    if (value) {
      // Get the first IP in the string (if there are multiple IPs)
      const ip = value.split(',')[0].trim();
      if (ip) return ip;
    }
  }

  // Fallback to connection remote address
  return req.socket.remoteAddress || '0.0.0.0';
}

/**
 * Parse information from User-Agent
 */
export function parseUserAgent(userAgent: string) {
  const parser = new UAParser.UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name,
    browserVersion: result.browser.version,
    os: result.os.name,
    osVersion: result.os.version,
    deviceType: result.device.type || 'desktop',
    deviceVendor: result.device.vendor,
    deviceModel: result.device.model,
  };
}

/**
 * Get the entire security context from the request
 */
export function getSecurityContext(req: Request): SecurityContext {
  const userAgent = req.headers['user-agent'] || 'unknown';

  return {
    ip: getClientIp(req),
    userAgent,
    deviceInfo: parseUserAgent(userAgent),
  };
}

/**
 * Generate device ID từ user agent và IP
 */
export function generateDeviceId(
  userAgent?: string,
  ipAddress?: string,
): string {
  const components = [userAgent || 'unknown', ipAddress || '0.0.0.0'];

  // Create a unique string from the components and hash it
  return Buffer.from(components.join('|')).toString('base64').slice(0, 32);
}
