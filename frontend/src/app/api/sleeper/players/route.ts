import { NextRequest, NextResponse } from "next/server";

type SleeperPlayer = {
    player_id?: string;
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
    position?: string | null;
    team?: string | null;
    status?: string | null;
    fantasy_positions?: string[] | null;
};

export async function GET(request: NextRequest) {
    const idsParam = request.nextUrl.searchParams.get("ids");

    if (!idsParam) {
        return NextResponse.json(
            { error: "Player IDs are required" },
            { status: 400 }
        );
    }

    const playerIds = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

    try {
        const response = await fetch(
            "https://api.sleeper.app/v1/players/nfl",
            {
                next: {
                    revalidate: 86400,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Unable to fetch Sleeper players" },
                { status: 502 }
            );
        }

        const playerMap: Record<string, SleeperPlayer> =
            await response.json();

        const players = playerIds.map((id) => {
            const player = playerMap[id];

            // Sleeper can also use NFL team abbreviations for defenses
            if (!player) {
                const isDefense = /^[A-Z]{2,3}$/.test(id);

                return {
                    player_id: id,
                    full_name: isDefense ? `${id} D/ST` : "Unknown Player",
                    position: isDefense ? "DEF" : null,
                    team: isDefense ? id : null,
                    status: null,
                };
            }

            const fullName =
                player.full_name ||
                [player.first_name, player.last_name]
                    .filter(Boolean)
                    .join(" ");

            return {
                player_id: id,
                full_name: fullName || "Unknown Player",
                position:
                    player.position ||
                    player.fantasy_positions?.[0] ||
                    null,
                team: player.team || null,
                status: player.status || null,
            };
        });

        return NextResponse.json(players);
    } catch {
        return NextResponse.json(
            { error: "Something went wrong while fetching players" },
            { status: 500 }
        );
    }
}