import { Resend } from 'resend';
import logger from '../utils/logger.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'HARCHIVE <no-reply@archive.cd>';

/**
 * Send a 6-digit verification code to the given email
 * @param {string} email
 * @param {string} code
 * @param {string} [purpose] - 'password_change' | 'email_change' | 'default'
 */
export async function sendVerificationCode(email, code, purpose = 'default') {
  const subjectMap = {
    password_change: `${code} — Confirmation changement de mot de passe`,
    email_change: `${code} — Confirmation changement d'adresse email`,
    default: `${code} — Code de vérification HARCHIVE`,
  };
  const bodyMap = {
    password_change: `Voici votre code pour confirmer le changement de mot de passe de votre compte HARCHIVE :`,
    email_change: `Voici votre code pour confirmer l'ajout de cette adresse email à votre compte HARCHIVE :`,
    default: `Voici votre code de vérification pour compléter votre inscription :`,
  };
  const subject = subjectMap[purpose] || subjectMap.default;
  const body = bodyMap[purpose] || bodyMap.default;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1e1e1e; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">HARCHIVE</h1>
          </div>
          <p style="color: #e5e7eb; font-size: 16px; margin-bottom: 8px;">Bonjour,</p>
          <p style="color: #d1d5db; font-size: 15px; margin-bottom: 24px;">${body}</p>
          <div style="background: #2a2a2a; border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #3b82f6;">${code}</span>
          </div>
          <p style="color: #9ca3af; font-size: 13px; margin-bottom: 4px;">
            Ce code expire dans <strong>10 minutes</strong>.
          </p>
          <p style="color: #9ca3af; font-size: 13px;">
            Si vous n'avez pas demandé ce code, ignorez cet email.
          </p>
          <hr style="border: none; border-top: 1px solid #404040; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 11px; text-align: center;">
            © ${new Date().getFullYear()} HARCHIVE — Plateforme de gestion scolaire
          </p>
        </div>
      `,
    });

    if (error) {
      logger.error('Resend error:', error);
      return false;
    }

    logger.info(`✅ Verification email sent to ${email} (id: ${data?.id})`);
    return true;
  } catch (err) {
    logger.error('Email send failed:', err.message);
    return false;
  }
}

/**
 * Generate a cryptographically random 6-digit code
 */
export function generateCode() {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}
