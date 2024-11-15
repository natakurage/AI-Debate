import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  const contact = process.env.CONTACT_URL;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return new NextResponse(`Unauthorized (Please contact ${contact})`, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  const [authType, encoded] = authHeader.split(' ');
  if (authType !== 'Basic' || !encoded) {
    return new NextResponse(`Unauthorized (Please contact ${contact})`, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  const decoded = atob(encoded);
  const [inputUsername, inputPassword] = decoded.split(':');

  if (inputUsername !== username || inputPassword !== password) {
    return new NextResponse(`Unauthorized (Please contact ${contact})`, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  return NextResponse.next();
}
