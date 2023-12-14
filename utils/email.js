const nodemailer = require("nodemailer");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `<${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === "production") {
      // Sendgrid
      return 1;
    }
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: `${process.env.EMAIL_USERNAME}`,
        pass: `${process.env.EMAIL_PASSWORD}`,
      },
    });
  }

  async send(subject, textOfList) {
    // Send the actual email
    // 1) Render HTML based on a pug template
    const text = `${textOfList} ${this.url}
                  Thank you, God bless!
                  p - Big Tako, CEO`;
    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text,
      // html:
    };

    // 3) Create a transport and send email and Actually send the email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome(letterText) {
    await this.send("Account Activation", letterText);
  }

  async sendPasswordReset(letterText) {
    await this.send(
      "Your password reset token (valid for only 10 minutes)",
      letterText
    );
  }
};
