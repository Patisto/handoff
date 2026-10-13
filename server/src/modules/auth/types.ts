export type AccessClaims = { sub: string; type: 'access' };
export type RefreshClaims = { sub: string; jti: string; type: 'refresh' };
