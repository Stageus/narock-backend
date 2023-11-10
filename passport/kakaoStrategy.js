const passport = require("passport")
const KakaoStrategy = require("passport-kakao")
const kakaoStrategyConfig = require("../config/kakaoStrategyConfig.js")
const {Client} = require("pg")
const pgClient = require("../config/pgClient.js")

module.exports = () => {
    passport.use(
        "kakao",
        new KakaoStrategy(
            kakaoStrategyConfig,
            async ()
        )
    )
}