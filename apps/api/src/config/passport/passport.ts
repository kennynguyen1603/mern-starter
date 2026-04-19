import passport from 'passport';
import googleStrategy from './google.js';

passport.use(googleStrategy);
// passport.use(twitterStrategy) — reserved for future Twitter integration

export default passport;
