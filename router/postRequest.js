const router = require("express").Router()
const {Client} = require("pg")
const pgClient = require("../config/pgClient.js")
const authVerify = require("../module/verify.js")
const jwt = require("jsonwebtoken")
const uploadPostImg = require("../module/uploadPostImg.js")

router.get("/all", authVerify, async (req, res) => {
    const pages = req.query.pages - 1
    const userPosition = req.decoded.userPosition
    const sql = "SELECT * FROM narock.postCreateRequest ORDER BY postCreateRequestTimestamp DESC LIMIT 20 OFFSET 20*$1"
    const userDataSql = "SELECT * FROM narock.account WHERE userIndex=$1"
    const value = [pages]
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
        if(pages < 0) {
            throw new Error("잘못된 페이지 값")
        }
        client = new Client(pgClient)
        await client.connect()
        const data = await client.query(sql, value)
        console.log(data.rows)
        if(data.rows.length == 0) {
            throw new Error("해당하는 페이지의 결과값이 없습니다.")
        }
        for(var i=0; i<data.rows.length; i++) {
            const userData = await client.query(userDataSql, [data.rows[i].userindex])
            let tmp = {}
            tmp.postcreaterequestindex = data.rows[i].postcreaterequestindex
            tmp.postcreaterequesttimestamp = data.rows[i].postcreaterequesttimestamp
            tmp.postname = data.rows[i].postname
            tmp.requestdetail = data.rows[i].requestdetail
            tmp.userindex = data.rows[i].userindex
            tmp.userid = userData.rows[0].userid
            tmp.usernickname = userData.rows[0].usernickname
            result.data.push(tmp)
        }
        // result.data.push(data.rows)
        result.success = true

    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.post("/", authVerify, async (req, res) => {
    const bandName = req.body.bandName
    const requestMessage = req.body.requestMessage
    const userPosition = req.decoded.userPosition
    const userIndex = req.decoded.userIndex
    const sql = "INSERT INTO narock.postCreateRequest (postName, requestDetail, userIndex) VALUES ($1, $2, $3)"
    const duplicateCheckSql = "SELECT * FROM narock.band WHERE bandName=$1"
    const values = [bandName, requestMessage, userIndex]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(userPosition != 1 && userPosition != 2 && userPosition != 0) {
            throw new Error("잘못된 유저 등급")
        }
        if(userPosition == 1) {
            throw new Error("게시판지기는 게시판 생성 요청을 할 수 없습니다.")
        }
        if(bandName > 100 || requestMessage > 1000) {
            throw new Error("밴드 이름의 길이가 너무 큼")
        }
        client = new Client(pgClient)
        await client.connect()
        const data = await client.query(duplicateCheckSql, [bandName])
        if(data.rows.length != 0) {
            throw new Error("이미 해당하는 게시판명이 존재함")
        }
        await client.query(sql, values)
        result.success = true

    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.post("/accept", authVerify, async (req, res) => {
    const postCreateRequestIndex = req.body.postCreateRequestIndex
    const bandNameArray = req.body.bandNameArray
    const userIndexArray = req.body.userIndexArray
    const userPosition = req.decoded.userPosition
    const insertSql = "INSERT INTO narock.band (bandName, userIndex) VALUES($1, $2)"
    const deleteRequestSql = "DELETE FROM narock.postCreateRequest WHERE postCreateRequestIndex=$1"
    // const duplicationCheckSql = "SELECT postName, COUNT(postName) FROM narock.postCreateRequest GROUP BY postName HAVING COUNT(postName) > 1"
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(postCreateRequestIndex.length < 1) {
            throw new Error("요청값이 존재하지 않음")
        }
        if(userPosition != 2) {
            throw new Error("권한이 없습니다.")
        }
        if(postCreateRequestIndex.length != bandNameArray.length || bandNameArray.length != userIndexArray.length) {
            throw new Error("잘못된 배열 전송됨")
        }
        client = new Client(pgClient)
        await client.connect()
        let duplicationCheckSql = "SELECT postName, COUNT(postName) FROM narock.postCreateRequest WHERE "
        for(var i=0; i<postCreateRequestIndex.length; i++) {
            const j = i + 1
            duplicationCheckSql = duplicationCheckSql + "postCreateRequestIndex=$"+ j + " OR "
        }
        const data = await client.query(duplicationCheckSql.substring(0, duplicationCheckSql.length - 3) + " GROUP BY postName HAVING COUNT(postName) > 1", postCreateRequestIndex)
        if(data.rows.length != 0) {
            throw new Error("수락한 요청 중 중복되는 게시판명이 존재합니다.")
        }
        for(var i=0; i<postCreateRequestIndex.length; i++) {
            const values = [bandNameArray[i], userIndexArray[i]]
            await client.query(insertSql, values)
            await client.query(deleteRequestSql, [postCreateRequestIndex[i]])
        }
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.delete("/", authVerify, async (req, res) => {
    const postCreateRequestIndex = req.body.postCreateRequestIndex
    const userPosition = req.decoded.userPosition
    const deleteRequestSql = "DELETE FROM narock.postCreateRequest WHERE postCreateRequestIndex=$1"
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(postCreateRequestIndex.length < 1) {
            throw new Error("요청값이 존재하지 않음")
        }
        if(userPosition != 2) {
            throw new Error("권한이 없습니다.")
        }
        client = new Client(pgClient)
        await client.connect()
        for(var i=0; i<postCreateRequestIndex.length; i++) {
            await client.query(deleteRequestSql, [postCreateRequestIndex[i]])
        }
        result.success = true

    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

module.exports = router