import nodemailer from "nodemailer";

/**
 * Send email utility
 * @param {Object} options - { email, subject, html }
 */
const sendEmail = async (options) => {
    // ⚠️ In development/test mode without credentials, we just log to console
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER.includes("your-email")) {
        console.log("-----------------------------------------");
        console.log("📧 MOCK EMAIL SENT");
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Link: ${options.html.match(/href="([^"]+)"/)?.[1] || "No link found"}`);
        console.log("-----------------------------------------");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM || "Waitly <noreply@waitly.app>",
        to: options.email,
        subject: options.subject,
        html: options.html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${options.email}`);
    } catch (error) {
        console.error("❌ EMAIL SEND ERROR:", error);
        throw new Error("Could not send email. Please check SMTP configuration.");
    }
};

export default sendEmail;
