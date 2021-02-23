const firebaseAdmin = require("firebase-admin");
const { secrets, mailAccount } = require("../config");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const ERRORS = {
  AUTH: {
    TOKEN_FAIL: "TOKEN_FAIL",
    NO_AUTH_IN_HEADER: "NO_AUTH_IN_HEADER",
    NO_UID: "NO_UID",
    CANT_SIGNUP: "CANT_SIGNUP",
    ALREADY_SIGNEDUP: "ALREADY_SIGNEDUP",
    NO_PERMISSION: "NO_PERMISSION",
  },
  DATA: {
    INVALID_DATA: "INVALID_DATA",
  },
};

const NOTIFICATION_TYPES = {
  LIKE_MY_DOC: "LIKE_MY_DOC",
  LIKE_MY_COMMENT: "LIKE_MY_COMMENT",
  LIKE_MY_SUBCOMMENT: "LIKE_MY_SUBCOMMENT",
  COMMENT_MY_DOC: "COMMENT_MY_DOC",
  SUBCOMMENT_MY_COMMENT: "SUBCOMMENT_MY_COMMENT",
};

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(secrets),
});

const firestore = firebaseAdmin.firestore;

const DB = {
  users: firestore().collection("users"),
  departMajor: firestore().collection("departMajor"),
  departMajor_UID_KEY: firestore().collection("departMajor_UID_KEY"),
  convergence: firestore().collection("convergence"),
  convergence_UID_KEY: firestore().collection("convergence_UID_KEY"),
  announcement: firestore().collection("announcement"),
};

const smtpTransport = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: mailAccount.user,
    pass: mailAccount.pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const tokenExporter = (headers) => {
  if (headers.authorization) {
    let idToken = headers.authorization.split("Bearer ")[1];
    return firebaseAdmin
      .auth()
      .verifyIdToken(idToken)
      .then((decodedToken) => decodedToken)
      .catch((_err) => {
        return ERRORS.AUTH.TOKEN_FAIL;
      });
  } else {
    return ERRORS.AUTH.NO_AUTH_IN_HEADER;
  }
};

const getRandomKey = (bytes) => {
  return crypto.randomBytes(bytes);
};

const findStrInArray = (strToFind, array) => {
  let found = false;
  array.forEach((item) => {
    if (!found) {
      found = strToFind === item;
    }
  });
  return found;
};

const nicknameList = [
  "배고픈 융슝이",
  "졸린 융슝이",
  "새내기 융슝이",
  "희귀한 융슝이",
  "명예로운 융슝이",
  "배부른 융슝이",
  "착한 융슝이",
  "짱인 융슝이",
  "멋진 융슝이",
  "잘생긴 융슝이",
  "예쁜 융슝이",
  "멋쟁이 융슝이",
  "화려한 융슝이",
  "귀여운 융슝이",
  "깜찍한 융슝이",
  "밥 잘사주는 융슝이",
  "어쩌다 발견한 융슝이",
  "멜로가 체질인 융슝이",
  "불시착한 융슝이",
  "신난 융슝이",
  "집콬중인 융슝이",
  "물어보는 융슝이",
  "질문하는 융슝이",
  "별에서 온 융슝이",
  "응답하라 융슝이",
  "꼬마 융슝이",
  "친절한 융슝이",
  "따뜻한 융슝이",
  "논리적인 융슝이",
  "목마른 융슝이",
  "장난 아닌 융슝이",
  "느낌있는 융슝이",
  "엄청 쎈 융슝이",
  "목소리 좋은 융슝이",
  "인싸 융슝이",
  "인기많은 융슝이",
  "수상한 융슝이",
  "평범한 융슝이",
  "건강한 융슝이",
  "국보급 융슝이",
  "뽀짝뽀짝한 융슝이",
  "늠름한 융슝이",
  "듬직한 융슝이",
  "똑똑한 융슝이",
  "궁금한 융슝이",
  "신기한 융슝이",
  "흔치않은 융슝이",
  "짱인 융슝이",
  "천재같은 융슝이",
  "선배미 뿜뿜 융슝이",
];

module.exports = {
  firestore,
  firebaseAdmin,
  DB,
  smtpTransport,
  NOTIFICATION_TYPES,
  ERRORS,
  tokenExporter,
  getRandomKey,
  nicknameList,
  findStrInArray,
};
