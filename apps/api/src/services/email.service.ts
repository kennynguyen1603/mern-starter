import { Resend } from 'resend';
import { env } from '@/config/env/env.js';
import { InternalServerError } from '@/core/error.response.js';

class EmailService {
  private static instance: EmailService;
  private resend: Resend;

  private constructor() {
    this.resend = new Resend(env.email.resendApiKey);
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: env.email.fromEmail,
      to,
      subject: 'Xác nhận địa chỉ email của bạn',
      html: `
        <p>Cảm ơn bạn đã đăng ký. Vui lòng click vào link bên dưới để xác nhận email:</p>
        <a href="${verifyUrl}">Xác nhận email</a>
        <p>Link này sẽ hết hạn sau 24 giờ.</p>
      `,
    });

    if (error) {
      throw new InternalServerError('Failed to send verification email');
    }
  }

  async sendPasswordResetOTP(to: string, otp: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: env.email.fromEmail,
      to,
      subject: 'Mã đặt lại mật khẩu của bạn',
      html: `
        <p>Mã OTP đặt lại mật khẩu của bạn là:</p>
        <h2>${otp}</h2>
        <p>Mã này sẽ hết hạn sau 10 phút. Không chia sẻ mã này với bất kỳ ai.</p>
      `,
    });

    if (error) {
      throw new InternalServerError('Failed to send password reset email');
    }
  }
}

export const emailService = EmailService.getInstance();
