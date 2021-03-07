const express = require("express");
const asyncify = require("express-asyncify");
const {
  DB,
  ERRORS,
  smtpTransport,
  firebaseAdmin,
  tokenExporter,
} = require("./Commons");
const asyncRouter = asyncify(express.Router());

// 구글 로그인 정보가 DB에 있는지 확인하는 메소드
asyncRouter.post("/checkgoogleexist", async (req, res, next) => {
  const {
    body: { uid },
  } = req;
  if (uid === undefined) return next(ERRORS.AUTH.NO_UID);
  return DB.users
    .doc(uid)
    .get()
    .then(async (docSnapshot) => {
      if (docSnapshot.exists) {
        return res.status(201).send({ result: "success" });
      } else {
        return res.status(200).send({ result: "success" });
      }
    })
    .catch((err) => next(err.message));
});

asyncRouter.post("/signup", async (req, res, next) => {
  const { body } = req;

  // 공통적으로 내용 다 있는지 확인.
  if (
    body.method === undefined ||
    body.name === undefined ||
    body.email === undefined ||
    body.student_id === undefined ||
    body.is_convergence === undefined
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 구글인지 일반 회원가입인지 확인
  if (body.method === "GOOGLE") {
    // 존재하는 uid인지 확인.
    try {
      await firebaseAdmin.auth().getUser(body.uid);
    } catch (err) {
      return next(ERRORS.AUTH.NO_UID);
    }

    // 구글 회원가입이면 기존에 collection('user/{uid}') 없는지 확인.
    return DB.users
      .doc(body.uid)
      .get()
      .then(async (docSnapshot) => {
        if (docSnapshot.exists) {
          return next(ERRORS.AUTH.ALREADY_SIGNUPED);
        } else {
          // 이것도 없으면 이제 여기서부터 시작!
          try {
            await DB.users.doc(body.uid).set({
              name: body.name,
              student_id: body.student_id,
              email: body.email,
              is_convergence: body.is_convergence,
            });
            return res.status(200).send({ result: "Google signup success" });
          } catch (err) {
            return next(ERRORS.DATA.INVALID_DATA);
          }
        }
      })
      .catch((_err) => next(ERRORS.DATA.INVALID_DATA));
  } else if (body.method === "EMAIL") {
    // 비번 길이 체크
    if (!body.password || body.password.length < 6) {
      return next(ERRORS.DATA.INVALID_DATA);
    }
    return DB.users
      .where("email", "==", body.email)
      .get()
      .then(async (doc) => {
        if (doc.empty) {
          try {
            const { uid } = await firebaseAdmin.auth().createUser({
              email: body.email,
              password: body.password,
              displayName: body.name,
            });
            await DB.users.doc(uid).set({
              name: body.name,
              student_id: body.student_id,
              email: body.email,
              is_convergence: body.is_convergence,
            });
            return res.status(200).send({ result: "Email signup success" });
          } catch (err) {
            console.log(err);
            return next(ERRORS.AUTH.CANT_SIGNUP);
          }
        } else {
          return next(ERRORS.AUTH.ALREADY_SIGNEDUP);
        }
      });
  } else {
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/lostpw", async (req, res, _next) => {
  const {
    body: { email },
  } = req;
  const link = await firebaseAdmin
    .auth()
    .generatePasswordResetLink(email)
    .catch((err) => {
      console.log("비밀번호 재설정 하는 중 오류", err);
      res.status(401).send({
        error: "비밀번호 재설정 링크 생성 중 오류가 났습니다",
        body: err,
      });
    });
  const mailOptions = {
    from: "convergencessu@gmail.com",
    to: email,
    subject: "슝 커뮤니티 비밀번호 재설정 링크 발송드립니다.",
    text: link,
  };
  await smtpTransport.sendMail(mailOptions, (error, _responses) => {
    if (error) {
      res.status(402).send({
        error: "비밀번호 재설정 링크 발송 중 오류가 났습니다",
        body: error,
      });
    }
    smtpTransport.close();
  });
  res.status(200).send({
    result: "전송 성공",
  });
});

asyncRouter.post("/remove", async (req, res, next) => {
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

  try {
    await DB.users.doc(user.uid).update({
      REMOVED: true,
      REMOVED_REASON: body.reason,
    });

    await firebaseAdmin.auth().deleteUser(user.uid);
    return res.status(200).send({ result: "User withdraw success" });
  } catch (err) {
    return next(ERRORS.AUTH.TOKEN_FAIL);
  }
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
