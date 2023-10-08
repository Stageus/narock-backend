const router = require("express").Router()
const {Client} = require("pg")
const pgClient = require("../config/pgClient.js")
const authVerify = require("../module/verify.js")
const jwt = require("jsonwebtoken")
const uploadPostImg = require("../module/uploadPostImg.js")

router.get("/search", async (req, res) => {
    const filter = req.query.filter
    const bandIndex = req.query.bandIndex
    const searchKeyword = req.query.searchKeyword
    const pages = req.query.pages - 1
    const postListSql0 = "SELECT * FROM narock.post WHERE (postTitle LIKE $1 OR postContent LIKE $1) AND bandIndex=$2 ORDER BY postTimestamp DESC LIMIT 20 OFFSET 20*$3"
    const postListSql1 = "SELECT * FROM narock.post WHERE postWriter LIKE $1 AND bandIndex=$2 ORDER BY postTimestamp DESC LIMIT 20 OFFSET 20*$3"
    const likeSql = "SELECT COUNT(*) FROM narock.like WHERE postIndex=$1"
    const values = ["%" + searchKeyword + "%", bandIndex, pages]
    let client

    const result = {
        "success": false,
        "message": "",
        "data": {
            "searchResult": [],
            "resultLength": ""
        }
    }

    try {
        if(searchKeyword == undefined || searchKeyword.length == 0) {
            throw new Error("잘못된 키워드값")
        }
        client = new Client(pgClient)
        await client.connect()
        let row
        if(filter == 0) {
            row = await client.query(postListSql0, values)
            for(var i=0; i<row.rows.length; i++) {
                const postLikes = await client.query(likeSql, [row.rows[i].postindex])
                row.rows[i].postlikes = postLikes.rows[0].count
            }
        }
        else if(filter == 1) {
            row = await client.query(postListSql1, values)
            for(var i=0; i<row.rows.length; i++) {
                const postLikes = await client.query(likeSql, [row.rows[i].postindex])
                row.rows[i].postlikes = postLikes.rows[0].count
            }
        }
        else{
            throw new Error("잘못된 필터값")
        }
        
        if(row.rows.length == 0) {
            throw new Error("해당 키워드를 가진 데이터가 없음")
        }
        if(row.rows.length > 0) {
            result.data.searchResult.push(row.rows)
            result.data.resultLength = row.rows.length
            result.success = true
        }
        else {
            throw new Error("데이터가 존재하지 않습니다.")
        }
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)

})

router.get("/main", async (req, res) => {
    const popularSql = ""
})

