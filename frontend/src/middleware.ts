import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Custom domain routing disabled for now — slug links only (/r/code). */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
