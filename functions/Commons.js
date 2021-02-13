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

module.exports = {
  firestore,
  firebaseAdmin,
  DB,
  smtpTransport,
  NOTIFICATION_TYPES,
  ERRORS,
  tokenExporter,
  getRandomKey,
};
