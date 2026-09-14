"use client";

import { useState } from "react";

type SleeperUser = {
  user_id: string;
  username: string;
  display_name?: string;
  avatar?: string | null;
};

type SleeperLeague = {
  league_id: string;
  name: string;
  total_rosters: number;
  season: string;
};

type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
  };
};

type RosterPlayer = {
  player_id: string;
  full_name: string;
  position: string | null;
  team: string | null;
  status: string | null;
};

type SleeperMatchupEntry = {
  roster_id: number;
  matchup_id: number | null;
  points: number;
};

type CurrentMatchup = {
  week: number;
  myMatchup: SleeperMatchupEntry;
  opponent: SleeperMatchupEntry | null;
};

export default function Home() {

  const [showConnect, setShowConnect] = useState(false);
  const [username, setUsername] = useState("");
  const [connectedUser, setConnectedUser] = useState<SleeperUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [leagues, setLeagues] = useState<SleeperLeague[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<SleeperLeague | null>(null);
  const [showLeaguePicker, setShowLeaguePicker] = useState(false);
  const [currentRoster, setCurrentRoster] =
    useState<SleeperRoster | null>(null);
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>([]);
  const [leagueRosters, setLeagueRosters] = useState<SleeperRoster[]>([]);
  const [currentMatchup, setCurrentMatchup] =
    useState<CurrentMatchup | null>(null);

  async function handleConnect() {
    if (!username.trim()) {
      setError("Enter your Sleeper username.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/sleeper/user?username=${encodeURIComponent(username.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to find Sleeper account.");
        return;
      }

      setConnectedUser(data);

      const leagueResponse = await fetch(
        `/api/sleeper/leagues?userId=${data.user_id}`
      );

      const leagueData = await leagueResponse.json();

      if (!leagueResponse.ok) {
        setError(leagueData.error || "Unable to load your leagues.");
        return;
      }

      setLeagues(leagueData);
      setShowConnect(false);
      setShowLeaguePicker(true);
      setUsername("");

    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLeagueSelect(league: SleeperLeague) {
    if (!connectedUser) return;

    try {
      // 1. Get every roster in the selected league
      const response = await fetch(
        `/api/sleeper/rosters?leagueId=${league.league_id}`
      );

      const rosterData = await response.json();

      if (!response.ok) {
        console.error("Unable to load rosters:", rosterData.error);
        return;
      }

      setLeagueRosters(rosterData);

      // 2. Find the roster owned by the connected Sleeper user
      const myRoster = rosterData.find(
        (roster: SleeperRoster) =>
          roster.owner_id === connectedUser.user_id
      );

      if (!myRoster) {
        console.error("Could not find your roster in this league.");
        return;
      }

      // 3. Save the selected league and roster
      setSelectedLeague(league);
      setCurrentRoster(myRoster);

      const matchupResponse = await fetch(
        `/api/sleeper/matchup?leagueId=${league.league_id}&rosterId=${myRoster.roster_id}`
      );

      const matchupData = await matchupResponse.json();

      if (matchupResponse.ok) {
        setCurrentMatchup(matchupData);
        console.log("Current matchup:", matchupData);
      } else {
        console.error("Unable to load matchup:", matchupData.error);
      }

      // 4. Convert Sleeper player IDs into actual player information
      const playerIds = myRoster.players ?? [];

      if (playerIds.length > 0) {
        const playerResponse = await fetch(
          `/api/sleeper/players?ids=${encodeURIComponent(playerIds.join(","))}`
        );

        const playerData = await playerResponse.json();

        if (!playerResponse.ok) {
          console.error("Unable to load players:", playerData.error);
          return;
        }

        setRosterPlayers(playerData);

        console.log("Converted players:", playerData);
      } else {
        setRosterPlayers([]);
      }

      setShowLeaguePicker(false);

      console.log("Your roster:", myRoster);
    } catch (error) {
      console.error("Roster loading failed:", error);
    }
  }

  const starterIds = currentRoster?.starters ?? [];

  const starterPlayers = starterIds
    .map((id) =>
      rosterPlayers.find((player) => player.player_id === id)
    )
    .filter((player): player is RosterPlayer => Boolean(player));

  const benchPlayers = rosterPlayers.filter(
    (player) => !starterIds.includes(player.player_id)
  );

  const wins = currentRoster?.settings?.wins ?? 0;
  const losses = currentRoster?.settings?.losses ?? 0;
  const ties = currentRoster?.settings?.ties ?? 0;

  const teamRecord = currentRoster
    ? ties > 0
      ? `${wins}-${losses}-${ties}`
      : `${wins}-${losses}`
    : "0-0";

  const rankedRosters = [...leagueRosters].sort((a, b) => {
    const aWins = a.settings?.wins ?? 0;
    const bWins = b.settings?.wins ?? 0;

    if (bWins !== aWins) {
      return bWins - aWins;
    }

    const aLosses = a.settings?.losses ?? 0;
    const bLosses = b.settings?.losses ?? 0;

    if (aLosses !== bLosses) {
      return aLosses - bLosses;
    }

    const aPoints = a.settings?.fpts ?? 0;
    const bPoints = b.settings?.fpts ?? 0;

    return bPoints - aPoints;
  });

  const leagueRank =
    currentRoster && rankedRosters.length > 0
      ? rankedRosters.findIndex(
        (roster) => roster.roster_id === currentRoster.roster_id
      ) + 1
      : null;

  const myMatchupPoints =
    currentMatchup?.myMatchup.points ?? 0;

  const opponentMatchupPoints =
    currentMatchup?.opponent?.points ?? 0;

  const totalMatchupPoints =
    myMatchupPoints + opponentMatchupPoints;

  const scoringShare =
    totalMatchupPoints > 0
      ? (myMatchupPoints / totalMatchupPoints) * 100
      : 50;

  return (
    <main className="min-h-screen bg-[#050914] text-white">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-white/5 bg-[#080e1d] p-6 md:flex">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400 font-black text-black">
                R
              </div>

              <h1 className="text-xl font-bold tracking-tight">
                Roster<span className="text-emerald-400">IQ</span>
              </h1>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Fantasy intelligence platform
            </p>
          </div>

          {/* Navigation */}
          <nav className="mt-10 space-y-1">
            <NavItem title="Dashboard" active />
            <NavItem title="My Team" />
            <NavItem title="Trade Analyzer" />
            <NavItem title="Waiver Wire" />
            <NavItem title="Playoff Simulator" />
          </nav>

          {/* League card */}
          <div className="mt-auto rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500" />

              <div>
                <p className="text-xs text-slate-500">Sleeper League</p>

                <p className="text-sm font-semibold">
                  {selectedLeague
                    ? selectedLeague.name
                    : connectedUser
                      ? "Choose a league"
                      : "Not connected"}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (connectedUser && leagues.length > 0) {
                  setShowLeaguePicker(true);
                } else {
                  setShowConnect(true);
                }
              }}
              className="mt-4 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
            >
              {selectedLeague
                ? "Change League"
                : connectedUser
                  ? "Choose League"
                  : "Connect League"}
            </button>
          </div>
        </aside>

        {/* Main */}
        <section className="flex-1 overflow-hidden">

          {/* Header */}
          <header className="flex items-center justify-between border-b border-white/5 px-8 py-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Fantasy Command Center
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Dashboard
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400 sm:block">
                2026 Season
              </div>

              <button
                onClick={() => setShowConnect(true)}
                className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300"
              >
                {connectedUser
                  ? connectedUser.display_name || connectedUser.username
                  : "Connect Sleeper"}
              </button>
            </div>
          </header>

          <div className="relative p-8">

            {/* Background glow */}
            <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />

            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#101a29] via-[#0b1220] to-[#07111c] p-8">
              <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative z-10 grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
                <div>
                  <div className="mb-5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />

                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                      Roster Intelligence
                    </p>
                  </div>

                  <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
                    Your lineup.
                    <br />
                    <span className="text-slate-500">
                      Backed by better decisions.
                    </span>
                  </h1>

                  <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
                    Turn your Sleeper league into actionable insights for trades,
                    waivers, lineup decisions, and playoff probability.
                  </p>

                  <div className="mt-7 flex gap-3">
                    <button className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300">
                      Connect Your League
                    </button>

                    <button className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10">
                      Explore Demo
                    </button>
                  </div>
                </div>

                {/* IQ Score */}
                <div className="flex items-center justify-center">
                  <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/[0.03]">
                    <div className="absolute inset-4 rounded-full border border-dashed border-emerald-400/20" />

                    <div className="text-center">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        RosterIQ
                      </p>

                      <p className="mt-1 text-5xl font-bold">
                        --
                      </p>

                      <p className="mt-2 text-xs text-emerald-400">
                        Awaiting league data
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Record"
                value={teamRecord}
                subtext="Season record"
                accent="Current"
              />

              <StatCard
                label="League Rank"
                value={leagueRank ? `#${leagueRank}` : "--"}
                subtext={
                  selectedLeague
                    ? `Out of ${selectedLeague.total_rosters} teams`
                    : "Connect your league"
                }
                accent="Power Rank"
              />

              <StatCard
                label="Projected Points"
                value="--"
                subtext="This week"
                accent="Projection"
              />

              <StatCard
                label="Playoff Odds"
                value="--"
                subtext="Current probability"
                accent="Simulation"
              />
            </div>

            {/* Content */}
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">

              {/* Matchup */}
              <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {currentMatchup
                        ? `Week ${currentMatchup.week}`
                        : "Current Week"}
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      Matchup Preview
                    </h3>
                  </div>

                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    {currentMatchup ? "Live Data" : "Waiting"}
                  </span>
                </div>

                <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-6">

                  {/* Your Team */}
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-xs font-bold text-emerald-400">
                      YOU
                    </div>

                    <p className="mt-3 font-semibold">
                      Your Team
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {currentMatchup
                        ? myMatchupPoints.toFixed(2)
                        : "--"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Points
                    </p>
                  </div>

                  <div className="text-xs font-semibold text-slate-600">
                    VS
                  </div>

                  {/* Opponent */}
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300">
                      OPP
                    </div>

                    <p className="mt-3 font-semibold">
                      {currentMatchup?.opponent
                        ? `Roster #${currentMatchup.opponent.roster_id}`
                        : "Opponent"}
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {currentMatchup?.opponent
                        ? opponentMatchupPoints.toFixed(2)
                        : "--"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Points
                    </p>
                  </div>
                </div>

                <div className="mt-8 border-t border-white/5 pt-5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Current scoring share</span>

                    <span>
                      {currentMatchup
                        ? `${Math.round(scoringShare)}%`
                        : "--"}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500"
                      style={{ width: `${scoringShare}%` }}
                    />
                  </div>
                </div>
              </section>

              {/* Quick actions */}
              <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Tools
                  </p>

                  <h3 className="mt-1 text-lg font-semibold">
                    Quick Actions
                  </h3>
                </div>

                <div className="mt-5 space-y-3">
                  <QuickAction
                    number="01"
                    title="Trade Analyzer"
                    description="See who really wins the deal."
                  />

                  <QuickAction
                    number="02"
                    title="Waiver Finder"
                    description="Find upgrades before your league does."
                  />

                  <QuickAction
                    number="03"
                    title="Playoff Simulator"
                    description="Run thousands of season outcomes."
                  />
                </div>
              </section>
            </div>

            {currentRoster && (
              <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Your Team
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      Roster
                    </h3>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {rosterPlayers.length} Players
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {starterPlayers.length} starters • {benchPlayers.length} bench
                    </p>
                  </div>
                </div>

                {/* Starters */}
                <div className="mt-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />

                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em]">
                      Starting Lineup
                    </h4>

                    <span className="text-xs text-slate-500">
                      {starterPlayers.length}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {starterPlayers.map((player) => (
                      <RosterPlayerCard
                        key={player.player_id}
                        player={player}
                        starter
                      />
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="my-8 border-t border-white/5" />

                {/* Bench */}
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-slate-600" />

                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-300">
                      Bench
                    </h4>

                    <span className="text-xs text-slate-500">
                      {benchPlayers.length}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {benchPlayers.map((player) => (
                      <RosterPlayerCard
                        key={player.player_id}
                        player={player}
                      />
                    ))}
                  </div>
                </div>

              </section>
            )}

            {/* Bottom */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              {/* Position Strength */}
              <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Roster Breakdown
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      Position Strength
                    </h3>
                  </div>

                  <button className="text-xs font-medium text-emerald-400">
                    Full roster →
                  </button>
                </div>

                <div className="mt-6 space-y-5">
                  <PositionBar position="QB" />
                  <PositionBar position="RB" />
                  <PositionBar position="WR" />
                  <PositionBar position="TE" />
                </div>
              </section>

              {/* Insights */}
              <section className="relative overflow-hidden rounded-3xl border border-emerald-400/10 bg-gradient-to-br from-emerald-400/[0.07] to-transparent p-6">
                <div className="absolute -bottom-24 -right-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

                <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">
                  IQ Insights
                </p>

                <h3 className="mt-3 text-2xl font-semibold">
                  Your weekly advantage starts here.
                </h3>

                <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                  Once your league is connected, RosterIQ will surface roster
                  weaknesses, trade opportunities, matchup advantages, and
                  waiver targets automatically.
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-sm font-bold text-black">
                    IQ
                  </span>

                  <p className="text-xs text-slate-500">
                    Personalized using your league data
                  </p>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1220] p-7 shadow-2xl">

            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Sleeper Connection
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Connect your league
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Enter your Sleeper username and RosterIQ will find your account.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowConnect(false);
                  setError("");
                }}
                className="text-xl text-slate-500 transition hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <label className="text-xs font-medium text-slate-400">
                Sleeper username
              </label>

              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleConnect();
                  }
                }}
                placeholder="Enter username"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50"
              />

              {error && (
                <p className="mt-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                onClick={handleConnect}
                disabled={loading}
                className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Connect Account"}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-slate-600">
              RosterIQ only reads public Sleeper fantasy data.
            </p>
          </div>
        </div>
      )}

      {showLeaguePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b1220] p-7 shadow-2xl">

            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Your Sleeper Leagues
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Choose a league
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Select the league you want RosterIQ to analyze.
                </p>
              </div>

              <button
                onClick={() => setShowLeaguePicker(false)}
                className="text-xl text-slate-500 transition hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {leagues.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
                  <p className="text-sm text-slate-400">
                    No 2026 Sleeper leagues found.
                  </p>
                </div>
              ) : (
                leagues.map((league) => (
                  <button
                    key={league.league_id}
                    onClick={() => handleLeagueSelect(league)}
                    className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.05]"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {league.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {league.total_rosters} teams • {league.season} season
                      </p>
                    </div>

                    <span className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-400">
                      →
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
};

function NavItem({
  title,
  active = false,
}: {
  title: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${active
        ? "bg-emerald-400/10 font-medium text-emerald-400"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
    >
      {title}
    </button>
  );
}

function StatCard({
  label,
  value,
  subtext,
  accent,
}: {
  label: string;
  value: string;
  subtext: string;
  accent: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-emerald-400/20 hover:bg-white/[0.04]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>

        <span className="text-[10px] uppercase tracking-wider text-slate-600">
          {accent}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>

      <p className="mt-2 text-xs text-slate-500">{subtext}</p>
    </div>
  );
}

function Team({
  initials,
  name,
  projection,
}: {
  initials: string;
  name: string;
  projection: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs font-bold text-slate-300">
        {initials}
      </div>

      <p className="mt-3 font-semibold">{name}</p>

      <p className="mt-1 text-xs text-slate-500">
        Projected {projection}
      </p>
    </div>
  );
}

function QuickAction({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <button className="group flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-black/20 p-4 text-left transition hover:border-emerald-400/20 hover:bg-white/5">
      <span className="text-xs font-semibold text-emerald-400">
        {number}
      </span>

      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      <span className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-400">
        →
      </span>
    </button>
  );
}

function PositionBar({ position }: { position: string }) {
  return (
    <div>
      <div className="mb-2 flex justify-between">
        <span className="text-sm font-medium">{position}</span>
        <span className="text-xs text-slate-500">Not analyzed</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-0 bg-emerald-400" />
      </div>
    </div>
  );
}

function PlayerAvatar({ player }: { player: RosterPlayer }) {
  const [imageFailed, setImageFailed] = useState(false);

  const isDefense = player.position === "DEF";

  const imageUrl = isDefense
    ? `https://a.espncdn.com/i/teamlogos/nfl/500/${player.team?.toLowerCase()}.png`
    : `https://sleepercdn.com/content/nfl/players/thumb/${player.player_id}.jpg`;

  if (imageFailed) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-xs font-bold text-emerald-400">
        {player.position ?? "?"}
      </div>
    );
  }

  return (
    <div
      className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl ${isDefense ? "bg-white/5 p-1.5" : "bg-slate-800"
        }`}
    >
      <img
        src={imageUrl}
        alt={player.full_name}
        onError={() => setImageFailed(true)}
        className={
          isDefense
            ? "h-full w-full object-contain"
            : "h-full w-full object-cover object-top"
        }
      />
    </div>
  );
}

function RosterPlayerCard({
  player,
  starter = false,
}: {
  player: RosterPlayer;
  starter?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 transition ${starter
        ? "border-emerald-400/15 bg-emerald-400/[0.03] hover:border-emerald-400/30"
        : "border-white/5 bg-black/20 hover:border-white/10 hover:bg-white/[0.03]"
        }`}
    >
      <PlayerAvatar player={player} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {player.full_name}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <span
            className={`text-xs font-semibold ${starter ? "text-emerald-400" : "text-slate-400"
              }`}
          >
            {player.position ?? "?"}
          </span>

          <span className="text-xs text-slate-500">
            {player.team ?? "FA"}
          </span>
        </div>
      </div>

      {starter && (
        <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
          Starter
        </span>
      )}
    </div>
  );
}