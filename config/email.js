const nodemailer = require("nodemailer")

const smtpTransport = nodemailer.createTransport({
    service: "Naver",
    auth: {
        user: process.env.emailAddress,
        pass: process.env.emailPassword
    },
    tls: {
        rejectUnauthorized: false
    }
})

module.exports = smtpTransport