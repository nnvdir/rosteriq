import { NextRequest, NextResponse } from "next/server";

type MatchupEntry = {
    roster_id: number;
    matchup_id: number | null;
    points: number;
    players?: string[];
    starters?: string[];
    custom_points?: number | null;
};

export async function GET(request: NextRequest) {
    const leagueId = request.nextUrl.searchParams.get("leagueId");
    const rosterIdParam = request.nextUrl.searchParams.get("rosterId");

    if (!leagueId || !rosterIdParam) {
        return NextResponse.json(
            { error: "League ID and roster ID are required" },
            { status: 400 }
        );
    }

    const rosterId = Number(rosterIdParam);

    try {
        // Get the current NFL week
        const stateResponse = await fetch(
            "https://api.sleeper.app/v1/state/nfl",
            {
                next: { revalidate: 300 },
            }
        );

        if (!stateResponse.ok) {
            return NextResponse.json(
                { error: "Unable to determine current NFL week" },
                { status: 502 }
            );
        }

        const state = await stateResponse.json();
        const week = state.week;

        // Get every matchup for that week
        const matchupResponse = await fetch(
            `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`,
            {
                next: { revalidate: 60 },
            }
        );

        if (!matchupResponse.ok) {
            return NextResponse.json(
                { error: "Unable to fetch matchup" },
                { status: 502 }
            );
        }

        const matchups: MatchupEntry[] =
            await matchupResponse.json();

        const myMatchup = matchups.find(
            (matchup) => matchup.roster_id === rosterId
        );

        if (!myMatchup) {
            return NextResponse.json(
                { error: "Your matchup was not found" },
                { status: 404 }
            );
        }

        const opponent = matchups.find(
            (matchup) =>
                matchup.matchup_id === myMatchup.matchup_id &&
                matchup.roster_id !== myMatchup.roster_id
        );

        return NextResponse.json({
            week,
            myMatchup,
            opponent: opponent ?? null,
        });
    } catch {
        return NextResponse.json(
            { error: "Something went wrong while loading the matchup" },
            { status: 500 }
        );
    }
}