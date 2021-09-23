import feed, {
    IBoxScoreFeed, IGame, IPlay, IPlayBase, IPlayByPlayFeed, IPlayerStats, IPlayFG, IPlayFumble, IPlayLateralPass, IPlayPlayer, IPlayPunt, IPlayRush, ISchedule, IScoringTable
} from './mySportsFeed';
import * as sql from './sql';

const season = "2021-2022-regular";



// Get the opponent of a team when the play-by-play doesn't have it.
function opponent(team: string, home: string, away: string) {
    return team === home ? away : home;
}


export async function getScoring(week: number): Promise<void> {

    // download scores for the week from feed


    // get all the 
    const schedule = (await feed(`${season}/week/${week}/games.json`)) as ISchedule;

    await sql.query(`DELETE FROM [Scoring] WHERE [Week]=${week}`);


    for await (const game of schedule.games) {

        if (game.schedule.playedStatus === 'UNPLAYED') continue;

        const lines = await getBoxScore(season, week, game.schedule.id);

        const query = `
            INSERT INTO 
                Scoring (Week, Time, TeamID, PlayerIndex, PlayerName, ScoreType, ScoreMethod, Yards, Attempts, Success)
            SELECT 
                *
            FROM 
                OPENJSON(N'${JSON.stringify(lines, null, 2).replace(/'/g, "''")}', '$')
            WITH (
                Week	    smallint,
                Time	    varchar(8),
                TeamID	    varchar(3),
                PlayerIndex	varchar(8),
                PlayerName	nvarchar(32),
                ScoreType	varchar(6),
                ScoreMethod	varchar(6),
                Yards	    smallint,
                Attempts	tinyint,
                Success     tinyint
            );`;

        await sql.query(query, true).catch(error => console.log(error));

    };


    const query = `        
        -- Update LA to LAR
        UPDATE Scoring SET TeamID='LAR' WHERE TeamID='LA'
        UPDATE Scoring SET PlayerIndex='LAR' WHERE PlayerIndex='LA'

        
        -- Set points for scores
        UPDATE
            Scoring
        SET
            Scoring.Points = Sr.Yards * GREATEST(Sc.Yards,0) + Sr.Points + Sr.Per * ISNULL(Sc.Success, 0),
            Scoring.FPoints = Sr.Yards * GREATEST(Sc.Yards,0) + Sr.Points + Sr.Per * ISNULL(Sc.Success, 0)
        FROM
            Scoring Sc
        JOIN
            ScoreRates Sr
        ON
            Sc.ScoreMethod = Sr.ScoreMethod AND
            Sc.ScoreType = Sr.ScoreType
        WHERE
            Sc.Week = ${week};
        
        
        -- clear the bench for the week
        DELETE FROM Bench WHERE Week=${week};
        
        
        -- populate the bench from non-starters
        INSERT INTO 
            Bench
        SELECT
            ${week}, P.OwnerID, P.PlayerIndex
        FROM
            Players P
        LEFT JOIN
            Starters S
        ON 
            P.PlayerIndex = S.PlayerIndex AND 
            S.Week = ${week}
        WHERE 
            S.PlayerIndex is NULL AND
            P.OwnerID is not null;
        
        
        -- Placeholders for Do-nothing players
        Insert Into 
            Scoring (Week, Time, TeamID, PlayerIndex, PlayerName, ScoreType, ScoreMethod, Yards, Points,OwnerID)
        Select  
            ${week}, Null, P.NFLTeam, P.PlayerIndex, P.[Name], Null, Null, 0, 0, P.OwnerID 
        FROM 
            Players P
        WHERE 
            P.PlayerIndex Not In (Select PlayerIndex From Scoring where week=${week} AND Scoring.PlayerIndex is not null);
        
        
        -- Update OwnerIds of owned players
        UPDATE
            Scoring
        SET
            Scoring.OwnerID=P.OwnerID
        FROM
            Scoring Sc
        JOIN
            (SELECT 
                S.*
            FROM
                Starters S
            WHERE
                S.Week = ${week}
            UNION
            SELECT 
                B.*
            FROM
                Bench B
            WHERE
                B.Week = ${week}) AS P
        ON
            P.PlayerIndex = Sc.PlayerIndex AND
            Sc.Week = P.Week
        WHERE
            Sc.Week = ${week};

            
        -- Update Fantasy Team Total Points
        UPDATE FFSchedule  
        SET Team1Score=GameTotals.Points, Team1FScore=GameTotals.FPoints   
        FROM  
        (SELECT ST.OwnerID, SUM(SC.Points) Points, SUM(SC.FPoints) FPoints  
            FROM FFSchedule FS  
            JOIN Starters ST ON FS.Week=ST.Week AND FS.Team1ID=ST.OwnerID AND FS.Week=${week}  
            JOIN Players P ON ST.playerIndex=P.PlayerIndex  
            JOIN Scoring SC ON SC.playerIndex=P.playerIndex AND SC.Week=${week}  
            GROUP BY ST.OwnerID) GameTotals  
        WHERE FFSchedule.Week=${week} and FFSchedule.Team1ID=GameTotals.OwnerID; 
            
        UPDATE FFSchedule  
        SET Team2Score=GameTotals.Points, Team2FScore=GameTotals.FPoints   
        FROM  
        (SELECT ST.OwnerID, SUM(SC.Points) Points, SUM(SC.FPoints) FPoints  
            FROM FFSchedule FS  
            JOIN Starters ST ON FS.Week=ST.Week AND FS.Team2ID=ST.OwnerID AND FS.Week=${week}  
            JOIN Players P ON ST.playerIndex=P.PlayerIndex  
            JOIN Scoring SC ON SC.playerIndex=P.playerIndex AND SC.Week=${week}  
            GROUP BY ST.OwnerID) GameTotals  
        WHERE FFSchedule.Week=${week} and FFSchedule.Team2ID=GameTotals.OwnerID;


        -- Update Fantasy Team Record
        -- ViewResults is a View that returns per/team fantasy game results
        UPDATE
            FFOwners
        SET
            FFOwners.TotalWin = Record.W,
            FFOwners.TotalTie = Record.T,
            FFOwners.TotalLoss = Record.L,
            FFOwners.PF = Record.PF,
            FFOwners.PA = Record.PA,
            FFOwners.HighPoint = Record.High,
            FFOwners.LowPoint = Record.Low,
            FFOwners.Games = Record.Games
        FROM (
            SELECT
                R.Team,
                SUM(R.W) AS W,
                SUM(R.T) AS T,
                SUM(R.L) AS L,
                SUM(R.Points) AS PF,
                SUM(R.OppPoints) AS PA,
                COUNT(R.Team) AS Games,
                MAX(R.Points) AS High,
                MIN(R.Points) AS Low
            FROM
                ViewResults R
            GROUP BY
                R.Team) AS Record
        WHERE
            FFOwners.OwnerID = Record.Team;


        -- Update Fantasy Team Divisional Record
        UPDATE
            FFOwners
        SET
            FFOwners.DivWin = Record.W,
            FFOwners.DivTie = Record.T,
            FFOwners.DivLoss = Record.L
        FROM (
            SELECT
                R.Team,
                SUM(R.W) AS W,
                SUM(R.T) AS T,
                SUM(R.L) AS L
            FROM
                ViewResults R
            WHERE
                R.Div = 1
            GROUP BY
                R.Team) AS Record
        WHERE
            FFOwners.OwnerID = Record.team;


        -- Update the owner's w/t/l streak
        UPDATE
            FFOwners
        SET
            FFOwners.Streak = Streak.Streak
        FROM 
            ViewStreak Streak
        WHERE
            FFOwners.OwnerID = Streak.team;
`;

    await sql.query(query, true).catch(error => console.log(error));


    return;

}


