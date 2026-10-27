export const emailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetOTP: jest.fn().mockResolvedValue(undefined),
};

export default emailService;
