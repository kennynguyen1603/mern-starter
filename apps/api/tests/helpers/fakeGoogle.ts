import passport from 'passport';
import type { Profile } from 'passport-google-oauth20';
import { authService } from '@/services/auth.service.js';

let nextProfile: Profile | null = null;

// Replaces the Google strategy so integration tests never reach Google:
// it feeds a canned profile straight into the real authService logic.
class FakeGoogleStrategy extends passport.Strategy {
  name = 'google';

  authenticate(): void {
    if (!nextProfile) return this.fail();
    authService
      .handleGoogleCallback(nextProfile)
      .then((result) => this.success(result))
      .catch((err: Error) => this.error(err));
  }
}

export const installFakeGoogle = (): void => {
  passport.use('google', new FakeGoogleStrategy());
};

export const setGoogleProfile = (profile: Profile | null): void => {
  nextProfile = profile;
};

export const googleProfile = (
  overrides: { id?: string; email?: string; name?: string } = {},
): Profile => {
  const email = overrides.email ?? 'google.user@example.com';
  return {
    provider: 'google',
    id: overrides.id ?? 'google-id-123',
    displayName: overrides.name ?? 'Google User',
    emails: [{ value: email, verified: true }],
    photos: [{ value: 'https://example.com/avatar.png' }],
    profileUrl: '',
    _raw: '',
    _json: {
      iss: 'https://accounts.google.com',
      aud: 'test',
      sub: overrides.id ?? 'google-id-123',
      iat: 0,
      exp: 0,
      email,
      email_verified: true,
    },
  };
};
