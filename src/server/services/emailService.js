import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.FROM_EMAIL || "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const sendEmail = async ({ to, subject, text }) => {
  if (!resend || !fromEmail || !to) {
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.warn("sendEmail skipped/fail", error?.message || error);
  }
};
