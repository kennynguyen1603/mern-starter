/**
 * Create an object composed of the picked object properties
 * @param {Object} object
 * @param {string[]} keys
 * @returns {Object}
 */
export const pick = <T extends object, K extends keyof T>(
  object: T,
  keys: K[],
): Pick<T, K> => {
  return keys.reduce(
    (obj, key) => {
      if (key in object) {
        obj[key] = object[key];
      }
      return obj;
    },
    {} as Pick<T, K>,
  );
};

const SENSITIVE_FIELDS: string[] = [
  'password',
  'confirmPassword',
  'token',
  'refreshToken',
];

const omitSensitive = (
  obj: Record<string, any> | undefined,
): Record<string, any> => {
  if (!obj || typeof obj !== 'object') return {};
  return Object.keys(obj).reduce(
    (acc, key) => {
      if (!SENSITIVE_FIELDS.includes(key)) {
        acc[key] = obj[key];
      }
      return acc;
    },
    {} as Record<string, any>,
  );
};

export const sanitizeRequest = (req: any) => ({
  method: req.method,
  url: req.originalUrl,
  params: req.params,
  query: req.query,
  body: omitSensitive(req.body),
  ip: req.ip || req.socket?.remoteAddress,
  userId: req.decodedAuthorization?.userId || 'ANONYMOUS',
});
