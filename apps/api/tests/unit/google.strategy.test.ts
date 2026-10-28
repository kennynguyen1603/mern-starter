import { googleStrategy } from '@/config/passport/google.js';
import { authService } from '@/services/auth.service.js';
import { googleProfile } from '../helpers/fakeGoogle.js';

type Verify = (
  accessToken: string,
  refreshToken: string,
  profile: unknown,
  done: jest.Mock,
) => Promise<unknown>;

const verify = (googleStrategy as unknown as { _verify: Verify })._verify;

describe('googleStrategy verify callback', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects a Google profile whose email is not verified', async () => {
    const spy = jest.spyOn(authService, 'handleGoogleCallback');
    const profile = googleProfile();
    profile._json.email_verified = false;
    const done = jest.fn();

    await verify('at', 'rt', profile, done);

    expect(done).toHaveBeenCalledWith(null, false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a Google profile without email_verified', async () => {
    const spy = jest.spyOn(authService, 'handleGoogleCallback');
    const profile = googleProfile();
    delete (profile._json as { email_verified?: boolean }).email_verified;
    const done = jest.fn();

    await verify('at', 'rt', profile, done);

    expect(done).toHaveBeenCalledWith(null, false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('passes the authService result to passport on success', async () => {
    const result = { type: 'merge_required' as const, pendingToken: 'p' };
    jest.spyOn(authService, 'handleGoogleCallback').mockResolvedValue(result);
    const done = jest.fn();

    await verify('at', 'rt', googleProfile(), done);

    expect(done).toHaveBeenCalledWith(null, result);
  });

  it('forwards errors from authService to passport', async () => {
    const error = new Error('boom');
    jest.spyOn(authService, 'handleGoogleCallback').mockRejectedValue(error);
    const done = jest.fn();

    await verify('at', 'rt', googleProfile(), done);

    expect(done).toHaveBeenCalledWith(error, false);
  });
});
