const crypto = require("crypto");
const { cryptoConstIv } = require("../config");

const encryptAES = (plainText, key) => {
  // 같은 암호화 UID끼리는 구별해야함으로 staticIv를 사용.
  const staticIv = Buffer.from(cryptoConstIv, "hex");

  const cipher = crypto.createCipheriv("aes-256-cbc", key, staticIv);
  let encrypted = cipher.update(plainText);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return staticIv.toString("hex") + encrypted.toString("hex");
};

const decryptAES = (cipherText, key) => {
  const iv = Buffer.from(cipherText.substring(0, 32), "hex");
  const encrypted = Buffer.from(cipherText.substring(32), "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};

module.exports = { encryptAES, decryptAES };
