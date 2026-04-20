import jwt from "jsonwebtoken";

const secretKey = process.env.MSSQLDB_SECRET; // Use the same key that was used to sign the token

export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded);
    });
  });
}
