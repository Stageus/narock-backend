const router = require("express").Router()
const {Client} = require("pg")
const pgClient = require("../config/pgClient.js")
const authVerify = require("../module/verify.js")
const jwt = require("jsonwebtoken")
const checkProfileImg = require("../module/checkProfileImg.js")
const updateProfileImg = require("../module/updateProfileImg.js")
const nodemailer = require("nodemailer")
const smtpTransport = require("../config/email.js")

router.post("/login", async (req, res) => {  //로그인
    const idValue = req.body.idValue
    const pwValue = req.body.pwValue
    const loginSql = "SELECT * FROM narock.account WHERE userId=$1 AND userPw=$2"
    const values = [idValue, pwValue]
    const client = new Client(pgClient)


    const result = {
        "success": false,
        "message": ""
    }

    if(idValue == undefined || pwValue == undefined || idValue.length == 0 || idValue.length > 20 || pwValue.length == 0 || pwValue.length > 20) {
        result.message = "아이디 또는 비밀번호의 길이 부적합"
        res.send(result)
        return
    }

    try {
        await client.connect()
        const data = await client.query(loginSql, values)
        const row = data.rows
        if(row.length != 0) {
            result.success = true
            res.clearCookie("token")
            const jwtToken = jwt.sign({
                "userIndex": row[0].userindex,
                "userId": row[0].userid,
                "userNickname": row[0].usernickname,
                "userEmail": row[0].useremail,
                "userPw": row[0].userpw,
                "userName": row[0].username,
                "userPosition": row[0].userposition,
                "userProfileImg": row[0].userprofileimg,
                "userTimestamp": row[0].usertimestamp
            },
            process.env.jwtSecretKey,
            {
                "expiresIn": "24h",
                "issuer": process.env.jwtIssuer
            })
            res.cookie("token", jwtToken, {httpOnly: false, sameSite: "none", secure: true, expires: new Date(Date.now() + 360000)})
            // res.cookie("token", jwtToken)
        }
        else{
            result.message = "아이디 또는 비밀번호 틀림"
        }
        res.send(result)
    } catch(err) {
        result.message = err.message
        res.send(result)
    }
})

router.post("/", async (req, res) => {  //회원가입
    const emailValue = req.body.emailValue
    const idValue = req.body.idValue
    const pwValue = req.body.pwValue
    const nameValue = req.body.nameValue
    const nicknameValue = req.body.nicknameValue
    const signupSql = "INSERT INTO narock.account (userEmail, userId, userPw, userName, userNickname, userPosition) VALUES($1, $2, $3, $4, $5, 0)"
    const duplicationCheckSql = "SELECT * FROM narock.account WHERE userId=$1 OR userNickname=$2"
    const values = [emailValue, idValue, pwValue, nameValue, nicknameValue]
    const duplicationCheckValues = [idValue, nicknameValue]
    const client = new Client(pgClient)

    const result = {
        "success": false,
        "message": ""
    }

    if(idValue == undefined || pwValue == undefined || emailValue == undefined || nameValue == undefined || emailValue.length == 0 || emailValue.length > 320 || idValue.length == 0 || idValue.length > 20 
    || pwValue.length == 0 || pwValue.length > 20 || nameValue.length == 0 || nameValue.length > 20
    || nicknameValue.length == 0 || nicknameValue.length > 20) {
        result.message = "입력한 회원정보의 길이 부적합"
        res.send(result)
        return
    }

    try {
        await client.connect()
        const data = await client.query(duplicationCheckSql, duplicationCheckValues)
        const row = data.rows
        if(row.length != 0) {
            throw new Error("중복되는 아이디 또는 닉네임")
        }
        await client.query(signupSql, values)
        result.success = true
        res.send(result)
    } catch(err) {
        result.message = err.message
        res.send(result)
    }
})

router.get("/all", authVerify, async (req, res) => {
    const userPosition = req.decoded.userPosition
    const postPage = req.query.pages - 1
    const accountListSql = "SELECT * FROM narock.account ORDER BY userTimestamp DESC LIMIT 20 OFFSET 20*$1"
    const values = [postPage]
    let client

    const result = {
        "success": false,
        "message": "",
        "data": []
    }


    try {
        if(userPosition != 2) {
            throw new Error("권한이 없습니다.")
        }
        if(postPage < 0) {
            throw new Error("잘못된 페이지 요청")
        }
        client = new Client(pgClient)
        await client.connect()
        const data = await client.query(accountListSql, values)
        const row = data.rows
        if(row.length > 0) {
            result.data.push(row)
            result.success = true
        }
        else {
            throw new Error("데이터가 존재하지 않습니다.")
        }
    } catch(err) {
        result.message = err.message
    }

    if(client) client.end
    res.send(result)
})

