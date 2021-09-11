import feed, {
    IBoxScoreFeed, IPlay, IPlayByPlayFeed, IPlayerStats, IScoringTable
} from './mySportsFeed';

const season = "2021-pre";

const PASSYDRATE = 1.0 / 50.0;
const PASSTDRATE = 4.0;
const PASS2XPRATE = 2.0;
const RUSHYDRATE = 1.0 / 20.0;
const RUSHTDRATE = 6.0;
const RUSH2XPRATE = 2.0;
const RECYDRATE = 1.0 / 20.0;
const RECTDRATE = 6.0;
const REC2XPRATE = 2.0;
const FGRATE = 3.0;
const XPKICKRATE = 1.0;

export async function getScoring(week: number): Promise<void> {

    // download scores for the week from feed


    // get all the 
    const games = feed(`https://api.mysportsfeeds.com/v2.1/pull/nfl/${season}/week/${week}/games.json`);

    return Promise.resolve();

}





export async function getBoxScore(season: string, week: number, gameId: number): Promise<Array<IScoringTable>> {

    let dbRows = [];

    const boxScoreFeed: IBoxScoreFeed = (await feed(`${season}/games/${gameId}/boxscore.json`)) as IBoxScoreFeed;

    const playByPlayFeed: IPlayByPlayFeed = (await feed(`${season}/games/${gameId}/playbyplay.json`)) as IPlayByPlayFeed;

    // Filter box scores to just offensive players
    const boxScore = {
        // ATL : [player, player, ...],
        // NYG : [player, player, ...],
    };

    const home = boxScoreFeed.game.homeTeam.abbreviation,
        away = boxScoreFeed.game.awayTeam.abbreviation

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

    // filter the plays down to just scoring plays
    const scoringPlays = playByPlayFeed.plays.filter(play =>
        Object.keys(play).some(key => play[key]?.isEndedWithTouchdown || play[key]?.isTwoPointConversion) ||
        play?.extraPointAttempt?.isFirstDownPenalty ||
        play?.fieldGoalAttempt?.isFirstDownPenalty ||
        play?.extraPointAttempt?.isGood ||
        play?.fieldGoalAttempt?.isGood 
    );

    dbRows = dbRows.concat(playByPlayToDBRows(week, scoringPlays));

    return dbRows;
}


