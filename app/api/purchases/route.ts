// app/api/purchases/route.ts
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

    const purchases = await prisma.purchase.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error('Fetch purchases error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
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
    const { coinId, symbol, name, quantity, buyPrice, exchange, notes, date } = body;

    if (!coinId || !symbol || !name || !quantity || !buyPrice || !exchange || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId: session.user.id,
        coinId,
        symbol,
        name,
        quantity: parseFloat(quantity),
        buyPrice: parseFloat(buyPrice),
        exchange,
        notes,
        date: new Date(date)
      }
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error('Create purchase error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase' },
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Purchase ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const purchase = await prisma.purchase.findUnique({
      where: { id }
    });

    if (!purchase || purchase.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      );
    }

    await prisma.purchase.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete purchase error:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    );
  }
}