const players = {};

export async function getBoxScore(season: string, week: number, gameId: number): Promise<Array<IScoringTable>> {

    let dbRows = [];

    const boxScoreFeed: IBoxScoreFeed = (await feed(`${season}/games/${gameId}/boxscore.json`)) as IBoxScoreFeed;

    // Filter box scores to just offensive players
    const boxScore = {
        // ATL : [player, player, ...],
        // NYG : [player, player, ...],
    };

    const
        home = boxScoreFeed.game.homeTeam.abbreviation,
        away = boxScoreFeed.game.awayTeam.abbreviation

    players[home] = boxScoreFeed.stats.home.players;
    players[away] = boxScoreFeed.stats.away.players;

    const offensivePositions = ['QB', 'FB', 'RB', 'WR', 'TE', 'K'];

    boxScore[home] = {
        players: boxScoreFeed.stats.home.players.filter(ps => offensivePositions.includes(ps.player.position))
    };

    boxScore[away] = {
        players: boxScoreFeed.stats.away.players.filter(ps => offensivePositions.includes(ps.player.position))
    };

    boxScore[home].players.forEach(player => {
        dbRows = dbRows.concat(playerStatsToDBRows(week, home, player));
    });

    boxScore[away].players.forEach(player => {
        dbRows = dbRows.concat(playerStatsToDBRows(week, away, player));
    });

    // -----------------------------------------------------------------------------------------------------------------

    const playByPlayFeed: IPlayByPlayFeed = (await feed(`${season}/games/${gameId}/playbyplay.json`)) as IPlayByPlayFeed;

    // filter the plays down to just scoring plays
    const scoringPlays = filterScoringPlays(playByPlayFeed);

    dbRows = dbRows.concat(playByPlayToDBRows(week, scoringPlays, home, away));

    return dbRows;
}


