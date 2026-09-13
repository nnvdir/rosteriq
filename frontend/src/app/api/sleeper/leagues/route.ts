import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
        return NextResponse.json(
            { error: "User ID is required" },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(
            `https://api.sleeper.app/v1/user/${userId}/leagues/nfl/2026`
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Unable to fetch Sleeper leagues" },
                { status: 502 }
            );
        }

        const leagues = await response.json();

        return NextResponse.json(leagues);
    } catch {
        return NextResponse.json(
            { error: "Something went wrong while fetching leagues" },
            { status: 500 }
        );
    }
}