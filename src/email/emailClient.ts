import nodemailer from 'nodemailer'
import { EMAIL_SENDING_ADDRESS, EMAIL_SENDING_PASSWORD, EMAIL_SENDING_SERVICE } from './constants'

export class EmailClient {
  public transport: nodemailer.Transporter
  constructor (public service: string, public email: string, public password: string) {
    this.transport = this.getTransport()
  }

  static create () {
    return new EmailClient(EMAIL_SENDING_SERVICE, EMAIL_SENDING_ADDRESS, EMAIL_SENDING_PASSWORD)
  }

  public getTransport () {
    return nodemailer.createTransport({
      service: this.service,
      auth: {
        user: this.email,
        pass: this.password
      }
    })
  }

  public async sendEmail (to: string, text: string, subject: string = '') {
    // ensure the email is valid
    if (to.match(/^.+@.+\..+$/) == null) {
      throw new Error('Invalid email address')
    }

    const mailOptions = {
      from: this.email,
      to,
      subject,
      text
    }

    return await this.transport.sendMail(mailOptions)
  }
}