router.get("/", authVerify, async (req, res) => {
    const result = {
        "success": false,
        "message": "",
        "data": null
    }
    
    function dateFormat(date) {
        let month = date.getMonth() + 1;
        let day = date.getDate();
        let hour = date.getHours();
        let minute = date.getMinutes();
        let second = date.getSeconds();

        month = month >= 10 ? month : '0' + month;
        day = day >= 10 ? day : '0' + day;
        hour = hour >= 10 ? hour : '0' + hour;
        minute = minute >= 10 ? minute : '0' + minute;
        second = second >= 10 ? second : '0' + second;

        return date.getFullYear() + '-' + month + '-' + day
        //  + ' ' + hour + ':' + minute + ':' + second
    }
    const userDate = new Date(req.decoded.userTimestamp)

    try {
        const data = {
            "userIndex": req.decoded.userIndex,
            "userId": req.decoded.userId,
            "userNickname": req.decoded.userNickname,
            "userEmail": req.decoded.userEmail,
            "userName": req.decoded.userName,
            "userPosition": req.decoded.userPosition,
            "userProfileImg": req.decoded.userProfileImg,
            "userTimestamp": dateFormat(userDate)
        }
        result.data = data
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    res.send(result)
})

router.put("/", authVerify, checkProfileImg, updateProfileImg.single("imageFile"), async (req, res) => {
    const userIndexValue = req.decoded.userIndex
    let userProfileImgUrl
    if(req.file) {
        userProfileImgUrl = req.file.location
        
    }
    else {
        userProfileImgUrl = null
    }
    
    let newNicknameValue = req.body.newNicknameValue
    const userPasswordValue = req.body.userPasswordValue
    let newPasswordValue = req.body.newPasswordValue
    const newPasswordCheck = req.body.newPasswordCheck
    const userProfileSql = "SELECT * FROM narock.account WHERE userIndex=$1"
    const duplicationCheckSql = "SELECT * FROM narock.account WHERE userNickname=$1"
    const updateProfileSql = "UPDATE narock.account SET (userNickname, userPw, userProfileImg)=($1, $2, $3) WHERE userIndex=$4"
    const userIndex = [userIndexValue]
    const duplicationCheckValue = [newNicknameValue]
    let updateValues = [newNicknameValue, newPasswordValue, userProfileImgUrl, userIndexValue]
    let client

    const result = {
        "success": false,
        "message": ""
    }
    
    try{
        if(newPasswordValue != newPasswordCheck) {
            throw new Error("새로 입력한 비밀번호가 서로 일치하지 않습니다.")
        }
        client = new Client(pgClient)
        await client.connect()
        const data = await client.query(userProfileSql, userIndex)
        const row = data.rows
        if(row[0].userpw != userPasswordValue) {
            throw new Error("비밀번호가 일치하지 않습니다.")
        }
        const duplicationCheckData = await client.query(duplicationCheckSql, duplicationCheckValue)
        if(duplicationCheckData.rows.length != 0) {
            throw new Error("이미 존재하는 닉네임입니다.")
        }
        if(newNicknameValue.length > 20 || newNicknameValue == undefined) {
            throw new Error("닉네임의 규격이 적합하지 않습니다.")
        }
        if(newPasswordValue.length > 20 || newPasswordValue == undefined) {
            throw new Error("새 비밀번호의 규격이 적합하지 않습니다.")
        }
        if(newNicknameValue.length == 0) {
            newNicknameValue = row[0].usernickname
            updateValues = [row[0].usernickname, newPasswordValue, userProfileImgUrl, userIndexValue]
        }
        if(newPasswordValue.length == 0) {
            newPasswordValue = row[0].userpw
            updateValues = [newNicknameValue, row[0].userpw, userProfileImgUrl, userIndexValue]
        }
        await client.query(updateProfileSql, updateValues)
        const newData = await client.query(userProfileSql, userIndex)
        const newRow = newData.rows
        const jwtToken = jwt.sign({
            "userIndex": newRow[0].userindex,
            "userId": newRow[0].userid,
            "userNickname": newRow[0].usernickname,
            "userEmail": newRow[0].useremail,
            "userPw": newRow[0].userpw,
            "userName": newRow[0].username,
            "userPosition": newRow[0].userposition,
            "userProfileImg": newRow[0].userprofileimg
        },
        process.env.jwtSecretKey,
        {
            "expiresIn": "24h",
            "issuer": process.env.jwtIssuer
        })
        res.clearCookie("token")
        res.cookie("token", jwtToken, {httpOnly: false, sameSite: "none", secure: true})
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end
    res.send(result)
})

router.put("/position", authVerify, async (req, res) => {
    const userIndex = req.body.userIndex
    const userPosition = req.body.userPosition
    const bandIndex = req.body.bandIndex
    const updatePositionSql = "UPDATE narock.account SET userPosition=$1 WHERE userIndex=$2"
    const deleteBandManagerSql = "UPDATE narock.band SET userIndex='1' WHERE userIndex=$1"
    const checkManagerSql = "SELECT * FROM narock.band WHERE bandIndex=$1"
    const updateBandManagerSql = "UPDATE narock.band SET userIndex=$1 WHERE bandIndex=$2"
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(req.decoded.userPosition != 2) {
            throw new Error("권한이 없습니다.")
        }
        client = new Client(pgClient)
        await client.connect()
        if(userPosition == 0) {
            const values = [0, userIndex]
            await client.query(updatePositionSql, values)
            const deleteManagerValue = [userIndex]
            await client.query(deleteBandManagerSql, deleteManagerValue)
            result.success = true
        }
        if(userPosition == 1) {
            const values = [1, userIndex]
            await client.query(updatePositionSql, values)
            const checkValue = [bandIndex]
            // const data = await client.query(checkManagerSql, checkValue)
            // if(data.rows[0].userindex != null) {
            //     throw new Error("이미 관리자가 존재하는 밴드입니다.")
            // }
            const changeValues = [userIndex, bandIndex]
            await client.query(updateBandManagerSql, changeValues)
            result.success = true
        }
        if(userPosition == 2) {
            throw new Error("최고관리자는 권한 변경이 불가능합니다.")
        }
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end
    res.send(result)
})

router.delete("/", authVerify, async (req, res) => {
    const userIndexArray = req.body.userIndex
    const deleteUserSql = "DELETE FROM narock.account WHERE userIndex=$1"
    const value = [req.decoded.userIndex]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        client = new Client(pgClient)
        await client.connect()
        if(req.decoded.userPosition != 2 && userIndexArray != null) {
            throw new Error("권한이 없습니다.")
        }
        if(req.decoded.userPosition == 0 || req.decoded.userPosition == 1) {
            await client.query(deleteUserSql, value)
            res.clearCookie("token")
        }
        if(req.decoded.userPosition == 2 && userIndexArray.length > 0) {
            let deleteSql = "DELETE FROM narock.account WHERE "
            for(var i=0; i<userIndexArray.length; i++) {
                const j = i + 1
                deleteSql = deleteSql + "userIndex=$"+ j + " OR "
            }
            await client.query(deleteSql.substring(0, deleteSql.length - 3), userIndexArray)
        }
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end
    res.send(result)
})

router.post("/email", async (req, res) => {
    const emailValue = req.body.emailValue
    const emailSql = "SELECT * FROM narock.account WHERE userEmail=$1"
    const value = [emailValue]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        client = new Client(pgClient)
        await client.connect()
        const data = await client.query(emailSql, value)
        if(data.rows.length > 0) {
            const jwtToken = jwt.sign({
                "userId": data.rows[0].userid,
                "userPw": data.rows[0].userpw,
                "userEmail": emailValue
            },
            process.env.jwtSecretKey,
            {
                "expiresIn": "24h",
                "issuer": process.env.jwtIssuer
            })
            const mailOptions = {
                from: process.env.emailAddress,
                to: emailValue,
                subject: "비밀번호 수정 링크",
                html: `<p>회원님의 아이디는 ${data.rows[0].userid}입니다.<p>
                <p>비밀번호 수정 링크를 클릭해 비밀번호를 수정하세요:</p>
                <p> <a href="https://narock.site/resetpassword/?token=${jwtToken}">비밀번호 수정 링크</a></p>
                <p>This link will expire on 24hours.</p>`
            }
            await smtpTransport.sendMail(mailOptions)
            await smtpTransport.close()

            result.success = true
        }
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end
    res.send(result)
})

router.put("/password", async (req, res) => {
    const idValue = req.body.idValue
    const pwValue = req.body.pwValue
    const pwCheckValue = req.body.pwCheckValue
    const changePwSql = "UPDATE narock.account SET userPw=$1 WHERE userId=$2"
    const values = [pwValue, idValue]
    const authToken = req.body.token
    const verifiedToken = jwt.verify(authToken, process.env.jwtSecretKey)
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        client = new Client(pgClient)
        await client.connect()
        if(pwValue != pwCheckValue) {
            throw new Error("비밀번호가 일치하지 않습니다.")
        }
        if(idValue == verifiedToken.userId && pwValue != undefined && pwValue.length > 3 && pwValue.length < 20) {
            await client.query(changePwSql, values)
        }

        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end
    res.send(result)
})

router.get("/logout", authVerify, async (req, res) => { //로그아웃
    const result = {
        "success": false,
        "message": ""
    }
    try{
        res.clearCookie("token")
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    res.send(result)
})

router.post("/kakao", async (req, res) => {

})

module.exports = router