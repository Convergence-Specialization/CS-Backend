const express = require("express");
const asyncify = require("express-asyncify");
const { firestore, DB, tokenExporter, ERRORS } = require("./Commons");
const asyncRouter = asyncify(express.Router());

asyncRouter.post("/create", async (req, res, next) => {
  // body 추출
  const { body } = req;

  // 토큰 확인
  const user = await tokenExporter(req.headers);
  if (
    user === ERRORS.AUTH.TOKEN_FAIL ||
    user === ERRORS.AUTH.NO_AUTH_IN_HEADER
  ) {
    return next(user);
  }

  // body 유효성 체크.
  if (
    body.title === undefined ||
    body.eventPeriod === undefined ||
    body.content === undefined ||
    body.imgArray === undefined
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  try {
    await DB.announcement.add({
      timestamp: firestore.FieldValue.serverTimestamp(),
      title: body.title,
      eventPeriod: body.eventPeriod,
      content: body.content,
      imgArray: body.imgArray,
      author: user.uid,
    }); 
    res.status(200).send({ result: "Create announcement success", docId });
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});
