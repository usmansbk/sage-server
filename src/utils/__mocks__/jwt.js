import jwt, {
  NotBeforeError,
  TokenExpiredError,
  JsonWebTokenError,
} from "jsonwebtoken";
import { nanoid } from "nanoid";
import dayjs from "~utils/dayjs";
import {
  TOKEN_EXPIRED_ERROR,
  TOKEN_INVALID_ERROR,
  TOKEN_NOT_BEFORE_ERROR,
} from "~helpers/constants/i18n";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  allowedClients,
} from "~helpers/constants/auth";
import TokenError from "../errors/TokenError";

const secret = "test";

/**
 * exp or any other claim is only set if the payload is an object literal.
 * Buffer or string payloads are not checked for JSON validity.
 * exp, nbf, aud, sub and iss can be provided in the payload directly, but you can't include in both places.
 */
export const sign = (payload, expiresIn = "15m") => {
  const id = nanoid();
  const token = jwt.sign(payload, secret, {
    jwtid: id,
    expiresIn,
    issuer: process.env.HOST,
  });

  return { token, id };
};

export const verify = (token, options = {}) => {
  try {
    return jwt.verify(token, secret, {
      ...options,
      issuer: process.env.HOST,
      audience: allowedClients,
    });
  } catch (e) {
    if (e instanceof NotBeforeError) {
      throw new TokenError(TOKEN_NOT_BEFORE_ERROR, e);
    } else if (e instanceof TokenExpiredError) {
      throw new TokenError(TOKEN_EXPIRED_ERROR, e);
    } else if (e instanceof JsonWebTokenError) {
      throw new TokenError(TOKEN_INVALID_ERROR, e);
    } else {
      throw e;
    }
  }
};

export const decode = (token) => jwt.decode(token);

export const generateToken = (payload = {}, expiresIn = "5 minutes") => {
  const { token, id } = sign(payload, expiresIn);
  const [time, units] = expiresIn.split(" ");
  const exp = dayjs.duration(Number.parseInt(time, 10), units).asSeconds();

  return { token, exp, id };
};

/**
 *
 * @param { object } payload - JSON payload
 * @param { string } tokenExp - access token expiresIn [time unit]
 * @param { string } refreshTokenExp  - refresh token expiresIn (days)
 * @returns
 */
export const generateAuthTokens = (
  { aud, ...payload },
  tokenExp = ACCESS_TOKEN_EXPIRES_IN,
  refreshTokenExp = REFRESH_TOKEN_EXPIRES_IN
) => {
  const refreshToken = generateToken({ aud }, refreshTokenExp);
  const accessToken = generateToken(
    { aud, sid: refreshToken.id, ...payload },
    tokenExp
  );

  return {
    accessToken: accessToken.token,
    refreshToken: refreshToken.token,
    accessTokenId: accessToken.id,
    sid: refreshToken.id,
    exp: refreshToken.exp,
  };
};
