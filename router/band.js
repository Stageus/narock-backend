const router = require("express").Router()
const {Client} = require("pg")
const pgClient = require("../config/pgClient.js")
const authVerify = require("../module/verify.js")

router.get("/all", async (req, res) => {
    const sql = "SELECT * FROM narock.band WHERE bandIndex NOT IN('1') ORDER BY bandName"
    let client

    const result = {
        "success": false,
        "message": "",
        "data": []
    }

    try {
        client = new Client(pgClient)
        await client.connect()
        const data = await client.query(sql)
        if(data.rows.length == 0) {
            throw new Error("밴드가 없습니다.")
        }
        result.data.push(data.rows)
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.get("/", authVerify, async (req, res) => {
    const searchKeyword = req.query.searchKeyword
    const userPosition = req.decoded.userPosition
    const sql = "SELECT * FROM narock.band WHERE bandName=$1"
    const value = [searchKeyword]
    let client

    const result = {
        "success": false,
        "message": "",
        "bandIndex": null,
        "bandName": null
    }

    try {
        if(userPosition != 2) {
            throw new Error("권한이 없습니다.")
        }
        client = new Client(pgClient)
        await client.connect()
        const data = await client.query(sql, value)
        if(data.rows.length == 0) {
            throw new Error("검색 결과가 존재하지 않습니다.")
        }
        result.bandIndex = data.rows[0].bandindex
        result.bandName = data.rows[0].bandname

    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

module.exports = router