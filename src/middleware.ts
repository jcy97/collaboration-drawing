import { auth } from "./server/auth";

// auth 인증로직이 돌아갈 때 인증 여부를 검사해서
// 인증되지 않았으면 로그인 화면으로 리디렉트
export default auth((req) => {
  const isAuthenticated = !!req.auth;

  if (!isAuthenticated) {
    const newUrl = new URL("/signin", req.nextUrl.origin);
    return Response.redirect(newUrl);
  }
});
// dashboard와 dashboard 하위의 모든 경로에 위 미들웨어 로직을 적용한다.
export const config = {
  matcher: ["/dashboard", "/dashboard:path*"],
};
