import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '@/config/env/env.js';
import { authService } from '@/services/auth.service.js';

export const googleStrategy = new GoogleStrategy(
  {
    clientID: env.oauth.google.clientId,
    clientSecret: env.oauth.google.clientSecret,
    callbackURL: env.oauth.google.callbackUrl,
    scope: ['profile', 'email'],
    state: true,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    if (profile._json.email_verified === false) return done(null, false);
    try {
      const result = await authService.handleGoogleCallback(profile);
      return done(null, result as unknown as Express.User);
    } catch (error) {
      return done(error as Error, false);
    }
  },
);

export default googleStrategy;
