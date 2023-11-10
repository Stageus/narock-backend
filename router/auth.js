const router = require("express").Router()
const {Client} = require("pg")
const pgClient = require("../config/pgClient.js")
const smtpTransport = require("../config/email.js")
const bcrypt = require("bcrypt")
const passport = require("passport")
const jwt = require("jsonwebtoken")

router.post("/email/signUp", async (req, res) => {
    const userEmail = req.body.emailValue
    const checkEmailSql = "SELECT * FROM narock.account WHERE userEmail=$1"
    const values = [userEmail]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(userEmail == undefined || userEmail.length > 320 || userEmail.length == 0) {
            throw new Error("부적합한 이메일 규격")
        }
        client = new Client(pgClient)
        await client.connect()
        const data = await client.query(checkEmailSql, values)
        const row = data.rows
        if(row.length > 0) {
            throw new Error("중복되는 이메일이 이미 존재함")
        }
        const randNum = Math.random().toString().substr(2,6)
        const authNum = await bcrypt.hash(randNum, 10)
        res.cookie("authNum", authNum, {httpOnly: false, sameSite: "none", secure: true})
        // res.cookie("authNum", authNum)
        const mailOptions = {
            from: process.env.emailAddress,
            to: userEmail,
            subject: "narock 이메일 인증번호입니다. 6자리 숫자를 정확히 입력해 주세요.",
            text: randNum
        }
        await smtpTransport.sendMail(mailOptions)
        await smtpTransport.close()
        result.success = true
    } catch (err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.post("/email/signUp/confirm", async (req, res) => {
    const authCode = req.body.authCode
    const authNum = req.cookies.authNum
    console.log(req.cookies)
    console.log(req.cookies.authNum)
    console.log(authNum)

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(authCode == undefined || authCode.length != 6) {
            throw new Error("입력 정보의 규격이 적합하지 않음")
        }
        else if(bcrypt.compareSync(authCode, authNum)) {
            result.success = true
        }
    } catch(err) {
        result.message = err.message
    }
    res.send(result)
})

router.get("/kakao", passport.authenticate("kakao"))

router.get("/kakao/callback", passport.authenticate("kakao", { failureRedirect: "/account/login" }), (req, res) => {
    res.redirect("/post/main")
})

module.exports = router