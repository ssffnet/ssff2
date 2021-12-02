import axios from 'axios';

export default async function feed(request): Promise<unknown> {

    const auth = `Basic ${Buffer.from('bb71456d-1a2a-4ecd-bdc8-e29779:MYSPORTSFEEDS').toString('base64')}`;
    const url = `https://api.mysportsfeeds.com/v2.1/pull/nfl/${request}`;

    console.log(`Request: ${url}`);

    const result = await axios.get(url, {
        headers: {
            'Authorization': auth,
            'Accept-Encoding': 'gzip'
        }
    });

    return result.data;
}

export interface IPlayersFeed {
    lastUpdatedOn: Date,
    players: Array<IRosterPlayer>
}

export interface IRosterPlayer {
    player: {
        id: number,
        firstName: string,
        lastName: string,
        primaryPosition: string,
        alternatePositions: Array<string>,
        jerseyNumber: number,
        currentTeam: ITeam,
        currentRosterStatus: string,
        currentInjury: null,
        height: string,
        weight: number,
        birthDate: string,
        age: number,
        birthCity: string,
        birthCountry: string,
        rookie: boolean,
        highSchool: string,
        college: string,
        handedness: string
        officialImageSrc: string,
        socialMediaAccounts: Array<string>,
        currentContractYear: string,
        drafted: {
            year: number,
            team: ITeam,
            pickTeam: ITeam,
            round: number,
            roundPick: number,
            overallPick: number,
        },
        externalMappings: Array<{ source: string, id: string }>,
    },
    teamAsOfDate: {
        id: number,
        abbreviation: string,
    }
}

export interface IScoringTable {
    Week: number,
    Time: string,
    TeamID: string,
    PlayerIndex: string,
    PlayerName: string,
    ScoreType: string,
    ScoreMethod: string,
    Yards: number,
    Points?: number,
    FPoints?: number,  // decimal
    Attempts: number,
    Success: number,
    OwnerID?: number
}

export interface IPlayerStats {
    player: {
        id: string,
        firstName: string,
        lastName: string,
        position: string,
        jerseyNumber: number
    },
    playerStats: Array<IStats>
}

export interface IBoxScoreFeed {
    game: {
        awayTeam: ITeam,
        homeTeam: ITeam,
        playedStatus: string,
    },
    stats: {
        away: {
            players: Array<IPlayerStats>
        },
        home: {
            players: Array<IPlayerStats>
        }
    },
    lastUpdatedOn: Date,
    scoring
}

export interface IPlayByPlayFeed {
    game: {
        awayTeam: ITeam,
        homeTeam: ITeam,
        playedStatus: string,
        id: string
    },
    plays: Array<IPlay>

}

export interface IStats {
    passing: {
        passAttempts: number,
        passCompletions: number,
        passPct: number,
        passYards: number,
        passAvg: number,
        passYardsPerAtt: number,
        passTD: number,
        passTDPct: number,
        passInt: number,
        passIntPct: number,
        passLng: number,
        pass20Plus: number,
        pass40Plus: number,
        passSacks: number,
        passSackY: number,
        qbRating: number
    },
    rushing: {
        rushAttempts: number,
        rushYards: number,
        rushAverage: number,
        rushTD: number,
        rushLng: number,
        rush1stDowns: number,
        rush1stDownsPct: number,
        rush20Plus: number,
        rush40Plus: number,
        rushFumbles: number
    },
    receiving: {
        targets: number,
        receptions: number,
        recYards: number,
        recAverage: number,
        recTD: number,
        recLng: number,
        rec1stDowns: number,
        rec20Plus: number,
        rec40Plus: number,
        recFumbles: number
    },
    tackles: {
        tackleSolo: number,
        tackleTotal: number,
        tackleAst: number,
        sacks: number,
        sackYds: number,
        tacklesForLoss: number
    },
    interceptions: {
        interceptions: number,
        intTD: number,
        intYds: number,
        intAverage: number,
        intLng: number,
        passesDefended: number,
        stuffs: number,
        stuffYds: number,
        safeties: number,
        kB: number
    },
    fumbles: {
        fumbles: number,
        fumLost: number,
        fumForced: number,
        fumOwnRec: number,
        fumOppRec: number,
        fumRecYds: number,
        fumTotalRec: number,
        fumTD: number
    },
    kickoffReturns: {
        krRet: number,
        krYds: number,
        krAvg: number,
        krLng: number,
        krTD: number,
        kr20Plus: number,
        kr40Plus: number,
        krFC: number,
        krFum: number
    },
    puntReturns: {
        prRet: number,
        prYds: number,
        prAvg: number,
        prLng: number,
        prTD: number,
        pr20Plus: number,
        pr40Plus: number,
        prFC: number,
        prFum: number
    },
    twoPointAttempts: {
        twoPtAtt: number,
        twoPtMade: number,
        twoPtPassAtt: number,
        twoPtPassMade: number,
        twoPtPassRec: number,
        twoPtRushAtt: number,
        twoPtRushMade: number
    },
    miscellaneous: {
        gamesStarted: number
    },
    snapCounts: {
        offenseSnaps: number,
        defenseSnaps: number,
        specialTeamSnaps: number
    }
}

