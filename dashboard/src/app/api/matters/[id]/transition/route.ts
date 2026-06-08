import { NextResponse } from 'next/server';
import { createDecisionPacket } from '@core/decision-packet';
import { isMatterStatus, transitionMatterStatus, validateMatterId } from '@core/storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    try {
      validateMatterId(id);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
    }

    const body = await request.json();
    const { status, actor, notes, actorRole } = body;

    if (!status || !actor || typeof notes !== 'string' || !notes.trim()) {
      return NextResponse.json({ error: 'Missing transition parameters: status, actor, notes' }, { status: 400 });
    }

    if (!isMatterStatus(status)) {
      return NextResponse.json({ error: `Unsupported matter status: ${status}` }, { status: 400 });
    }

    if ((status === 'approved' || status === 'rejected') && actorRole !== 'General Counsel') {
      return NextResponse.json({ error: 'Only the General Counsel role may approve or reject a matter' }, { status: 403 });
    }

    const updated = transitionMatterStatus(id, status, actor, notes, actorRole);
    const decisionPacket = createDecisionPacket({
      matter: updated,
      reviewerNote: notes
    });
    return NextResponse.json({ success: true, matter: updated, decisionPacket });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
