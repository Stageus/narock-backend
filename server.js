const express = require("express")
const cookieParser = require("cookie-parser")
const app = express()
// const port = 80
const port = 3000
const https = require("https")
const fs = require("fs")
app.use(cookieParser())
app.use(express.json())
app.set('trust proxy', true)
require("dotenv").config()

app.use((req, res, next) => {
    const corsWhitelist = [
        'https://narock.site',
        'https://www.narock.site',
        'https://3.35.171.221',
        'http://localhost:3000'
    ]
    if (corsWhitelist.indexOf(req.headers.origin) !== -1) {
        res.header('Access-Control-Allow-Origin', req.headers.origin)
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        res.header("Access-Control-Allow-Credentials", true)
    }
    next()
})

// const privateKey = fs.readFileSync("/etc/letsencrypt/live/www.narock.site/privkey.pem")
// const fullchain = fs.readFileSync("/etc/letsencrypt/live/www.narock.site/fullchain.pem")
// const cert = fs.readFileSync("/etc/letsencrypt/live/www.narock.site/cert.pem")
// const credentials = {key: privateKey, ca: fullchain, cert: cert}

const accountApi = require("./router/account.js")
app.use("/account", accountApi)

const authApi = require("./router/auth.js")
app.use("/auth", authApi)

const postApi = require("./router/post.js")
app.use("/post", postApi)

const bandApi = require("./router/band.js")
app.use("/band", bandApi)

const postRequestApi = require("./router/postRequest.js")
app.use("/postRequest", postRequestApi)

const commentApi = require("./router/comment.js")
app.use("/comment", commentApi)

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/changePwPage.html")
})

app.listen(port, () => {
    console.log(`${port} 번에서 웹 서버가 실행됨`)
})

// https.createServer(credentials, app).listen(443, () => {
//     console.log("443번에서 https 서버가 실행됨")
// })