router.get("/all", async (req, res) => {
    const postCategory = req.query.postCategory
    const bandIndex = req.query.bandIndex
    const pages = req.query.pages - 1
    const postListSql = "SELECT * FROM narock.post WHERE postCategory=$1 AND bandIndex=$2 AND isFixed=false ORDER BY postTimestamp DESC LIMIT 20 OFFSET 20*$3"
    const fixedPostListSql = "SELECT * FROM narock.post WHERE isFixed=true ORDER BY postTimestamp"
    const likeSql = "SELECT COUNT(*) FROM narock.like WHERE postIndex=$1"
    const values = [postCategory, bandIndex, pages]
    let client

    const result = {
        "success": false,
        "message": "",
        "fixedPost": [],
        "post": []
    }

    try {
        if(postCategory != 0 && postCategory != 1 && postCategory != 2 && postCategory != 3 && postCategory != 4 && postCategory != 5) {
            throw new Error("잘못된 카테고리")
        }
        client = new Client(pgClient)
        await client.connect()
        const fixedPost = await client.query(fixedPostListSql)
        if(fixedPost.rows.length == 0) {
            throw new Error("해당 키워드를 가진 데이터가 없음")
        }
        if(fixedPost.rows.length > 0) {
            for(var i=0; i<fixedPost.rows.length; i++) {
                const postLikes = await client.query(likeSql, [fixedPost.rows[i].postindex])
                fixedPost.rows[i].postlikes = postLikes.rows[0].count
            }
            result.fixedPost.push(fixedPost.rows)
            result.success = true
        }
        const post = await client.query(postListSql, values)
        if(post.rows.length == 0) {
            throw new Error("해당 키워드를 가진 데이터가 없음")
        }
        if(post.rows.length > 0) {
            for(var i=0; i<post.rows.length; i++) {
                const postLikes = await client.query(likeSql, [post.rows[i].postindex])
                post.rows[i].postlikes = postLikes.rows[0].count
            }
            result.post.push(post.rows)
            result.success = true
        }
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.get("/", async (req, res) => {
    const postIndex = req.query.postIndex
    const postSql = "SELECT * FROM narock.post WHERE postIndex=$1"
    const viewsSql = "UPDATE narock.post SET postViews=$1 WHERE postIndex=$2"
    const likeSql = "SELECT COUNT(*) FROM narock.like WHERE postIndex=$1"
    const commentSql = "SELECT * FROM narock.comment WHERE postIndex=$1"
    const replySql = "SELECT * FROM narock.reply WHERE commentIndex=$1"
    const value = [postIndex]
    let client

    const result = {
        "success": false,
        "message": "",
        "postIndex": null,
        "postCategory": null,
        "postWriter": null,
        "postTitle": null,
        "postContent": null,
        "postTimestamp": null,
        "postViews": null,
        "postImgUrl": null,
        "isFixed": false,
        "userIndex": null,
        "bandIndex": null,
        "postLikes": null,
        "comment": [],
        "reply": []
    }

    try{
        if(postIndex < 1 || postIndex == undefined || postIndex == null) {
            throw new Error("잘못된 요청 인덱스")
        } 
        client = new Client(pgClient)
        await client.connect()
        let post = await client.query(postSql, value)
        if(post.rows.length == 0) {
            throw new Error("해당하는 게시글이 존재하지 않음")
        }
        await client.query(viewsSql, [post.rows[0].postviews + 1, postIndex])
        post = await client.query(postSql, value)
        result.postIndex = post.rows[0].postindex
        result.postCategory = post.rows[0].postcategory
        result.postWriter = post.rows[0].postwriter
        result.postTitle = post.rows[0].posttitle
        result.postContent = post.rows[0].postcontent
        result.postTimestamp = post.rows[0].posttimestamp
        result.postViews = post.rows[0].postviews
        result.postImgUrl = post.rows[0].postimgurl
        result.isFixed = post.rows[0].isfixed
        result.userIndex = post.rows[0].userindex
        result.bandIndex = post.rows[0].bandindex
        const postLikes = await client.query(likeSql, value)
        result.postLikes = postLikes.rows[0].count
        const comment = await client.query(commentSql, value)
        if(comment.rows.length > 0) {
            result.comment.push(comment.rows)
            for(var i=0; i<comment.rows.length; i++) {
                const reply = await client.query(replySql, [comment.rows[i].commentindex])
                result.reply[i] = reply.rows
            }
        }
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.post("/", authVerify, uploadPostImg.single("imageFile"), async (req, res) => {
    const postCategory = req.body.postCategory
    const postWriter = req.decoded.userNickname
    const postTitle = req.body.postTitle
    const postContent = req.body.postContent
    const userIndex = req.decoded.userIndex
    let postImgUrl
    if(req.file) {
        postImgUrl = req.file.location
    }
    else {
        postImgUrl = null
    }
    const isFixed = req.body.isFixed
    const bandIndex = req.body.bandIndex
    const bandSql = "SELECT * FROM narock.band WHERE userIndex=$1"
    const uploadPostSql = "INSERT INTO narock.post (postCategory, postWriter, postTitle, postContent, userIndex, postImgUrl, isFixed, bandIndex) VALUES($1, $2, $3, $4, $5, $6, $7, $8)"
    const values = [postCategory, postWriter, postTitle, postContent, userIndex, [postImgUrl], isFixed, bandIndex]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(postCategory < 0 || postCategory > 5 || postTitle.length > 1000 || postContent.length > 20000) {
            throw new Error("잘못된 인덱스값")
        }
        client = new Client(pgClient)
        await client.connect()
        if(isFixed == true) {
            if(req.decoded.userPosition == 1) {
                const band = await client.query(bandSql, [userIndex])
                if(band.rows[0].bandindex != bandIndex) {
                    throw new Error("글을 고정할 권한이 없습니다.")
                }
            }
            else if(req.decoded.userPosition == 0) {
                throw new Error("글을 고정할 권한이 없습니다.")
            }
        }
        await client.query(uploadPostSql, values)
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.put("/", authVerify, async (req, res) => {
    const postIndex = req.body.postIndex
    const userIndex = req.decoded.userIndex
    const postCategory = req.body.postCategory
    const postTitle = req.body.postTitle
    const postContent = req.body.postContent
    const isFixed = req.body.isFixed
    const postSql = "SELECT * FROM narock.post WHERE postIndex=$1"
    const bandSql = "SELECT * FROM narock.band WHERE userIndex=$1"
    const updatePostSql = "UPDATE narock.post SET (postCategory, postTitle, postContent, isFixed)=($1, $2, $3, $4) WHERE postIndex=$5"
    const values = [postCategory, postTitle, postContent, isFixed, postIndex]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        if(postCategory < 0 || postCategory > 5 || postTitle.length > 1000 || postContent.length > 20000) {
            throw new Error("잘못된 인덱스값")
        }
        client = new Client(pgClient)
        await client.connect()
        const post = await client.query(postSql, [userIndex])
        if(post.rows[0].userindex != userIndex) {
            throw new Error("글을 수정할 권한이 없음")
        }
        if(isFixed == true) {
            if(req.decoded.userPosition == 1) {
                const band = await client.query(bandSql, [userIndex])
                if(band.rows[0].bandindex != post.rows[0].bandindex) {
                    throw new Error("글을 고정할 권한이 없습니다.")
                }
            }
            else if(req.decoded.userPosition == 0) {
                throw new Error("글을 고정할 권한이 없습니다.")
            }
        }
        await client.query(updatePostSql, values)
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.delete("/", authVerify, async (req, res) => {
    const postIndex = req.body.postIndex
    const userIndex = req.decoded.userIndex
    const postSql = "SELECT * FROM narock.post WHERE postIndex=$1"
    const bandSql = "SELECT * FROM narock.band WHERE userIndex=$1"
    const deleteSql = "DELETE FROM narock.post WHERE postIndex=$1"
    const values = [postIndex]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        client = new Client(pgClient)
        await client.connect()
        const post = await client.query(postSql, values)
        if(req.decoded.userPosition == 0) {
            if(post.rows[0].userindex != userIndex) {
                throw new Error("글을 삭제할 권한이 없습니다.")
            }
        }
        else if(req.decoded.userPosition == 1) {
            const band = await client.query(bandSql, [userIndex])
            if(band.rows[0].bandindex != post.rows[0].bandindex) {
                throw new Error("글을 삭제할 권한이 없습니다.")
            }
        }
        await client.query(deleteSql, values)
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

router.post("/like", authVerify, async (req, res) => {
    const postIndex = req.body.postIndex
    const userIndex = req.decoded.userIndex
    const postSql = "SELECT * FROM narock.post WHERE postIndex=$1"
    const checkSql = "SELECT * FROM narock.like WHERE userIndex=$1 AND postIndex=$2"
    const likeSql = "INSERT INTO narock.like (userIndex, postIndex) VALUES($1, $2)"
    const values = [userIndex, postIndex]
    let client

    const result = {
        "success": false,
        "message": ""
    }

    try {
        client = new Client(pgClient)
        await client.connect()
        const post = await client.query(postSql, [postIndex])
        if(post.rows.length == 0) {
            throw new Error("해당하는 게시글이 없습니다.")
        }
        const check = await client.query(checkSql, values)
        if(check.rows.length > 0) {
            throw new Error("이미 좋아요를 눌렀습니다.")
        }
        await client.query(likeSql, values)
        result.success = true
    } catch(err) {
        result.message = err.message
    }
    if(client) client.end()
    res.send(result)
})

module.exports = router