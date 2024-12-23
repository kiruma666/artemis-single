import 'express-session';

export type TwitterOAuthSuccessAction = 'follow';

declare module 'express-session' {
  interface SessionData {
    walletAddress?: string

    twitterOAuthSuccessAction?: TwitterOAuthSuccessAction
    twitterCodeVerifier?: string
    twitterState?: string
    twitterAccessToken?: string
  }
}
