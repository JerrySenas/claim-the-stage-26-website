import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { releaseSeats } from '@/lib/seats';

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db('tickets');
        const ticketsCollection = db.collection('tickets');

        const currentTime = new Date();

        const expiredTickets = await ticketsCollection
            .find({
                status: 'pending',
                expiresAt: { $lte: currentTime },
            })
            .toArray();

        for (const ticket of expiredTickets) {
            await releaseSeats(ticket.seats);

            await ticketsCollection.deleteOne({
                _id: ticket._id,
                status: 'pending',
                expiresAt: { $lte: currentTime },
            });
        }

        return NextResponse.json({
            ok: true,
            expiredCount: expiredTickets.length,
        });
    } catch (e) {
        console.error(e);

        return NextResponse.json(
            { error: 'Failed to process expired tickets' },
            { status: 500 }
        );
    }
}