export interface IWeather {
    type: string,
    description: string,
    wind: {
        speed: {
            milesPerHour: number,
            kilometersPerHour: number
        },
        direction: {
            degrees: number,
            label: string
        }
    },
    temperature: {
        fahrenheit: number,
        celsius: number
    },
    precipitation: {
        type: string,
        percent: number,
        amount: {
            millimeters: number,
            centimeters: number,
            inches: number,
            feet: number
        }
    },
    humidityPercent: number
}

export interface IGame {
    schedule: {
        id: number,
        week: number,
        startTime: Date,
        endedTime: Date,
        awayTeam: ITeam,
        homeTeam: ITeam,
        venue: {
            id: number,
            name: string
        },
        venueAllegiance: string,
        scheduleStatus: string,
        originalStartTime: Date,
        delayedOrPostponedReason: string,
        playedStatus: string,
        attendance: number,
        officials: Array<IOfficial>,
        broadcasters: Array<string>,
        weather: IWeather,
        score: {
            currentQuarter: number,
            currentQuarterSecondsRemaining: number,
            currentIntermission: string,
            teamInPossession: string,
            currentDown: number,
            currentYardsRemaining: number,
            lineOfScrimmage: number,
            awayScoreTotal: number,
            homeScoreTotal: number,
            quarters: Array<{ quarterNumber: number, awayScore: number, homeScore: number }>
        }
    }
}

export interface IOfficial {
    id: number,
    title: string,
    firstName: string,
    lastName: string
}

export interface ITeam {
    id: number,
    abbreviation: string
}

export interface ISchedule {
    lastUpdatedOn: Date,
    games: Array<IGame>
    teamByeWeeks: Array<IByeWeek>
}

export interface IByeWeek {
    team: ITeam,
    byeWeeks: Array<number>
}

export interface IPlayPlayer {
    id: string,
    firstName: string,
    lastName: string,
    position: string,
    jerseyNumber: number
}

export interface IPlayPosition {
    team: ITeam,
    yardLine: number,
    point: number | null
}

export interface IPlayFumble extends IPlayBase {
    fumblingTeam: ITeam,
    fumblingPlayer: IPlayPlayer,
    fumbledAtPosition: IPlayPosition,
    forcedByPlayer: IPlayPlayer,
    recoveringTeam: ITeam,
    recoveringPlayer: IPlayPlayer,
    recoveredAtPosition: IPlayPosition,
    stoppedAtPosition: IPlayPosition,
    isMuff: boolean,
    isOutOfBounds: boolean,
    isTackled: boolean,
    isEndedWithTouchdown: boolean,
    isSafety: boolean,
    yardsFromLineOfScrimmage: number,
    yardsFumbled: number,
    yardsRecovered: number
};

export interface IPlayPass extends IPlayBase {
    passingPlayer: IPlayPlayer,
    passedFromPosition?: IPlayPosition,
    receivingPlayer: IPlayPlayer,
    receivedAtPosition?: IPlayPosition,
    interceptingPlayer?: IPlayPlayer,
    interceptedAtPosition?: IPlayPosition,
    passType: null,
    passDirection: null,
    passDistance: null,
    stoppedAtPosition: IPlayPosition,
    isCompleted: boolean,
    isOutOfBounds: boolean,
    isTackled: boolean,
    isEndedWithTouchdown: boolean,
    isTwoPointConversion: boolean,
    yardsPassed: number,
    yardsRushed: number,
    yardsIntercepted: number,
    totalYardsGained: number,
}

