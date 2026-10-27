import { ObjectId } from 'mongodb';
import { IDeviceInfo, createRefreshTokenDoc } from '@/models/token.model.js';
import { tokenRepository } from '@/repositories/token.repository.js';
import { hashToken } from '@/utils/crypto.js';
import { jwtService, TokenType } from '@/services/jwt.service.js';

class TokenService {
  private static instance: TokenService;

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  async generateAuthTokens(
    userId: string | ObjectId,
    role?: string,
    deviceInfo?: IDeviceInfo,
  ) {
    const rawUserId = typeof userId === 'string' ? userId : userId.toString();

    const { accessToken, refreshToken, sessionId } =
      jwtService.generateTokenPair(rawUserId, role);

    const hashedToken = hashToken(refreshToken);

    const expiresInMS = jwtService.getTokenExpirationTimeMS(TokenType.REFRESH);
    const expiresAt = new Date(Date.now() + expiresInMS);

    const tokenDoc = createRefreshTokenDoc({
      token: hashedToken,
      userId,
      sessionId,
      deviceInfo,
      expiresAt,
    });

    await tokenRepository.create(tokenDoc);

    return { accessToken, refreshToken, sessionId };
  }

  async verifyAndGetRefreshToken(tokenStr: string) {
    const payload = jwtService.verifyRefreshToken(tokenStr);
    if (!payload) return null;

    const dbToken = await tokenRepository.findBySessionId(payload.sessionId);
    if (!dbToken) return null;

    if (!dbToken.isActive) {
      await tokenRepository.revokeAllUserTokens(dbToken.userId);
      return null;
    }

    if (dbToken.token !== hashToken(tokenStr)) {
      return null;
    }

    void tokenRepository.updateLastUsed(dbToken._id);

    return { payload, dbToken };
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    return tokenRepository.revokeSession(sessionId);
  }

  async getUserActiveSessions(userId: string | ObjectId) {
    return tokenRepository.findActiveTokensByUserId(userId);
  }

  // Blacklist only needs to outlive the longest-lived access token of the session
  private blacklistExpiresAt(): Date {
    return new Date(
      Date.now() + jwtService.getTokenExpirationTimeMS(TokenType.ACCESS),
    );
  }

  async blacklistSession(
    sessionId: string,
    userId: string | ObjectId,
  ): Promise<void> {
    await tokenRepository.blacklistSessions(
      [{ sessionId, userId: new ObjectId(userId) }],
      this.blacklistExpiresAt(),
    );
  }

  async blacklistAndRevokeAllUserSessions(
    userId: string | ObjectId,
  ): Promise<void> {
    const activeSessions =
      await tokenRepository.findActiveTokensByUserId(userId);
    await tokenRepository.blacklistSessions(
      activeSessions
        .filter((s) => s.sessionId)
        .map((s) => ({ sessionId: s.sessionId!, userId: s.userId })),
      this.blacklistExpiresAt(),
    );
    await tokenRepository.revokeAllUserTokens(userId);
  }

  async blacklistAndRevokeUserSessionsExcept(
    userId: string | ObjectId,
    sessionId: string,
  ): Promise<void> {
    const activeSessions =
      await tokenRepository.findActiveTokensByUserId(userId);
    await tokenRepository.blacklistSessions(
      activeSessions
        .filter((s) => s.sessionId && s.sessionId !== sessionId)
        .map((s) => ({ sessionId: s.sessionId!, userId: s.userId })),
      this.blacklistExpiresAt(),
    );
    await tokenRepository.revokeAllUserTokensExceptSession(userId, sessionId);
  }
}

// Export duy nhất instance theo Singleton Pattern
export const tokenService = TokenService.getInstance();