function playByPlayToDBRows(week: number, plays: Array<IPlay>): Array<IScoringTable> {

    const lines: Array<IScoringTable> = [];

    plays.forEach(play => {

        if (play.pass && !play.pass.isTwoPointConversion) {
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
                    Points: PASSTDRATE,
                    FPoints: PASSYDRATE,
                    Attempts: null,
                    OwnerID: null
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
                    Points: RECTDRATE,
                    FPoints: RECTDRATE,
                    Attempts: null,
                    OwnerID: null
                }
            );
        }

        if (play.pass && play.pass.isTwoPointConversion) {
            lines.push(
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.pass.team.abbreviation,
                    PlayerIndex: play.pass.passingPlayer.id,
                    PlayerName: `${play.pass.passingPlayer.firstName} ${play.pass.passingPlayer.lastName}`,
                    ScoreType: '2XP',
                    ScoreMethod: 'PASS',
                    Yards: play.pass.totalYardsGained,
                    Points: PASS2XPRATE,
                    FPoints: PASS2XPRATE,
                    Attempts: null,
                    OwnerID: null
                },
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.pass.team.abbreviation,
                    PlayerIndex: play.pass.receivingPlayer.id,
                    PlayerName: `${play.pass.receivingPlayer.firstName} ${play.pass.receivingPlayer.lastName}`,
                    ScoreType: '2XP',
                    ScoreMethod: 'REC',
                    Yards: play.pass.totalYardsGained,
                    Points: REC2XPRATE,
                    FPoints: REC2XPRATE,
                    Attempts: null,
                    OwnerID: null
                }
            );
        }

        if (play.rush && !play.rush.isTwoPointConversion) {
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
                    Points: RUSHTDRATE,
                    FPoints: RUSHTDRATE,
                    Attempts: null,
                    OwnerID: null
                }
            );
        }

        if (play.rush && play.rush.isTwoPointConversion) {
            lines.push(
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.rush.team.abbreviation,
                    PlayerIndex: play.rush.rushingPlayer.id,
                    PlayerName: `${play.rush.rushingPlayer.firstName} ${play.rush.rushingPlayer.lastName}`,
                    ScoreType: '2XP',
                    ScoreMethod: 'RUN',
                    Yards: play.rush.yardsRushed,
                    Points: RUSH2XPRATE,
                    FPoints: RUSH2XPRATE,
                    Attempts: null,
                    OwnerID: null
                }
            );
        }

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
                    Points: FGRATE,
                    FPoints: FGRATE,
                    Attempts: null,
                    OwnerID: null
                }
            );
        }

        if (play.extraPointAttempt) {
            lines.push(
                {
                    Week: week,
                    Time: `${play.playStatus.quarter}-${play.playStatus.secondsElapsed}`,
                    TeamID: play.extraPointAttempt.team.abbreviation,
                    PlayerIndex: play.extraPointAttempt.kickingPlayer.id,
                    PlayerName: `${play.extraPointAttempt.kickingPlayer.firstName} ${play.extraPointAttempt.kickingPlayer.lastName}`,
                    ScoreType: 'XP',
                    ScoreMethod: 'KICK',
                    Yards: play.extraPointAttempt.yardsKicked,
                    Points: XPKICKRATE,
                    FPoints: XPKICKRATE,
                    Attempts: null,
                    OwnerID: null
                }
            );
        }

    });


    return lines;
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
            Points: Math.floor(passing.passYards * PASSYDRATE),
            FPoints: passing.passYards * PASSYDRATE,
            Attempts: `${passing.passCompletions}/${passing.passAttempts}`,
            OwnerID: null
        });
    }


    // if (stats.playerStats[0]?.twoPointAttempts?.twoPtPassMade > 0) {

    //     const twoPtPassing = stats.playerStats[0].twoPointAttempts;

    //     lines.push({
    //         Week: week,
    //         Time: null,
    //         TeamID: nflTeam,
    //         PlayerIndex: stats.player.id,
    //         PlayerName: `${stats.player.firstName} ${stats.player.lastName}`,
    //         ScoreType: '2XP',
    //         ScoreMethod: 'PASS',
    //         Yards: 0,
    //         Points: twoPtPassing.twoPtPassMade * 2,
    //         FPoints: twoPtPassing.twoPtPassMade * 2.0,
    //         Attempts: null,
    //         OwnerID: null
    //     });
    // }


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
            Points: Math.floor(rushing.rushYards * RUSHYDRATE),
            FPoints: rushing.rushYards * RUSHYDRATE,
            Attempts: `${rushing.rushAttempts}`,
            OwnerID: null
        });
    }


    // if (stats.playerStats[0]?.twoPointAttempts?.twoPtRushMade > 0) {

    //     const twoPtRushing = stats.playerStats[0].twoPointAttempts;

    //     lines.push({
    //         Week: week,
    //         Time: null,
    //         TeamID: nflTeam,
    //         PlayerIndex: stats.player.id,
    //         PlayerName: `${stats.player.firstName} ${stats.player.lastName}`,
    //         ScoreType: '2XP',
    //         ScoreMethod: 'RUN',
    //         Yards: 0,
    //         Points: twoPtRushing.twoPtRushMade * 2,
    //         FPoints: twoPtRushing.twoPtRushMade * 2.0,
    //         Attempts: null,
    //         OwnerID: null
    //     });
    // }


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
            Points: Math.floor(receiving.recYards * RECYDRATE),
            FPoints: receiving.recYards * RECYDRATE,
            Attempts: `${receiving.receptions}/${receiving.targets}`,
            OwnerID: null
        });
    }


    // if (stats.playerStats[0]?.twoPointAttempts?.twoPtPassRec > 0) {

    //     const twoPtReceiving = stats.playerStats[0].twoPointAttempts;

    //     lines.push({
    //         Week: week,
    //         Time: null,
    //         TeamID: nflTeam,
    //         PlayerIndex: stats.player.id,
    //         PlayerName: `${stats.player.firstName} ${stats.player.lastName}`,
    //         ScoreType: '2XP',
    //         ScoreMethod: 'REC',
    //         Yards: 0,
    //         Points: twoPtReceiving.twoPtPassRec * 2,
    //         FPoints: twoPtReceiving.twoPtPassRec * 2.0,
    //         Attempts: null,
    //         OwnerID: null
    //     });
    // }

    return lines;

}