export interface IPlayPenalty {
    team: ITeam,
    penalizedPlayer: IPlayPlayer,
    enforcedAtPosition: IPlayPosition,
    description: string,
    isCancelsPlay: boolean,
    yardsPenalized: number
};

export interface IPlayRush extends IPlayBase {
    rushingPlayer: IPlayPlayer,
    rushedFromPosition: IPlayPosition,
    stoppedAtPosition: IPlayPosition,
    isTackled: boolean,
    isEndedWithTouchdown: boolean,
    isTwoPointConversion: boolean,
    isOutOfBounds: boolean,
    rushType: null,
    rushDirection: null,
    yardsRushed: number,
}

export interface IPlayBase {
    team: ITeam,
    soloTacklingPlayer: IPlayPlayer,
    assistedTacklingPlayer1?: IPlayPlayer,
    assistedTacklingPlayer2?: IPlayPlayer,
    isFirstDownPenalty: boolean,
    isNoPlay: boolean,
    subPlays: IPlaySubPlays,
    penalties: Array<IPlayPenalty>
}

export interface IPlaySack extends IPlayBase {
    passingPlayer: IPlayPlayer,
    sackedAtPosition: IPlayPosition,
    isFirstDownPenalty: boolean,
    isNoPlay: boolean,
    yardsLost: number,
}

export interface IPlayPunt extends IPlayBase {
    kickingTeam: ITeam,
    kickingPlayer: IPlayPlayer,
    kickedFromPosition: IPlayPosition,
    blockingPlayer: null,
    retrievingTeam: ITeam,
    retrievingPlayer: IPlayPlayer,
    retrievedAtPosition: IPlayPosition,
    stoppedAtPosition: IPlayPosition,
    isBlocked: boolean,
    isTouchback: boolean,
    isSafety: boolean,
    isOutOfBounds: boolean,
    isTouchdown: boolean,
    isFairCatch: boolean,
    isLanded: boolean,
    isOnside: boolean,
    yardsKicked: number,
    yardsReturned: number,
}

export interface IPlayKick extends IPlayPunt {
    // same as Punt
}

export interface IPlayFG {
    team: ITeam,
    kickingPlayer: IPlayPlayer,
    centerPlayer: IPlayPlayer,
    holdingPlayer: IPlayPlayer,
    kickedFromPosition: IPlayPosition,
    blockingPlayer: IPlayPlayer,
    blockedAtPosition: IPlayPosition,
    isBlocked: boolean,
    isGood: boolean,
    yardsKicked: number,
    isFirstDownPenalty: boolean,
    isNoPlay: boolean,
    subPlays: IPlaySubPlays,
    penalties: Array<IPlayPenalty>
}

export interface IPlayExtraPoint extends IPlayFG {
    // same as IPlayFG
}

export interface IPlay {
    description: string,
    kick: IPlayKick,
    sack: IPlaySack,
    punt: IPlayPunt,
    rush: IPlayRush,
    pass: IPlayPass,
    penalty: IPlayPenalty,
    fieldGoalAttempt: IPlayFG,
    extraPointAttempt: IPlayExtraPoint
    playStatus: IPlayStatus,
    fumble: IPlayFumble,
}

export interface IPlayStatus {
    quarter: number,
    secondsElapsed: number,
    teamInPossession: ITeam,
    overallDriveNum: number,
    teamDriveNum: number,
    currentDown: number,
    yardsRemaining: number,
    lineOfScrimmage: IPlayPosition,
    awayPlayersOnField: Array<IPlayPlayer>,
    homePlayersOnField: Array<IPlayPlayer>,
}

export interface IPlayLateralPass extends IPlayBase {
    passingPlayer: IPlayPlayer,
    passedFromPosition: IPlayPosition,
    receivingPlayer: IPlayPlayer,
    receivedAtPosition: IPlayPosition,
    stoppedAtPosition: IPlayPosition,
    isOutOfBounds: boolean,
    isTackled: boolean,
    isEndedWithTouchdown: boolean,
    isTwoPointConversion: boolean,
    yardsGained: number,
}

export interface IPlaySubPlays extends
    Array<{
        rush?: IPlayRush | Array<IPlayRush>,
        fumble?: IPlayFumble | Array<IPlayFumble>,
        lateralPass?: Array<IPlayLateralPass>
    }> { }
