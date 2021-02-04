const express = require("express");
const asyncify = require("express-asyncify");
const { encryptAES, decryptAES } = require("./AES");
const {
  firestore,
  DB,
  tokenExporter,
  ERRORS,
  getRandomKey,
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
  // 글자 수 확인
  // TODO: typeof 로 string 아닌것도 처리.
  if (
    body.content === "" ||
    body.title === "" ||
    body.subject === "" ||
    !body.subject === "SMART_CAR" ||
    !body.subject === "ENERGY_SCIENCE" ||
    !body.subject === "SECURITY" ||
    !body.subject === "ICT" ||
    !body.subject === "KOREA" ||
    !body.subject === "BIGDATA" ||
    !body.subject === "NONE"
  ) {
    // TODO: 너무 길이가 길 때도 처리.
    return next(ERRORS.DATA.INVALID_DATA);
  }
  // TODO: 말머리 추가. 말머리가 6종 이외의 것이면 무조건 빠꾸.

  const RANDOM_KEY = getRandomKey(16).toString("hex");

  console.log(RANDOM_KEY, user.uid);

  try {
    // UID 암호화를 위해 키 저장.
    const docId = await DB.departMajor_UID_KEY
      .add({ UID_KEY: RANDOM_KEY })
      .then((doc) => doc.id);

    const encryptedUid = encryptAES(user.uid, RANDOM_KEY);

    // Firestore에 작성 성공시 docId 저장.
    await DB.departMajor.doc(docId).set({
      timestamp: firestore.FieldValue.serverTimestamp(),
      encryptedUid,
      content: body.content,
      title: body.title,
      subject: body.subject,
      likes_count: 0,
      comments_count: 0,
      secret_comments_count: 0,
    });
    // TODO: Users collection에 내가 쓴 글 목록 추가.
    res.status(200).send({ result: "Create doc success", docId });
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
    default:
      console.log(err);
      res.status(500).send({ error: "INTERNAL ERROR" });
      break;
  }
});

module.exports = asyncRouter;

// TODO: 댓글 작성시 알람 구현. 해당 user 컬렉션에 notifications 문서 -> 컬렉션에 문서 추가.
