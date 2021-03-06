const express = require("express");
const asyncify = require("express-asyncify");
const { adminEmails } = require("../config");
const {
  firestore,
  DB,
  tokenExporter,
  ERRORS,
  findStrInArray,
} = require("./Commons");
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

  console.log(
    "이메일",
    user.email,
    "체크",
    findStrInArray(user.email, adminEmails)
  );
  // 관리자인지 체크.
  if (!findStrInArray(user.email, adminEmails)) {
    return next(ERRORS.AUTH.NO_PERMISSION);
  }
  try {
    await DB.announcement.add({
      timestamp: firestore.FieldValue.serverTimestamp(),
      eventPeriod: body.eventPeriod,
      imgArray: body.imgArray,
      content: body.content,
      title: body.title,
      author: user.uid,
      ongoing: false,
    });
    res.status(200).send({ result: "Create announcement success" });
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/delete", async (req, res, next) => {
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
  if (body.docId === undefined) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  console.log(
    "이메일",
    user.email,
    "체크",
    findStrInArray(user.email, adminEmails)
  );

  // 관리자인지 체크.
  if (!findStrInArray(user.email, adminEmails)) {
    return next(ERRORS.AUTH.NO_PERMISSION);
  }

  try {
    await DB.announcement.doc(body.docId).delete();
    res.status(200).send({ result: "Delete announcement success" });
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/changeongoing", async (req, res, next) => {
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
  if (body.docId === undefined || body.ongoing === undefined) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  console.log(
    "이메일",
    user.email,
    "체크",
    findStrInArray(user.email, adminEmails)
  );

  // 관리자인지 체크.
  if (!findStrInArray(user.email, adminEmails)) {
    return next(ERRORS.AUTH.NO_PERMISSION);
  }

  try {
    await DB.announcement.doc(body.docId).update({
      ongoing: body.ongoing,
    });
    res.status(200).send({ result: "Update announcement ongoing success" });
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.use((err, _req, res, _next) => {
  switch (err) {
    case ERRORS.DATA.INVALID_DATA:
      res.status(400).send({ error: "Invalid data" });
      break;
    case ERRORS.AUTH.NO_AUTH_IN_HEADER:
      res.status(401).send({ error: "No Auth in header" });
      break;
    case ERRORS.AUTH.TOKEN_FAIL:
      res.status(401).send({ error: "Problem with token" });
      break;
    case ERRORS.AUTH.NO_PERMISSION:
      res.status(401).send({ error: "No Permission" });
      break;
    default:
      console.log(err);
      res.status(500).send({ error: "INTERNAL ERROR" });
      break;
  }
});

module.exports = asyncRouter;
