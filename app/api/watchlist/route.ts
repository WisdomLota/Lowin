// app/api/watchlist/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const watchlist = await prisma.watchlist.findMany({
      where: { userId: session.user.id },
      orderBy: { addedAt: 'desc' }
    });

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error('Fetch watchlist error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { coinId, symbol, name } = body;

    if (!coinId || !symbol || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId: session.user.id,
        coinId,
        symbol,
        name
      }
    });

    return NextResponse.json({ watchlistItem }, { status: 201 });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Coin already in watchlist' },
        { status: 400 }
      );
    }
    console.error('Add to watchlist error:', error);
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const coinId = searchParams.get('coinId');

    if (!coinId) {
      return NextResponse.json(
        { error: 'Coin ID required' },
        { status: 400 }
      );
    }

    await prisma.watchlist.deleteMany({
      where: {
        userId: session.user.id,
        coinId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from watchlist' },
      { status: 500 }
    );
  }
}