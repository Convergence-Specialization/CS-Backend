const express = require("express");
const asyncify = require("express-asyncify");
const { encryptAES, decryptAES } = require("./AES");
const {
  firestore,
  DB,
  tokenExporter,
  ERRORS,
  getRandomKey,
  NOTIFICATION_TYPES,
  nicknameList,
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
  if (body.content === "") {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  const RANDOM_KEY = getRandomKey(16).toString("hex");

  console.log(RANDOM_KEY, user.uid);

  try {
    // UID 암호화를 위해 키 저장.
    const docId = await DB.convergence_UID_KEY
      .add({ UID_KEY: RANDOM_KEY })
      .then((doc) => doc.id);

    const encryptedUid = encryptAES(user.uid, RANDOM_KEY);

    // Firestore에 작성 성공시 docId 저장.
    await DB.convergence.doc(docId).set({
      timestamp: firestore.FieldValue.serverTimestamp(),
      encryptedUid,
      nickname: nicknameList[Math.floor(Math.random() * nicknameList.length)],
      content: body.content,
      likes_count: 0,
      comments_count: 0,
      secret_comments_count: 0,
      report_count: 0,
    });
    res.status(200).send({ result: "Create doc success", docId });

    // 본인이 쓴 글에 등록.
    DB.users
      .doc(user.uid)
      .collection("myposts_convergence")
      .doc(docId)
      .set({
        timestamp: firestore.FieldValue.serverTimestamp(),
      })
      .then(() => console.log("added my post success", user.uid));
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

  // 글 삭제 시작
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.docId)
      .get()
      .then((doc) => doc.data());

    // 암호화된 글 작성자 uid 가져오기
    let doc_encryptedUid = await DB.convergence
      .doc(body.docId)
      .get()
      .then((doc) => doc.data().encryptedUid);

    // 복호화된 글 작성자 uid 가져오기
    let doc_decryptedUid = decryptAES(doc_encryptedUid, UID_KEY);

    // 권한 체크.
    if (user.uid !== doc_decryptedUid) {
      return next(ERRORS.AUTH.NO_PERMISSION);
    }

    // 글 목록에서 제거
    await DB.convergence.doc(body.docId).delete();
    res.status(200).send({ result: "delete doc success" });

    // 내 글 목록에서 제거
    await DB.users
      .doc(doc_decryptedUid)
      .collection("myposts_convergence")
      .doc(body.docId)
      .delete();
    console.log("delete mypost success");
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }

  try {
    // 핫게에 있는지 확인
    if (
      await DB.hot
        .where("boardName", "==", "CONVERGENCE")
        .where("docId", "==", body.docId)
        .get()
        .then((querySnapshot) => querySnapshot.size !== 0)
    ) {
      // 핫게에 있으면 삭제 시작.
      console.log("REMOVE FROM HOT BOARD - CONVERGENCE");
      await DB.hot.doc("CONVERGENCE".concat(body.docId)).delete();
    }
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/report", async (req, res, next) => {
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
  if (body.docId === undefined || body.docId === "") {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 신고 처리 시작.
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.docId)
      .get()
      .then((doc) => doc.data());

    // 좋아요하는 사람 UID 암호화.
    const encryptedUid = encryptAES(user.uid, UID_KEY);

    // 좋아요 이미 했는지 확인
    if (
      await DB.convergence
        .doc(body.docId)
        .collection("reports")
        .where("encryptedUid", "==", encryptedUid)
        .get()
        .then((querySnapshot) => querySnapshot.size !== 0)
    ) {
      console.log("ALREADY REPORTED");
      return next(ERRORS.DATA.INVALID_DATA);
    }
    // 좋아요 누가 했는지 작성
    await DB.convergence.doc(body.docId).collection("reports").add({
      timestamp: firestore.FieldValue.serverTimestamp(),
      encryptedUid,
    });
    // 좋아요 수 1 올리기.
    await DB.convergence.doc(body.docId).update({
      report_count: firestore.FieldValue.increment(1),
    });
    res.status(200).send({ result: "report success" });
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/myencrypteduid", async (req, res, next) => {
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
  if (body.docId === undefined || body.docId === "") {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.docId)
      .get()
      .then((doc) => doc.data());

    // 댓글 작성자 UID 암호화.
    const encryptedUid = encryptAES(user.uid, UID_KEY);

    res.status(200).send({ encryptedUid });
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/like", async (req, res, next) => {
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
  if (
    body.docId === undefined ||
    body.like === undefined ||
    body.docId === "" ||
    (body.like !== "LIKE" && body.like !== "UNLIKE")
  ) {
    // TODO: 너무 길이가 길 때도 처리.
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 좋아요 처리 시작.
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.docId)
      .get()
      .then((doc) => doc.data());

    // 좋아요하는 사람 UID 암호화.
    const encryptedUid = encryptAES(user.uid, UID_KEY);

    // 좋아요 이미 했는지 확인
    if (
      await DB.convergence
        .doc(body.docId)
        .collection("likes")
        .where("encryptedUid", "==", encryptedUid)
        .get()
        .then((querySnapshot) => querySnapshot.size !== 0)
    ) {
      console.log("ALREADY LIKED");
      return next(ERRORS.DATA.INVALID_DATA);
    }
    // 좋아요 누가 했는지 작성
    await DB.convergence.doc(body.docId).collection("likes").add({
      timestamp: firestore.FieldValue.serverTimestamp(),
      encryptedUid,
    });
    // 좋아요 수 1 올리기.
    await DB.convergence.doc(body.docId).update({
      likes_count: firestore.FieldValue.increment(1),
    });
    res.status(200).send({ result: "like success" });

    // 암호화된 글 작성자 uid 가져오기
    let doc_encryptedUid = await DB.convergence
      .doc(body.docId)
      .get()
      .then((doc) => doc.data().encryptedUid);

    // 복호화된 글 작성자 uid 가져오기
    let doc_decryptedUid = decryptAES(doc_encryptedUid, UID_KEY);

    await DB.users.doc(doc_decryptedUid).collection("notifications").add({
      type: NOTIFICATION_TYPES.LIKE_MY_DOC,
      docId: body.docId,
      checked: false,
      timestamp: firestore.FieldValue.serverTimestamp(),
      boardName: "CONVERGENCE",
    });
    console.log("send LIKE MY DOC notification success");
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 핫게 가는지 확인
  try {
    let likes_count = await DB.convergence
      .doc(body.docId)
      .get()
      .then((doc) => doc.data().likes_count);

    if (likes_count >= 5) {
      // 이미 핫게에 있는지 확인
      if (
        await DB.hot
          .where("boardName", "==", "CONVERGENCE")
          .where("docId", "==", body.docId)
          .get()
          .then((querySnapshot) => querySnapshot.size === 0)
      ) {
        // 핫게에 없으면 추가 시작.
        console.log("ADDING TO HOT BOARD - CONVERGENCE");
        await DB.hot.doc("CONVERGENCE".concat(body.docId)).set({
          docId: body.docId,
          boardName: "CONVERGENCE",
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/comment/create", async (req, res, next) => {
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
    body.docId === undefined ||
    body.content === undefined ||
    body.docId === "" ||
    body.content === ""
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.docId)
      .get()
      .then((doc) => doc.data());

    // 댓글 작성자 UID 암호화.
    const encryptedUid = encryptAES(user.uid, UID_KEY);

    // 댓글 작성
    await DB.convergence.doc(body.docId).collection("comments").add({
      timestamp: firestore.FieldValue.serverTimestamp(),
      encryptedUid,
      content: body.content,
      subCommentsExist: false,
      likes_count: 0,
      report_count: 0,
    });
    res.status(200).send({ result: "Post comment success" });
    await Promise.all([
      new Promise(async (resolve) => {
        // 댓글 수 1 올리기
        await DB.convergence.doc(body.docId).update({
          comments_count: firestore.FieldValue.increment(1),
        });
        resolve();
      }),
      new Promise(async (resolve) => {
        // 암호화된 글 작성자 uid 가져오기
        let doc_encryptedUid = await DB.convergence
          .doc(body.docId)
          .get()
          .then((doc) => doc.data().encryptedUid);

        // 복호화된 글 작성자 uid 가져오기
        let doc_decryptedUid = decryptAES(doc_encryptedUid, UID_KEY);

        // 내가 내 글에 댓글 쓰는거면 알림 안띄우기.
        if (doc_decryptedUid === user.uid) {
          return resolve();
        }

        // 해당 사용자에게 알림 띄워주기
        await DB.users.doc(doc_decryptedUid).collection("notifications").add({
          type: NOTIFICATION_TYPES.COMMENT_MY_DOC,
          docId: body.docId,
          checked: false,
          timestamp: firestore.FieldValue.serverTimestamp(),
          boardName: "CONVERGENCE",
          preview: body.content,
        });
        console.log("send COMMENT MY DOC notification success");
        resolve();
      }),
    ]);
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/comment/delete", async (req, res, next) => {
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
  if (
    body.originalDocId === undefined ||
    body.commentId === undefined ||
    body.originalDocId === "" ||
    body.commentId === ""
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 댓글 삭제 시작
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.originalDocId)
      .get()
      .then((doc) => doc.data());

    // 암호화된 댓글 작성자 uid 가져오기
    let comment_encryptedUid = await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .get()
      .then((doc) => doc.data().encryptedUid);

    // 복호화된 글 작성자 uid 가져오기
    let comment_decryptedUid = decryptAES(comment_encryptedUid, UID_KEY);

    // 권한 체크.
    if (user.uid !== comment_decryptedUid) {
      return next(ERRORS.AUTH.NO_PERMISSION);
    }

    // 대댓글 개수 가져오기
    let subcommentCount = await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("subcomments")
      .get()
      .then((querySnapshot) => querySnapshot.size);

    // 대댓글 개수 + 본인 (1) 만큼 댓글 수 삭제
    await DB.convergence.doc(body.originalDocId).update({
      comments_count: firestore.FieldValue.increment(-(subcommentCount + 1)),
    });

    // 댓글 목록에서 제거
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .delete();
    res.status(200).send({ result: "delete comment success" });
    console.log("delete comment success");
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/comment/report", async (req, res, next) => {
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
  if (
    body.originalDocId === undefined ||
    body.commentId === undefined ||
    body.originalDocId === "" ||
    body.commentId === ""
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 신고 처리 시작.
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.originalDocId)
      .get()
      .then((doc) => doc.data());

    // 신고하는 사람 UID 암호화.
    const encryptedUid = encryptAES(user.uid, UID_KEY);

    // 댓글에 신고 이미 했는지 확인
    if (
      await DB.convergence
        .doc(body.originalDocId)
        .collection("comments")
        .doc(body.commentId)
        .collection("reports")
        .where("encryptedUid", "==", encryptedUid)
        .get()
        .then((querySnapshot) => querySnapshot.size !== 0)
    ) {
      console.log("ALREADY REPORTED");
      return next(ERRORS.DATA.INVALID_DATA);
    }
    // 신고 누가 했는지 작성
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("reports")
      .add({
        timestamp: firestore.FieldValue.serverTimestamp(),
        encryptedUid,
      });
    // 신고 수 1 올리기.
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .update({
        report_count: firestore.FieldValue.increment(1),
      });
    res.status(200).send({ result: "comment report success" });
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/comment/like", async (req, res, next) => {
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
  if (
    body.originalDocId === undefined ||
    body.commentId === undefined ||
    body.originalDocId === "" ||
    body.commentId === ""
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 좋아요 처리 시작.
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.originalDocId)
      .get()
      .then((doc) => doc.data());

    // 좋아요하는 사람 UID 암호화.
    const encryptedUid = encryptAES(user.uid, UID_KEY);

    // 댓글에 좋아요 이미 했는지 확인
    if (
      await DB.convergence
        .doc(body.originalDocId)
        .collection("comments")
        .doc(body.commentId)
        .collection("likes")
        .where("encryptedUid", "==", encryptedUid)
        .get()
        .then((querySnapshot) => querySnapshot.size !== 0)
    ) {
      console.log("ALREADY LIKED");
      return next(ERRORS.DATA.INVALID_DATA);
    }
    // 좋아요 누가 했는지 작성
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("likes")
      .add({
        timestamp: firestore.FieldValue.serverTimestamp(),
        encryptedUid,
      });
    // 좋아요 수 1 올리기.
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .update({
        likes_count: firestore.FieldValue.increment(1),
      });

    res.status(200).send({ result: "comment like success" });

    // 암호화된 댓글 작성자 uid 가져오기
    let comment_encryptedUid = await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .get()
      .then((doc) => doc.data().encryptedUid);

    // 복호화된 댓글 작성자 uid 가져오기
    let comment_decryptedUid = decryptAES(comment_encryptedUid, UID_KEY);

    await DB.users.doc(comment_decryptedUid).collection("notifications").add({
      type: NOTIFICATION_TYPES.LIKE_MY_COMMENT,
      docId: body.originalDocId,
      checked: false,
      timestamp: firestore.FieldValue.serverTimestamp(),
      boardName: "CONVERGENCE",
    });
    console.log("send LIKE MY COMMENT notification success");
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/subcomment/create", async (req, res, next) => {
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
    body.originalDocId === undefined ||
    body.commentId === undefined ||
    body.content === undefined ||
    body.commentId === "" ||
    body.content === ""
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.originalDocId)
      .get()
      .then((doc) => doc.data());

    // 댓글 작성자 UID 암호화.
    const encryptedUid = encryptAES(user.uid, UID_KEY);

    // 대댓글 작성
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("subcomments")
      .add({
        timestamp: firestore.FieldValue.serverTimestamp(),
        encryptedUid,
        content: body.content,
        likes_count: 0,
        report_count: 0,
      });

    // 원본 댓글 대댓글 존재하는거 검증.
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .update({ subCommentsExist: true });

    res.status(200).send({ result: "Post subcomment success" });
    // TODO: 댓글 수 늘리기, 알림 구현. 여기서부터는 promise로!
    Promise.all([
      new Promise(async (resolve) => {
        // 댓글 수 1 추가
        await DB.convergence.doc(body.originalDocId).update({
          comments_count: firestore.FieldValue.increment(1),
        });
        resolve();
      }),
      new Promise(async (resolve) => {
        // 암호화된 글 작성자 uid 가져오기
        let comment_encryptedUid = await DB.convergence
          .doc(body.originalDocId)
          .collection("comments")
          .doc(body.commentId)
          .get()
          .then((doc) => doc.data().encryptedUid);

        // 복호화된 글 작성자 uid 가져오기
        let comment_decryptedUid = decryptAES(comment_encryptedUid, UID_KEY);

        // 내가 내 글에 댓글 쓰는거면 알림 안띄우기.
        if (comment_decryptedUid === user.uid) {
          return resolve();
        }

        // 해당 사용자에게 알림 띄워주기
        await DB.users
          .doc(comment_decryptedUid)
          .collection("notifications")
          .add({
            type: NOTIFICATION_TYPES.SUBCOMMENT_MY_COMMENT,
            docId: body.originalDocId,
            checked: false,
            timestamp: firestore.FieldValue.serverTimestamp(),
            boardName: "CONVERGENCE",
            preview: body.content,
          });
        console.log("send SUBCOMMENT_MY_COMMENT notification success");
        resolve();
      }),
    ]);
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/subcomment/delete", async (req, res, next) => {
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
  if (
    body.originalDocId === undefined ||
    body.commentId === undefined ||
    body.subcommentId === undefined ||
    body.originalDocId === "" ||
    body.commentId === "" ||
    body.subcommentId === ""
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 대댓글 삭제 시작
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.originalDocId)
      .get()
      .then((doc) => doc.data());

    // 암호화된 댓글 작성자 uid 가져오기
    let subcomment_encryptedUid = await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("subcomments")
      .doc(body.subcommentId)
      .get()
      .then((doc) => doc.data().encryptedUid);

    // 복호화된 글 작성자 uid 가져오기
    let subcomment_decryptedUid = decryptAES(subcomment_encryptedUid, UID_KEY);

    // 권한 체크.
    if (user.uid !== subcomment_decryptedUid) {
      return next(ERRORS.AUTH.NO_PERMISSION);
    }

    // 댓글 수 삭제
    await DB.convergence.doc(body.originalDocId).update({
      comments_count: firestore.FieldValue.increment(-1),
    });

    // 대댓글 목록에서 제거
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("subcomments")
      .doc(body.subcommentId)
      .delete();
    res.status(200).send({ result: "delete subcomment success" });
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/subcomment/report", async (req, res, next) => {
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
  if (
    body.originalDocId === undefined ||
    body.commentId === undefined ||
    body.subcommentId === undefined ||
    body.originalDocId === "" ||
    body.commentId === "" ||
    body.subcommentId === ""
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 신고 처리 시작.
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.originalDocId)
      .get()
      .then((doc) => doc.data());

    // 신고하는 사람 UID 암호화.
    const encryptedUid = encryptAES(user.uid, UID_KEY);

    // 대댓글에 신고 이미 했는지 확인
    if (
      await DB.convergence
        .doc(body.originalDocId)
        .collection("comments")
        .doc(body.commentId)
        .collection("subcomments")
        .doc(body.subcommentId)
        .collection("reports")
        .where("encryptedUid", "==", encryptedUid)
        .get()
        .then((querySnapshot) => querySnapshot.size !== 0)
    ) {
      console.log("ALREADY REPORTED");
      return next(ERRORS.DATA.INVALID_DATA);
    }

    // 신고 누가 했는지 작성
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("subcomments")
      .doc(body.subcommentId)
      .collection("reports")
      .add({
        timestamp: firestore.FieldValue.serverTimestamp(),
        encryptedUid,
      });

    // 신고 수 1 올리기.
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("subcomments")
      .doc(body.subcommentId)
      .update({
        report_count: firestore.FieldValue.increment(1),
      });

    res.status(200).send({ result: "subcomment report success" });
  } catch (err) {
    console.log(err);
    return next(ERRORS.DATA.INVALID_DATA);
  }
});

asyncRouter.post("/subcomment/like", async (req, res, next) => {
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
  if (
    body.originalDocId === undefined ||
    body.commentId === undefined ||
    body.subcommentId === undefined ||
    body.originalDocId === "" ||
    body.commentId === "" ||
    body.subcommentId === ""
  ) {
    return next(ERRORS.DATA.INVALID_DATA);
  }

  // 좋아요 처리 시작.
  try {
    // 컬렉션에서 글 작성할 때 저장한 AES키 가져와야함.
    let { UID_KEY } = await DB.convergence_UID_KEY
      .doc(body.originalDocId)
      .get()
      .then((doc) => doc.data());

    // 좋아요하는 사람 UID 암호화.
    const encryptedUid = encryptAES(user.uid, UID_KEY);

    // 댓글에 좋아요 이미 했는지 확인
    if (
      await DB.convergence
        .doc(body.originalDocId)
        .collection("comments")
        .doc(body.commentId)
        .collection("subcomments")
        .doc(body.subcommentId)
        .collection("likes")
        .where("encryptedUid", "==", encryptedUid)
        .get()
        .then((querySnapshot) => querySnapshot.size !== 0)
    ) {
      console.log("ALREADY LIKED");
      return next(ERRORS.DATA.INVALID_DATA);
    }

    // 좋아요 누가 했는지 작성
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("subcomments")
      .doc(body.subcommentId)
      .collection("likes")
      .add({
        timestamp: firestore.FieldValue.serverTimestamp(),
        encryptedUid,
      });

    // 좋아요 수 1 올리기.
    await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("subcomments")
      .doc(body.subcommentId)
      .update({
        likes_count: firestore.FieldValue.increment(1),
      });

    res.status(200).send({ result: "subcomment like success" });

    // 암호화된 대댓글 작성자 uid 가져오기
    let subcomment_encryptedUid = await DB.convergence
      .doc(body.originalDocId)
      .collection("comments")
      .doc(body.commentId)
      .collection("subcomments")
      .doc(body.subcommentId)
      .get()
      .then((doc) => doc.data().encryptedUid);

    // 복호화된 댓글 작성자 uid 가져오기
    let subcomment_decryptedUid = decryptAES(subcomment_encryptedUid, UID_KEY);

    await DB.users
      .doc(subcomment_decryptedUid)
      .collection("notifications")
      .add({
        type: NOTIFICATION_TYPES.LIKE_MY_SUBCOMMENT,
        docId: body.originalDocId,
        checked: false,
        timestamp: firestore.FieldValue.serverTimestamp(),
        boardName: "CONVERGENCE",
      });
    console.log("send LIKE MY SUBCOMMENT notification success");
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
