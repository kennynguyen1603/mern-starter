import jwt from 'jsonwebtoken';
import { jwtService, TokenType } from '@/services/jwt.service.js';

const SIGN_OPTS = { issuer: 'mern-server', audience: 'mern-client' };

describe('jwtService', () => {
  const payload = { userId: 'user-1', role: 'user', sessionId: 'session-1' };

  it('generates an access token that verifies with its payload', () => {
    const token = jwtService.generateAccessToken(payload);
    expect(jwtService.verifyAccessToken(token)).toMatchObject({
      ...payload,
      type: TokenType.ACCESS,
    });
  });

  it('generates a refresh token that verifies with its payload', () => {
    const token = jwtService.generateRefreshToken({
      userId: 'user-1',
      sessionId: 'session-1',
    });
    expect(jwtService.verifyRefreshToken(token)).toMatchObject({
      userId: 'user-1',
      sessionId: 'session-1',
      type: TokenType.REFRESH,
    });
  });

  it('generates a token pair sharing one session id', () => {
    const pair = jwtService.generateTokenPair('user-1', 'admin');
    const access = jwtService.verifyAccessToken(pair.accessToken);
    const refresh = jwtService.verifyRefreshToken(pair.refreshToken);
    expect(access).toMatchObject({ sessionId: pair.sessionId, role: 'admin' });
    expect(refresh).toMatchObject({ sessionId: pair.sessionId });
  });

  it('rejects a refresh token used as an access token and vice versa', () => {
    const pair = jwtService.generateTokenPair('user-1');
    expect(jwtService.verifyAccessToken(pair.refreshToken)).toBeNull();
    expect(jwtService.verifyRefreshToken(pair.accessToken)).toBeNull();
  });

  it('returns "expired" for an expired access token', () => {
    const token = jwt.sign(
      { ...payload, type: TokenType.ACCESS },
      'test-access-secret-0123456789abcdef',
      { ...SIGN_OPTS, expiresIn: -10 },
    );
    expect(jwtService.verifyAccessToken(token)).toBe('expired');
  });

  it('returns null for tokens signed with the wrong secret or audience', () => {
    const wrongSecret = jwt.sign(
      { ...payload, type: TokenType.ACCESS },
      'other-secret',
      SIGN_OPTS,
    );
    const wrongAudience = jwt.sign(
      { ...payload, type: TokenType.ACCESS },
      'test-access-secret-0123456789abcdef',
      { issuer: 'mern-server', audience: 'someone-else' },
    );
    expect(jwtService.verifyAccessToken(wrongSecret)).toBeNull();
    expect(jwtService.verifyAccessToken(wrongAudience)).toBeNull();
    expect(jwtService.verifyAccessToken('not-a-jwt')).toBeNull();
    expect(jwtService.verifyRefreshToken('not-a-jwt')).toBeNull();
  });

  it('converts configured expirations to milliseconds', () => {
    expect(jwtService.getTokenExpirationTimeMS(TokenType.ACCESS)).toBe(
      15 * 60 * 1000,
    );
    expect(jwtService.getTokenExpirationTimeMS(TokenType.REFRESH)).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });

  it('generates random hex session ids', () => {
    expect(jwtService.generateSessionId()).toMatch(/^[0-9a-f]{32}$/);
    expect(jwtService.generateSessionId()).not.toBe(
      jwtService.generateSessionId(),
    );
  });
});
