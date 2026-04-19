import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '@/config/env/env.js';

const ISSUER = 'mern-server';
const AUDIENCE = 'mern-client';
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export interface AccessTokenPayload {
  userId: string;
  role?: string;
  sessionId: string;
  type: TokenType.ACCESS;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  type: TokenType.REFRESH;
}

class JWTService {
  generateAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
    const tokenPayload = { ...payload, type: TokenType.ACCESS };
    const secret = env.jwt.accessSecret!;
    const expiresIn = env.jwt.accessSecretExp || '15m';

    return jwt.sign(tokenPayload, secret, {
      expiresIn: expiresIn as any,
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  }

  generateRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): string {
    const tokenPayload = { ...payload, type: TokenType.REFRESH };
    const secret = env.jwt.refreshSecret!;
    const expiresIn = env.jwt.refreshSecretExp || '7d';

    return jwt.sign(tokenPayload, secret, {
      expiresIn: expiresIn as any,
      issuer: ISSUER,
      audience: AUDIENCE,
    });
  }

  generateTokenPair(userId: string, role?: string) {
    const sessionId = this.generateSessionId();
    const accessToken = this.generateAccessToken({ userId, role, sessionId });
    const refreshToken = this.generateRefreshToken({ userId, sessionId });

    return {
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const secret = env.jwt.accessSecret!;
      const payload = jwt.verify(token, secret, {
        issuer: ISSUER,
        audience: AUDIENCE,
      }) as AccessTokenPayload;

      if (payload.type !== TokenType.ACCESS) return null;
      return payload;
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const secret = env.jwt.refreshSecret!;
      const payload = jwt.verify(token, secret, {
        issuer: ISSUER,
        audience: AUDIENCE,
      }) as RefreshTokenPayload;

      if (payload.type !== TokenType.REFRESH) return null;
      return payload;
    } catch (error) {
      return null;
    }
  }

  getTokenExpirationTimeMS(
    tokenType: TokenType.ACCESS | TokenType.REFRESH,
  ): number {
    const expiresIn =
      tokenType === TokenType.ACCESS
        ? env.jwt.accessSecretExp || '15m'
        : env.jwt.refreshSecretExp || '7d';

    const timeUnit = expiresIn.slice(-1);
    const timeValue = parseInt(expiresIn.slice(0, -1));

    switch (timeUnit) {
      case 's':
        return timeValue * 1000;
      case 'm':
        return timeValue * 60 * 1000;
      case 'h':
        return timeValue * 60 * 60 * 1000;
      case 'd':
        return timeValue * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }

  generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

const jwtService = new JWTService();
export default jwtService;