//
// Filter all the plays down to just scoring plays
//
function filterScoringPlays(feed: IPlayByPlayFeed): Array<IPlay> {

    return feed.plays.filter(play => {

        // remove if 'no-play'
        if (Object.keys(play).some(key => play[key].isNoPlay)) return false;

        const scoringPlay =
            isTouchdown(play) ||
            isFumble(play).length ||
            play?.pass?.interceptingPlayer ||
            play?.extraPointAttempt?.isGood ||
            play?.fieldGoalAttempt?.isGood;

        if (
            !scoringPlay &&
            /touchdown/i.test(play.description) &&
            !/(NULLIFIED|REVERSED)/.test(play.description)
        ) {
            debugger;
            isTouchdown(play);
            isFumble(play);
        }

        return scoringPlay;
    });

}


function isTouchdown(play: IPlay) {
    return Object.keys(play).some(key => {
        // check rush, pass, kick etc for TD
        if (play[key].isEndedWithTouchdown || play[key].isTouchdown) return true;

        // check the subPlays, if present
        return play[key]?.subPlays?.some(sp => {

            // check if subPlay is TD
            if (sp.isEndedWithTouchdown) return true;

            // SubPlay is likely object, check its properties as plays
            return Object.keys(sp).some(key => {
                if (sp[key].isEndedWithTouchdown) return true;

                // A subPlay
                if (Array.isArray(sp[key])) {
                    return sp[key].some(ssp => ssp.isEndedWithTouchdown);
                }
            });
        });
    });
}

function lookUpPlayerTeam(id: string): string {

    let team: string;

    Object.keys(players).forEach(key => {
        const player = players[key].find(player => {
            return player.player.id === id
        });

        if (player) team = key;
    })

    return team;

}


