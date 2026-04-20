import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import Handlebars, { TemplateDelegate } from 'handlebars';
import { Resend } from 'resend';
import { env } from '@/config/env/env.js';
import { InternalServerError } from '@/core/error.response.js';

const APP_NAME = 'MERN App';
const TEMPLATES_DIR = new URL('../templates/emails/', import.meta.url);

// ─── Template Engine ──────────────────────────────────────────────────────────

class TemplateEngine {
  private static instance: TemplateEngine;
  private cache = new Map<string, TemplateDelegate>();
  private layout: TemplateDelegate | null = null;

  private constructor() {
    this.registerPartials();
  }

  static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  private registerPartials(): void {
    const partialsDir = fileURLToPath(new URL('partials/', TEMPLATES_DIR));
    const files = readdirSync(partialsDir).filter((f) => f.endsWith('.hbs'));
    for (const file of files) {
      const name = file.replace('.hbs', '');
      const content = readFileSync(`${partialsDir}/${file}`, 'utf-8');
      Handlebars.registerPartial(name, content);
    }
  }

  private getLayout(): TemplateDelegate {
    if (!this.layout) {
      const layoutPath = fileURLToPath(
        new URL('layouts/base.hbs', TEMPLATES_DIR),
      );
      this.layout = Handlebars.compile(readFileSync(layoutPath, 'utf-8'));
    }
    return this.layout;
  }

  private getTemplate(name: string): TemplateDelegate {
    if (!this.cache.has(name)) {
      const path = fileURLToPath(new URL(`${name}.hbs`, TEMPLATES_DIR));
      this.cache.set(name, Handlebars.compile(readFileSync(path, 'utf-8')));
    }
    return this.cache.get(name)!;
  }

  render(templateName: string, data: Record<string, unknown>): string {
    const body = this.getTemplate(templateName)(data);
    return this.getLayout()({ appName: APP_NAME, ...data, body });
  }
}

// ─── Email Service ────────────────────────────────────────────────────────────

class EmailService {
  private static instance: EmailService;
  private resend: Resend;
  private templates: TemplateEngine;

  private constructor() {
    this.resend = new Resend(env.email.resendApiKey);
    this.templates = TemplateEngine.getInstance();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendVerificationEmail(
    to: string,
    token: string,
    name?: string,
  ): Promise<void> {
    const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;

    const html = this.templates.render('verify-email', {
      subject: 'Xác nhận địa chỉ email của bạn',
      name,
      verifyUrl,
      expiresIn: '24 giờ',
    });

    const { error } = await this.resend.emails.send({
      from: env.email.fromEmail,
      to,
      subject: 'Xác nhận địa chỉ email của bạn',
      html,
    });

    if (error) {
      throw new InternalServerError(
        `Failed to send verification email: ${error.message}`,
      );
    }
  }

  async sendPasswordResetOTP(
    to: string,
    otp: string,
    name?: string,
  ): Promise<void> {
    const html = this.templates.render('password-reset', {
      subject: 'Mã đặt lại mật khẩu của bạn',
      name,
      otp,
      expiresIn: '10 phút',
    });

    const { error } = await this.resend.emails.send({
      from: env.email.fromEmail,
      to,
      subject: 'Mã đặt lại mật khẩu của bạn',
      html,
    });

    if (error) {
      console.error('Resend Error:', error);
      throw new InternalServerError(
        `Failed to send password reset email: ${error.message}`,
      );
    }
  }
}

// Export duy nhất instance theo Singleton Pattern
export const emailService = EmailService.getInstance();
