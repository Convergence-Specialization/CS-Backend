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
  "배부른 융슝이",
  "졸린 융슝이",
  "기쁜 융슝이",
  "슝늉먹는 융슝이",
  "올바른 융슝이",
  "바른 융슝이",
  "부드러운 융슝이",
  "새내기 융슝이",
  "희귀한 융슝이",
  "명예로운 융슝이",
  "희망찬 융슝이",
  "착한 융슝이",
  "짱인 융슝이",
  "멋진 융슝이",
  "매력적인 융슝이",
  "순진한 융슝이",
  "얌전한 융슝이",
  "믿을만한 융슝이",
  "멋쟁이 융슝이",
  "화려한 융슝이",
  "귀여운 융슝이",
  "깜찍한 융슝이",
  "밥 잘사주는 융슝이",
  "어쩌다 발견한 융슝이",
  "멜로가 체질인 융슝이",
  "불시착한 융슝이",
  "신난 융슝이",
  "활발한 융슝이",
  "집콕중인 융슝이",
  "물어보는 융슝이",
  "행복한 융슝이",
  "즐거운 융슝이",
  "하늘하늘한 융슝이",
  "별에서 온 융슝이",
  "응답하라 융슝이",
  "꼬마 융슝이",
  "친절한 융슝이",
  "훈훈한 융슝이",
  "과잠입은 융슝이",
  "싸강듣는 융슝이",
  "팀플하는 융슝이",
  "참을성있는 융슝이",
  "공손한 융슝이",
  "예의바른 융슝이",
  "마스크 쓴 융슝이",
  "흥겨운 융슝이",
  "야망있는 융슝이",
  "알바하는 융슝이",
  "장학생 융슝이",
  "열정적인 융슝이",
  "과제하는 융슝이",
  "따뜻한 융슝이",
  "준비된 융슝이",
  "논리적인 융슝이",
  "환상적인 융슝이",
  "상냥한 융슝이",
  "노래하는 융슝이",
  "꿈을 꾸는 융슝이",
  "수수한 융슝이",
  "쾌활한 융슝이",
  "목마른 융슝이",
  "안아주는 융슝이",
  "장난 아닌 융슝이",
  "자유로운 융슝이",
  "느낌있는 융슝이",
  "엄청 쎈 융슝이",
  "목소리 좋은 융슝이",
  "인싸 융슝이",
  "인기많은 융슝이",
  "수상한 융슝이",
  "평범한 융슝이",
  "로맨틱한 융슝이",
  "유머러스한 융슝이",
  "건강한 융슝이",
  "국보급 융슝이",
  "뽀짝뽀짝한 융슝이",
  "보기드문 융슝이",
  "늠름한 융슝이",
  "듬직한 융슝이",
  "의젓한 융슝이",
  "당당한 융슝이",
  "당찬 융슝이",
  "호탕한 융슝이",
  "점잖은 융슝이",
  "씩씩한 융슝이",
  "똑똑한 융슝이",
  "존경스러운 융슝이",
  "대단한 융슝이",
  "힙한 융슝이",
  "꼼꼼한 융슝이",
  "호감가는 융슝이",
  "섬세한 융슝이",
  "호기로운 융슝이",
  "궁금한 융슝이",
  "신기한 융슝이",
  "개성있는 융슝이",
  "귀티나는 융슝이",
  "수다스러운 융슝이",
  "너그러운 융슝이",
  "남다른 융슝이",
  "흔치않은 융슝이",
  "재치있는 융슝이",
  "익살스러운 융슝이",
  "독보적인 융슝이",
  "정직한 융슝이",
  "자애로운 융슝이",
  "자상한 융슝이",
  "솔직한 융슝이",
  "야무진 융슝이",
  "성실한 융슝이",
  "낭만적인 융슝이",
  "총명한 융슝이",
  "사근사근한 융슝이",
  "휴학 중인 융슝이",
  "산뜻한 융슝이",
  "사랑스러운 융슝이",
  "꿈 많은 융슝이",
  "유순한 융슝이",
  "튼튼한 융슝이",
  "미소짓는 융슝이",
  "아리송한 융슝이",
  "훌륭한 융슝이",
  "신중한 융슝이",
  "자비로운 융슝이",
  "밝게 빛나는 융슝이",
  "살짝 설렌 융슝이",
  "뭘 좀 아는 융슝이",
  "소신있는 융슝이",
  "인자한 융슝이",
  "긍정적인 융슝이",
  "창의적인 융슝이",
  "치킨먹는 융슝이",
  "피자먹는 융슝이",
  "물마시는 융슝이",
  "명랑한 융슝이",
  "파릇파릇한 융슝이",
  "기운찬 융슝이",
  "싹싹한 융슝이",
  "진지한 융슝이",
  "고상한 융슝이",
  "자몽한 융슝이",
  "들뜬 융슝이",
  "기특한 융슝이",
  "나는 융슝이",
  "마음넓은 융슝이",
  "다정한 융슝이",
  "겸손한 융슝이",
  "별 보러가는 융슝이",
  "우아한 융슝이",
  "센스있는 융슝이",
  "재미있는 융슝이",
  "짱인 융슝이",
  "천재같은 융슝이",
  "지혜로운 융슝이",
  "아름다운 융슝이",
  "수줍은 융슝이",
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
