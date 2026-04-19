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

  /**
   * Sinh và lưu trữ cặp Auth Tokens (Access Token + Refresh Token).
   * Tạo Token DB Record chứa Footprint của thiết bị (để quản lý phiên).
   */
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

  /**
   * Chuyên kiểm tra và xác thực Refresh Token.
   */
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

  async revokeAllUserSessions(userId: string | ObjectId): Promise<boolean> {
    return tokenRepository.revokeAllUserTokens(userId);
  }

  async getUserActiveSessions(userId: string | ObjectId) {
    return tokenRepository.findActiveTokensByUserId(userId);
  }
}

// Export duy nhất instance theo Singleton Pattern
export const tokenService = TokenService.getInstance();
