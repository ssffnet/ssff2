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
    Points: number,
    FPoints: number,  // decimal
    Attempts: string,
    OwnerID: number
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
    }
}


export interface IPlayByPlayFeed {
    game: {
        awayTeam: ITeam,
        homeTeam: ITeam,
        playedStatus: string,
    },
    plays: Array<IPlay>

}


export interface IPlay {

    description: string,
    kick: {
        isEndedWithTouchdown: boolean,
        team: ITeam
    },
    punt: {
        isEndedWithTouchdown: boolean,
        team: ITeam
    },
    rush: {
        isEndedWithTouchdown: boolean,
        team: ITeam,
        rushingPlayer: IPBPPlayer,
        yardsRushed: number,
        isTwoPointConversion: boolean
    },
    pass: {
        isEndedWithTouchdown: boolean,
        team: ITeam,
        passingPlayer: IPBPPlayer,
        receivingPlayer: IPBPPlayer,
        totalYardsGained: number,
        isTwoPointConversion: boolean,
        isCompleted: true
    },
    penalty: {},
    fieldGoalAttempt: {
        isGood: boolean,
        isFirstDownPenalty: boolean,
        team: ITeam,
        kickingPlayer: IPBPPlayer,
        yardsKicked: number
    },
    extraPointAttempt: {
        isGood: boolean,
        isFirstDownPenalty: boolean,
        team: ITeam,
        kickingPlayer: IPBPPlayer,
        yardsKicked: number
    }
    playStatus: {
        quarter: number,
        secondsElapsed: number
    }

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

export interface IPBPPlayer {
    id: string,
    firstName: string,
    lastName: string,
    position: string,
    jerseyNumber: number
}