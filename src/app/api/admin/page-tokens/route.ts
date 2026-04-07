import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import type { PageToken } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'pageTokens.json');

async function readTokens(): Promise<PageToken[]> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Support both raw array and { tokens: [...] } shape
    return Array.isArray(parsed) ? parsed : (parsed?.tokens ?? []);
  } catch {
    return [];
  }
}

async function writeTokens(tokens: PageToken[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ tokens }, null, 2), 'utf-8');
}

function generateToken(): string {
  // 5-character alphanumeric token
  return crypto.randomBytes(4).toString('hex').slice(0, 5);
}

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export async function GET(_req: NextRequest) {
  const tokens = await readTokens();
  return NextResponse.json({ tokens });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { page } = body as { page?: string };
  if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 });
  const tokens = await readTokens();
  // Prevent duplicate entries for same page
  const existing = tokens.findIndex((t) => t.page === page);
  const newToken: PageToken = { id: generateId(), page, token: generateToken() };
  if (existing !== -1) {
    tokens[existing] = newToken;
  } else {
    tokens.push(newToken);
  }
  await writeTokens(tokens);
  return NextResponse.json({ token: newToken }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const tokens = await readTokens();
  const idx = tokens.findIndex((t) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  tokens[idx].token = generateToken();
  tokens[idx].id = generateId(); // rotate id too for security
  await writeTokens(tokens);
  return NextResponse.json({ token: tokens[idx] });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  let tokens = await readTokens();
  tokens = tokens.filter((t) => t.id !== id);
  await writeTokens(tokens);
  return NextResponse.json({ success: true });
}
