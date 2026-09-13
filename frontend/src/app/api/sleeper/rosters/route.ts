import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const leagueId = request.nextUrl.searchParams.get("leagueId");

    if (!leagueId) {
        return NextResponse.json(
            { error: "League ID is required" },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(
            `https://api.sleeper.app/v1/league/${leagueId}/rosters`
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Unable to fetch league rosters" },
                { status: 502 }
            );
        }

        const rosters = await response.json();

        return NextResponse.json(rosters);
    } catch {
        return NextResponse.json(
            { error: "Something went wrong while fetching rosters" },
            { status: 500 }
        );
    }
}