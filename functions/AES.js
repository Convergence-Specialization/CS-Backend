const crypto = require("crypto");

const encryptAES = (plainText, key) => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plainText);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + encrypted.toString("hex");
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
