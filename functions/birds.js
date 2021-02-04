const express = require("express");
const router = express.Router();

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log("Time: ", Date.now());
  next();
});
// define the home page route
router.get("/", function (req, res) {
  next("ㅁㄴㅇㄹ");
  console.log("이거 되면 안되는데");
  res.send("Birds home page");
});
// define the about route
router.get("/create", function (req, res) {
  res.send("융특 게시판 만드는 함수");
});

module.exports = router;
