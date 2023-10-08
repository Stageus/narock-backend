const router = require("express").Router()
const {Client} = require("pg")
const pgClient = require("../config/pgClient.js")
const authVerify = require("../module/verify.js")

router.post("/", authVerify, async (req, res) => {
    const isReply = req.body.isReply
    const postOrCommentIndex = req.body.postOrCommentIndex
    const commentContent = req.body.commentContent
    const userIndex = req.decoded.userIndex
    const commentSql = "INSERT INTO narock.comment (postIndex, userIndex, commentContent) VALUES($1, $2, $3)"
    const replySql = "INSERT INTO narock.reply (commentIndex, userIndex, replyContent) VALUES($1, $2, $3)"
    const values = [postOrCommentIndex, userIndex, commentContent]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(commentContent.length > 1000) {
            throw new Error("댓글 길이 제한 초과")
        }
        client = new Client(pgClient)
        await client.connect()
        if(isReply == false) {
            await client.query(commentSql, values)
        }
        else if(isReply == true) {
            await client.query(replySql, values)
        }
        else {
            throw new Error("isReply값 부정확")
        }
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.put("/", authVerify, async (req, res) => {
    const isReply = req.body.isReply
    const commentOrReplyIndex = req.body.commentOrReplyIndex
    const commentContent = req.body.commentContent
    const userIndex = req.decoded.userIndex
    const commentCheckSql = "SELECT * FROM narock.comment WHERE commentIndex=$1"
    const commentSql = "UPDATE narock.comment SET commentContent=$1 WHERE commentIndex=$2"
    const replyCheckSql = "SELECT * FROM narock.reply WHERE replyIndex=$1"
    const replySql = "UPDATE narock.reply SET replyContent=$1 WHERE replyIndex=$2"
    const values = [commentContent, commentOrReplyIndex]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(commentContent.length > 1000) {
            throw new Error("댓글 길이 제한 초과")
        }
        client = new Client(pgClient)
        await client.connect()
        if(isReply == false) {
            const data = await client.query(commentCheckSql, [commentOrReplyIndex])
            if(data.rows[0].userindex != userIndex) {
                throw new Error("댓글 수정 권한이 없습니다.")
            }
            await client.query(commentSql, values)
        }
        else if(isReply == true) {
            const data = await client.query(replyCheckSql, [commentOrReplyIndex])
            if(data.rows[0].userindex != userIndex) {
                throw new Error("댓글 수정 권한이 없습니다.")
            }
            await client.query(replySql, values)
        }
        else {
            throw new Error("isReply값 부정확")
        }
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.delete("/", authVerify, async (req, res) => {
    const isReply = req.body.isReply
    const commentOrReplyIndex = req.body.commentOrReplyIndex
    const userIndex = req.decoded.userIndex
    const commentCheckSql = "SELECT * FROM narock.comment WHERE commentIndex=$1"
    const commentSql = "DELETE FROM narock.comment WHERE commentIndex=$1"
    const replyCheckSql = "SELECT * FROM narock.reply WHERE replyIndex=$1"
    const replySql = "DELETE FROM narock.reply WHERE replyIndex=$1"
    const values = [commentOrReplyIndex]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        client = new Client(pgClient)
        await client.connect()
        if(isReply == false) {
            const data = await client.query(commentCheckSql, [commentOrReplyIndex])
            if(data.rows[0].userindex != userIndex) {
                throw new Error("댓글 삭제 권한이 없습니다.")
            }
            await client.query(commentSql, values)
        }
        else if(isReply == true) {
            const data = await client.query(replyCheckSql, [commentOrReplyIndex])
            if(data.rows[0].userindex != userIndex) {
                throw new Error("댓글 삭제 권한이 없습니다.")
            }
            await client.query(replySql, values)
        }
        else {
            throw new Error("isReply값 부정확")
        }
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

module.exports = router