function isFumble(play: IPlay): Array<IPlayFumble> {

    const fumbles: Array<IPlayFumble> = [];

    forEachSubPlay(play, (subPlay: IPlayRush | IPlayFumble | IPlayLateralPass, type: string) => {

        const subFumble = subPlay as IPlayFumble;

        if (subFumble.recoveringTeam &&
            subFumble.recoveringTeam.abbreviation !== lookUpPlayerTeam(subFumble.recoveringPlayer.id)) {
            debugger;
        }

        if (subFumble.fumblingPlayer &&
            subFumble.recoveringPlayer &&
            subFumble.fumblingTeam.abbreviation !== lookUpPlayerTeam(subFumble.fumblingPlayer.id)) {

            subFumble.fumblingTeam.abbreviation = lookUpPlayerTeam(subFumble.fumblingPlayer.id);

        }

        if (
            subFumble.recoveringTeam &&
            subFumble.recoveringTeam.abbreviation !== subFumble.fumblingTeam.abbreviation &&
            subFumble.recoveringTeam.abbreviation !== play.playStatus.teamInPossession.abbreviation
        ) {
            fumbles.push(subFumble);
        }

    });

    return fumbles;
}


function subPlayIsTD(play: IPlay): IPlayRush | IPlayFumble | IPlayLateralPass | undefined {

    let tdPlay: IPlayRush | IPlayFumble | IPlayLateralPass;

    forEachSubPlay(play, (subPlay: IPlayRush | IPlayFumble | IPlayLateralPass, type: string) => {
        if (subPlay.isEndedWithTouchdown) tdPlay = subPlay;
    });

    return tdPlay;
}

function forEachSubPlay(play: IPlay, callback: (subPlay: IPlayRush | IPlayFumble | IPlayLateralPass, type: string) => void): void {

    // for each play property (e.g. 'description', 'pass', 'playStatus', etc...)
    Object.keys(play).forEach(playType => {

        // check if the property has subPlays. it may be an empty array;
        const subPlays = play[playType]?.subPlays;

        if (subPlays) {

            // a play, could potentially, have multiple subPlays
            subPlays.forEach(sp => {

                // for each play type in the sub play 'subPlay = { rush: [...,...], fumble: {...}}
                Object.keys(sp).forEach(playType => {

                    let sppPlay = sp[playType];

                    // the play may be a single play object, or an array of multiple fumble objects.
                    // if it's a single object, make it an array, then we can process both cases the same
                    if (!Array.isArray(sppPlay)) sppPlay = [sppPlay];


                    sppPlay.forEach(spp => {

                        callback(spp, playType);

                    });

                });
            });
        }
    });

    return;
}


