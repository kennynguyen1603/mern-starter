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
  // req.ip honours the `trust proxy` setting; raw forwarding headers are client-controlled
  return req.ip || req.socket.remoteAddress || '0.0.0.0';
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
