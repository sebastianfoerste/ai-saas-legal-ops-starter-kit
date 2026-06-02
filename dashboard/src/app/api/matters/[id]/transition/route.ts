import { NextResponse } from 'next/server';
import { transitionMatterStatus } from '@core/storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, actor, notes } = body;

    if (!status || !actor || !notes) {
      return NextResponse.json({ error: 'Missing transition parameters: status, actor, notes' }, { status: 400 });
    }

    const updated = transitionMatterStatus(id, status, actor, notes);
    return NextResponse.json({ success: true, matter: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
