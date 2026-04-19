import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '@/config/env/env.js';
import { authService } from '@/services/auth.service.js';

export const googleStrategy = new GoogleStrategy(
  {
    clientID: env.oauth.google.clientId,
    clientSecret: env.oauth.google.clientSecret,
    callbackURL: env.oauth.google.callbackUrl,
    scope: ['profile', 'email'],
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const result = await authService.handleGoogleCallback(profile);
      return done(null, result as any);
    } catch (error) {
      return done(error as Error, false);
    }
  },
);

export default googleStrategy;
