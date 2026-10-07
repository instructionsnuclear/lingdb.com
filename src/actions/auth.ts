"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { transporter } from "@/lib/email/client";
import { renderVerifyEmail } from "@/lib/email/templates/verify-email";
import { renderForgotPasswordEmail } from "@/lib/email/templates/forgot-password";
import { APP_URL } from "@/lib/utils/constants";
import { sendAdminNewUserNotification } from "@/lib/email/notify-admin";
import { getOrCreateDbUser } from "@/lib/db/auth-helper";

/**
 * Sign up a new user with email + password.
 * Creates the confirmed user directly via admin API without requiring email verification.
 */
export async function signUp(
  email: string,
  password: string,
  captchaDuration?: number,
  honeypot?: string,
  locale: string = "en",
) {
  try {
    // Honeypot check
    if (honeypot && honeypot.length > 0) {
      // Ssssh, don't tell the bot we caught them, just return as if it's a generic error
      // or even success to waste their time, but here we return a generic error.
      return {
        success: false,
        error: "Registration failed. Please try again.",
      };
    }

    // Basic server-side CAPTCHA validation
    if (!captchaDuration || captchaDuration < 200) {
      return {
        success: false,
        error: "CAPTCHA verification failed. Please try again.",
      };
    }
    const admin = createAdminClient();

    // Create user with email_confirm: true (direct signup without email verification)
    const { data: createData, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { locale },
      });

    if (createError) {
      // If user already exists, return a friendly message
      if (createError.message.includes("already been registered")) {
        return {
          success: false,
          error: "An account with this email already exists.",
        };
      }
      console.error("Error creating user:", createError);
      return { success: false, error: createError.message };
    }

    // Ensure the user record is created in the database immediately
    if (createData.user) {
      await getOrCreateDbUser(createData.user, locale).catch(console.error);

      // Notify admin (fire and forget)
      sendAdminNewUserNotification(
        email.split("@")[0],
        email,
      ).catch(console.error);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Unexpected error in signUp:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

/**
 * Resend verification email for an existing unconfirmed user.
 */
export async function resendVerificationEmail(email: string) {
  try {
    const admin = createAdminClient();

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError || !linkData) {
      console.error("Error generating verification link:", linkError);
      return { success: false, error: "Failed to generate verification link." };
    }

    const tokenHash = linkData.properties.hashed_token;
    const verifyUrl = `${APP_URL}/api/auth/verify?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`;

    const html = renderVerifyEmail(email.split("@")[0], verifyUrl);
    await transporter.sendMail({
      from: `"Lingdb" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify your Lingdb account",
      html,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Unexpected error in resendVerificationEmail:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

/**
 * Send a password reset email with a recovery link.
 */
export async function sendPasswordResetEmail(email: string) {
  try {
    const admin = createAdminClient();

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (linkError || !linkData) {
      console.error("Error generating recovery link:", linkError);
      return { success: false, error: "Failed to generate reset link." };
    }

    const tokenHash = linkData.properties.hashed_token;
    const verifyUrl = `${APP_URL}/api/auth/verify?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

    const html = renderForgotPasswordEmail(email.split("@")[0], verifyUrl);
    await transporter.sendMail({
      from: `"Lingdb" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset your Lingdb password",
      html,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Unexpected error in sendPasswordResetEmail:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
