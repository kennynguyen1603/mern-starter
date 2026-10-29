export const RESPONSE_MESSAGES = {
  USERS: {
    EMAIL_ALREADY_IN_USE: 'Email have been already used.',
    USER_NOT_EXISTS: "User don't exist",
    UPDATE: 'User updated Successfully!',
    DELETED: 'User deleted successfully!',
    GET_ALL: 'Get all users successfully',
  },
  AUTH: {
    REGISTER_SUCCESS: 'Account created successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logged out successfully',
    LOGOUT_ALL_SUCCESS: 'Logged out from all devices successfully',
    REFRESH_SUCCESS: 'Token refreshed successfully',
    INVALID_CREDENTIALS: 'Invalid email or password',
    INVALID_REFRESH_TOKEN: 'Refresh token is invalid or expired',
    ACCOUNT_INACTIVE:
      'Your account has been deactivated. Please contact support.',
    ACCOUNT_BANNED: 'Your account has been banned. Please contact support.',
    EMAIL_NOT_VERIFIED: 'Please verify your email before logging in.',
    GOOGLE_ONLY_ACCOUNT:
      'This account uses Google login. Please sign in with Google.',
    INVALID_TOKEN: 'Token is invalid or expired',
    EMAIL_ALREADY_VERIFIED: 'Email is already verified',
    EMAIL_VERIFICATION_SENT: 'Verification email sent',
    EMAIL_VERIFIED: 'Email verified successfully',
    FORGOT_PASSWORD_SENT:
      'If an account exists with this email, you will receive a reset code',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    PASSWORD_SET: 'Password set successfully',
    NO_PASSWORD_SET: 'This account has no password. Use set-password instead.',
    INVALID_CURRENT_PASSWORD: 'Current password is incorrect',
    PASSWORD_SAME_AS_CURRENT:
      'New password must be different from current password',
    PASSWORD_ALREADY_SET: 'Password already set. Use change-password instead.',
    GOOGLE_LOGIN_SUCCESS: 'Google login successful',
    ACCOUNT_LINK_SUCCESS: 'Google account linked successfully',
    GOOGLE_ALREADY_LINKED:
      'This Google account is already linked to another user',
    TOKEN_EXPIRED: 'Access token has expired. Please refresh your session.',
    INVALID_ACCESS_TOKEN: 'Invalid access token. Please login again.',
    SESSION_REVOKED: 'Your session has been revoked. Please login again.',
  },
};
