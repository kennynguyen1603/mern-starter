import passport from 'passport';
import googleStrategy from './google.js';

passport.use(googleStrategy);

export default passport;
