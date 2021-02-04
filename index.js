const express = require("express");
const cors = require("cors");
const logger = require("morgan");

const app = express();
const PORT = process.env.PORT || 5000;

const departMajorRouter = require("./functions/DepartMajor");

const usersRouter = require("./functions/Users");

app.use(logger(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(cors());

app.use("/board/departmajor", departMajorRouter);

app.use("/user", usersRouter);

app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
});

// 1년이 지났는데 이용자 수가 많으면, firebase functions 등록해서 1년 지난 회원들 자동
// 탈퇴처리하는거 구현.;
// 6개월 지났는데 이용자 수가 많으면, 탈퇴한 유저들 개인정보 가지고있다가 6개월 후에 파기하는거 구현.