function playByPlayToDBRows(week: number, plays: Array<IPlay>, home: string, away: string): Array<IScoringTable> {

    const lines: Array<IScoringTable> = [];

    // Goes through each play and captures scoring data for each type of score
    plays.forEach(play => {

        const currentLineCount = lines.length;

        const subPlays = {};

        Object.keys(play).forEach(key => {
            if (play[key]?.subPlays) {
                play[key].subPlays.forEach(sp => {
                    subPlays[Object.keys(sp)[0]] = sp[Object.keys(sp)[0]];
                });
            }
        })


        const subPlayTD = subPlayIsTD(play);
        const fumbles = isFumble(play);


        //
        // Punt Block Return TD PBR
        //
        if (
            play.punt &&
            play.punt.isBlocked &&
            subPlayTD &&
            play.punt.kickingTeam.id !== (subPlayTD as IPlayRush).team.id
        ) {
            const rush = subPlayTD as IPlayRush;
            lines.push(
                {   // D/ST
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: rush.team.abbreviation,
                    PlayerIndex: rush.team.abbreviation,
                    PlayerName: rush.team.abbreviation,
                    ScoreType: 'TD',
                    ScoreMethod: 'PBR',
                    Yards: rush.yardsRushed,
                    Attempts: 0,
                    Success: 0,
                },
                {   // Player
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: rush.team.abbreviation,
                    PlayerIndex: rush.rushingPlayer.id,
                    PlayerName: `${rush.rushingPlayer.firstName} ${rush.rushingPlayer.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'PBR',
                    Yards: rush.yardsRushed,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }


        //
        // Kickoff Return TD KRT
        //
        if (
            play.kick &&
            play.kick.isTouchdown &&
            play.kick.retrievingTeam?.id !== play.playStatus.teamInPossession.id
        ) {
            lines.push(
                {   // D/ST
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.kick.retrievingTeam.abbreviation,
                    PlayerIndex: play.kick.retrievingTeam.abbreviation,
                    PlayerName: play.kick.retrievingTeam.abbreviation,
                    ScoreType: 'TD',
                    ScoreMethod: 'KRT',
                    Yards: play.kick.yardsReturned,
                    Attempts: 0,
                    Success: 0,
                },
                {   // Player
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.kick.retrievingTeam.abbreviation,
                    PlayerIndex: play.kick.retrievingPlayer.id,
                    PlayerName: `${play.kick.retrievingPlayer.firstName} ${play.kick.retrievingPlayer.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'KRT',
                    Yards: play.kick.yardsReturned,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }


        //
        // Punt Return TD KRT
        //
        if (
            play.punt &&
            play.punt.isTouchdown &&
            play.punt.retrievingTeam?.id !== play.playStatus.teamInPossession.id
        ) {
            lines.push(
                {   // D/ST
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.punt.retrievingTeam.abbreviation,
                    PlayerIndex: play.punt.retrievingTeam.abbreviation,
                    PlayerName: play.punt.retrievingTeam.abbreviation,
                    ScoreType: 'TD',
                    ScoreMethod: 'PRT',
                    Yards: play.punt.yardsReturned,
                    Attempts: 0,
                    Success: 0,
                },
                {   // Player
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.punt.retrievingTeam.abbreviation,
                    PlayerIndex: play.punt.retrievingPlayer.id,
                    PlayerName: `${play.punt.retrievingPlayer.firstName} ${play.punt.retrievingPlayer.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'PRT',
                    Yards: play.punt.yardsReturned,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }




        //
        // FG Block Return TD FBR
        //
        if (
            play.fieldGoalAttempt &&
            play.fieldGoalAttempt.isBlocked &&
            subPlayTD &&
            play.fieldGoalAttempt.team.id !== (subPlayTD as IPlayRush).team.id
        ) {
            const rush = subPlayTD as IPlayRush;
            lines.push(
                {   // D/ST
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: rush.team.abbreviation,
                    PlayerIndex: rush.team.abbreviation,
                    PlayerName: rush.team.abbreviation,
                    ScoreType: 'TD',
                    ScoreMethod: 'BKR',
                    Yards: rush.yardsRushed,
                    Attempts: 0,
                    Success: 0,
                },
                {   // Player
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: rush.team.abbreviation,
                    PlayerIndex: rush.rushingPlayer.id,
                    PlayerName: `${rush.rushingPlayer.firstName} ${rush.rushingPlayer.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'BKR',
                    Yards: rush.yardsRushed,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }

        //
        // Interception TD Return
        //
        if (
            play.pass &&
            play.pass.isEndedWithTouchdown &&
            (play.pass.interceptedAtPosition || play.pass.interceptingPlayer)
        ) {
            lines.push(
                {   // D/ST
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: opponent(play.pass.team.abbreviation, home, away),
                    PlayerIndex: opponent(play.pass.team.abbreviation, home, away),
                    PlayerName: opponent(play.pass.team.abbreviation, home, away),
                    ScoreType: 'TD',
                    ScoreMethod: 'IRT',
                    Yards: play.pass.yardsIntercepted,
                    Attempts: 0,
                    Success: 0,
                },
                {   // Player
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: opponent(play.pass.team.abbreviation, home, away),
                    PlayerIndex: play.pass.interceptingPlayer.id,
                    PlayerName: `${play.pass.interceptingPlayer.firstName} ${play.pass.interceptingPlayer.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'IRT',
                    Yards: play.pass.yardsIntercepted,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }

        //
        // Any Interception
        //
        if (
            play.pass &&
            (play.pass.interceptedAtPosition || play.pass.interceptingPlayer)
        ) {
            lines.push(
                {   // D/ST
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: opponent(play.pass.team.abbreviation, home, away),
                    PlayerIndex: opponent(play.pass.team.abbreviation, home, away),
                    PlayerName: opponent(play.pass.team.abbreviation, home, away),
                    ScoreType: 'TO',
                    ScoreMethod: 'INT',
                    Yards: play.pass.yardsIntercepted,
                    Attempts: 1,
                    Success: 1,
                },
                {   // Player
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: opponent(play.pass.team.abbreviation, home, away),
                    PlayerIndex: play.pass.interceptingPlayer.id,
                    PlayerName: `${play.pass.interceptingPlayer.firstName} ${play.pass.interceptingPlayer.lastName}`,
                    ScoreType: 'TO',
                    ScoreMethod: 'INT',
                    Yards: play.pass.yardsIntercepted,
                    Attempts: 1,
                    Success: 1,
                }
            );
        }

        //
        // Fumble Return for TD
        //
        if (
            fumbles.length && subPlayTD
        ) {
            const team = (subPlayTD as IPlayRush).team || (subPlayTD as IPlayFumble).recoveringTeam;
            const player = (subPlayTD as IPlayRush).rushingPlayer || (subPlayTD as IPlayFumble).recoveringPlayer;

            lines.push(
                {   // D/ST
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: team.abbreviation,
                    PlayerIndex: team.abbreviation,
                    PlayerName: team.abbreviation,
                    ScoreType: 'TD',
                    ScoreMethod: 'FRT',
                    Yards: 0,
                    Attempts: 0,
                    Success: 0,
                },
                {   // Player
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: team.abbreviation,
                    PlayerIndex: player.id,
                    PlayerName: `${player.firstName} ${player.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'FRT',
                    Yards: 0,
                    Attempts: 0,
                    Success: 0,
                }
            );

        };


        //
        // Any Fumble Recovery
        //
        if (
            fumbles.length
        ) {
            // it's possible to have multiple fumble recoveries on a single play
            fumbles.forEach(fumble => {
                lines.push(
                    {   // D/ST
                        Week: week,
                        Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                        TeamID: fumble.recoveringTeam.abbreviation,
                        PlayerIndex: fumble.recoveringTeam.abbreviation,
                        PlayerName: fumble.recoveringTeam.abbreviation,
                        ScoreType: 'TO',
                        ScoreMethod: 'FUM',
                        Yards: 0,
                        Attempts: 1,
                        Success: 1,
                    },
                    {   // Player
                        Week: week,
                        Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                        TeamID: fumble.recoveringTeam.abbreviation,
                        PlayerIndex: fumble.recoveringPlayer.id,
                        PlayerName: `${fumble.recoveringPlayer.firstName} ${fumble.recoveringPlayer.lastName}`,
                        ScoreType: 'TO',
                        ScoreMethod: 'FUM',
                        Yards: 0,
                        Attempts: 1,
                        Success: 1,
                    }
                );
            });
        }

        //
        // TD Pass + Catch
        //
        if (
            play.pass &&
            !play.pass.isTwoPointConversion &&
            !play.pass.interceptedAtPosition &&
            !play.pass.interceptingPlayer &&
            play.pass.isEndedWithTouchdown
        ) {
            lines.push(
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.pass.team.abbreviation,
                    PlayerIndex: play.pass.passingPlayer.id,
                    PlayerName: `${play.pass.passingPlayer.firstName} ${play.pass.passingPlayer.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'PASS',
                    Yards: play.pass.totalYardsGained,
                    Attempts: 0,
                    Success: 0,
                },
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.pass.team.abbreviation,
                    PlayerIndex: play.pass.receivingPlayer.id,
                    PlayerName: `${play.pass.receivingPlayer.firstName} ${play.pass.receivingPlayer.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'REC',
                    Yards: play.pass.totalYardsGained,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }

        //
        // XP Pass + Catch
        //
        if (
            play.pass &&
            play.pass.isTwoPointConversion &&
            !play.pass.interceptedAtPosition &&
            !play.pass.interceptingPlayer
        ) {
            lines.push(
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.pass.team.abbreviation,
                    PlayerIndex: play.pass.passingPlayer.id,
                    PlayerName: `${play.pass.passingPlayer.firstName} ${play.pass.passingPlayer.lastName}`,
                    ScoreType: 'XP',
                    ScoreMethod: 'PASS',
                    Yards: play.pass.totalYardsGained,
                    Attempts: 0,
                    Success: 0,
                },
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.pass.team.abbreviation,
                    PlayerIndex: play.pass.receivingPlayer.id,
                    PlayerName: `${play.pass.receivingPlayer.firstName} ${play.pass.receivingPlayer.lastName}`,
                    ScoreType: 'XP',
                    ScoreMethod: 'REC',
                    Yards: play.pass.totalYardsGained,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }

        //
        // TD Rush
        //
        if (
            play.rush &&
            !play.rush.isTwoPointConversion &&
            play.rush.isEndedWithTouchdown
        ) {
            lines.push(
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.rush.team.abbreviation,
                    PlayerIndex: play.rush.rushingPlayer.id,
                    PlayerName: `${play.rush.rushingPlayer.firstName} ${play.rush.rushingPlayer.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'RUN',
                    Yards: play.rush.yardsRushed,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }

        //
        // SubPlay TD Rush (offense recovers fumble for TD)
        //
        if (
            (subPlayTD as IPlayRush)?.rushingPlayer &&
            subPlayTD.team.id === play.playStatus.teamInPossession.id
        ) {
            const rush = (subPlayTD as IPlayRush);
            lines.push(
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.rush.team.abbreviation,
                    PlayerIndex: rush.rushingPlayer.id,
                    PlayerName: `${rush.rushingPlayer.firstName} ${rush.rushingPlayer.lastName}`,
                    ScoreType: 'TD',
                    ScoreMethod: 'RUN',
                    Yards: rush.yardsRushed,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }

        //
        // XP Rush
        //
        if (
            play.rush &&
            play.rush.isTwoPointConversion &&
            play.rush.isEndedWithTouchdown
        ) {
            lines.push(
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.rush.team.abbreviation,
                    PlayerIndex: play.rush.rushingPlayer.id,
                    PlayerName: `${play.rush.rushingPlayer.firstName} ${play.rush.rushingPlayer.lastName}`,
                    ScoreType: 'XP',
                    ScoreMethod: 'RUN',
                    Yards: play.rush.yardsRushed,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }

        //
        // FG
        //
        if (play.fieldGoalAttempt) {
            lines.push(
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.fieldGoalAttempt.team.abbreviation,
                    PlayerIndex: play.fieldGoalAttempt.kickingPlayer.id,
                    PlayerName: `${play.fieldGoalAttempt.kickingPlayer.firstName} ${play.fieldGoalAttempt.kickingPlayer.lastName}`,
                    ScoreType: 'FG',
                    ScoreMethod: 'KICK',
                    Yards: play.fieldGoalAttempt.yardsKicked,
                    Attempts: 0,
                    Success: 0,
                }
            );
        }

        //
        // XP Kick
        //
        if (play.extraPointAttempt) {
            const xpPlay = play.extraPointAttempt;
            lines.push(
                score(
                    week,
                    `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    play.extraPointAttempt.team.abbreviation,
                    play.extraPointAttempt.kickingPlayer.id,
                    `${play.extraPointAttempt.kickingPlayer.firstName} ${play.extraPointAttempt.kickingPlayer.lastName}`,
                    'XP',
                    'KICK',
                    play.extraPointAttempt.yardsKicked
                )


                // {
                //     Week: week,
                //     Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                //     TeamID: play.extraPointAttempt.team.abbreviation,
                //     PlayerIndex: play.extraPointAttempt.kickingPlayer.id,
                //     PlayerName: `${play.extraPointAttempt.kickingPlayer.firstName} ${play.extraPointAttempt.kickingPlayer.lastName}`,
                //     ScoreType: 'XP',
                //     ScoreMethod: 'KICK',
                //     Yards: play.extraPointAttempt.yardsKicked,
                //     //Points: XPKICKRATE,
                //     //FPoints: XPKICKRATE,
                //     Attempts: 0,
                //     Success: 0,
                //     //OwnerID: null
                // }
            );
        }

        if (currentLineCount === lines.length) {
            debugger;
            isTouchdown(play);
            isFumble(play);

            // Missed week2 MIA fumble
            // Missed week2 MIA punt muff (waddle)
            // PHI fumble w/ PHI recovery shown as SF fumble
        }

    });


    return lines;
}

function score(
    week: number, time: string, teamId: string, playerId: string, name: string,
    type: string, method: string, yards: number, attempts: number = 0, success: number = 0) {

    return {
        Week: week,
        Time: time,
        TeamID: teamId,
        PlayerIndex: playerId,
        PlayerName: name,
        ScoreType: type,
        ScoreMethod: method,
        Yards: yards,
        Attempts: attempts,
        Success: success,
    }

}


function playerStatsToDBRows(week: number, nflTeam: string, stats: IPlayerStats): Array<IScoringTable> {

    const lines: Array<IScoringTable> = [];

    if (stats.playerStats[0]?.passing?.passAttempts > 0) {

        const passing = stats.playerStats[0]?.passing;

        lines.push({
            Week: week,
            Time: null,
            TeamID: nflTeam,
            PlayerIndex: stats.player.id,
            PlayerName: `${stats.player.firstName} ${stats.player.lastName}`,
            ScoreType: 'YD',
            ScoreMethod: 'PASS',
            Yards: passing.passYards,
            Attempts: passing.passAttempts,
            Success: passing.passCompletions,
        });
    }


    if (stats.playerStats[0]?.rushing?.rushAttempts > 0) {

        const rushing = stats.playerStats[0]?.rushing;

        // Rushing Yards 
        lines.push({
            Week: week,
            Time: null,
            TeamID: nflTeam,
            PlayerIndex: stats.player.id,
            PlayerName: `${stats.player.firstName} ${stats.player.lastName}`,
            ScoreType: 'YD',
            ScoreMethod: 'RUN',
            Yards: rushing.rushYards,
            Attempts: rushing.rushAttempts,
            Success: rushing.rushAttempts,
        });
    }

    if (stats.playerStats[0]?.receiving?.targets > 0) {

        const receiving = stats.playerStats[0].receiving;

        // Receiving Yards 
        lines.push({
            Week: week,
            Time: null,
            TeamID: nflTeam,
            PlayerIndex: stats.player.id,
            PlayerName: `${stats.player.firstName} ${stats.player.lastName}`,
            ScoreType: 'YD',
            ScoreMethod: 'REC',
            Yards: receiving.recYards,
            Attempts: receiving.targets,
            Success: receiving.receptions,
        });
    }

    return lines;

}



// -- set the week
// DECLARE ${week} smallint;
// SET ${week}=1;


// -- clear the bench for the week
// DELETE FROM Bench WHERE Week=${week};


// -- populate the bench from non-starters
// INSERT INTO 
// 	Bench
// SELECT
// 	${week}, P.OwnerID, P.PlayerIndex
// FROM
// 	Players P
// LEFT JOIN
// 	Starters S
// ON 
// 	P.PlayerIndex = S.PlayerIndex AND 
// 	S.Week = ${week}
// WHERE 
// 	S.PlayerIndex is NULL AND
// 	P.OwnerID is not null;


// -- Update OwnerIds of owned players
// UPDATE
// 	Scoring
// SET
// 	Scoring.OwnerID=P.OwnerID
// FROM
// 	Scoring Sc
// JOIN
// 	(SELECT 
// 		S.*
// 	FROM
// 		Starters S
// 	WHERE
// 		S.Week = ${week}
// 	UNION
// 	SELECT 
// 		B.*
// 	FROM
// 		Bench B
// 	WHERE
// 		B.Week = ${week}) AS P
// ON
// 	P.PlayerIndex = Sc.PlayerIndex AND
// 	Sc.Week = P.Week
// WHERE
// 	Sc.Week = ${week};

// -- Insert players that did nothing (no scoring entries)
