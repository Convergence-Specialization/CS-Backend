const express = require("express");
const asyncify = require("express-asyncify");
const { superAdminEmails } = require("../config");
const {
  firestore,
  DB,
  tokenExporter,
  ERRORS,
  getRandomKey,
  smtpTransport,
  firebaseAdmin,
} = require("./Commons");
const asyncRouter = asyncify(express.Router());

asyncRouter.post("/suggestions", async (req, res, next) => {
  const {
    body: { title, content },
  } = req;

  if (!title || !content) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  const mailOptions = {
    from: "convergencessu@gmail.com",
    to: superAdminEmails,
    subject: `커뮤니티 슝 건의사항 - ${title}`,
    text: content,
  };
  return smtpTransport.sendMail(mailOptions, (error, _responses) => {
    if (error) {
      return res.status(401).send({
        error: "오늘의 건의사항 발송 할당량을 모두 사용했습니다.",
        body: err,
      });
    }
    res.status(200).send({
      result: "전송 성공",
    });
    smtpTransport.close();
  });
});

asyncRouter.use((err, _req, res, _next) => {
  switch (err) {
    case ERRORS.DATA.INVALID_DATA:
      res.status(400).send({ error: "Invalid data" });
      break;
    case ERRORS.AUTH.NO_UID:
      res.status(401).send({ error: "there is no user" });
      break;
    case ERRORS.AUTH.CANT_SIGNUP:
      res.status(401).send({ error: "Registration format is incorrect." });
      break;
    case ERRORS.AUTH.ALREADY_SIGNEDUP:
      res.status(406).send({ error: "Already signed up" });
      break;
    default:
      console.log("UNHANDLED INTERNAL ERROR: ", err);
      res.status(500).send({ error: "INTERNAL ERROR" });
      break;
  }
});

module.exports = asyncRouter;
