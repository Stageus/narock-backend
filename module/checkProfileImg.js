const aws = require('aws-sdk')
const s3Conn = require("../config/s3Config.js")

const s3 = new aws.S3(s3Conn)

const checkProfileImg = (req, res, next) => {
    const result = {
        "success": false,
        "message": ""
    }
    try{
        if(req.decoded.userProfileImg == null) {
            return next()
        }
        else {
            const url = req.decoded.userProfileImg
            const splitUrl = url.split("/")
            const key = splitUrl[3] + "/" + splitUrl[4]
            s3.deleteObject({
                Bucket: "narockbucket",
                Key: key
            }, (err, data) => {
                if(err) {
                    throw err
                }
            })
            return next()
        }
    } catch(err) {
        result.message = err.message
        res.send(result)
    }

}

module.exports = checkProfileImg