import React from 'react';
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as IoIcons from 'react-icons/io';
import * as RiIcons from 'react-icons/ri';
import * as GiIcons from 'react-icons/gi';
import * as HiIcons from 'react-icons/hi';
import * as GoIcons from 'react-icons/go';
import * as CgIcons from 'react-icons/cg';
import * as BsIcons from 'react-icons/bs';
import * as ImIcons from 'react-icons/im';

import axios from 'axios';

export const SidebarData = [];


//const ssffTeams = await axios.get(`/api/roster/teams`);

const ssffTeams = [
    { ownerid: 1, teamName: 'Team 1', teamShortName: 't1' },
    { ownerid: 2, teamName: 'Team 2', teamShortName: 't3' },
    { ownerid: 3, teamName: 'Team 3', teamShortName: 't3' },
]

const weeks = [
    { week: 1, name: 'Week 1' },
    { week: 2, name: 'Week 2' },
    { week: 3, name: 'Week 3' },
]

const home = {
    title: 'Home',
    path: '/',
    icon: <AiIcons.AiOutlineHome />
};

const roster = {
    title: 'Rosters',
    path: '#',
    icon: <IoIcons.IoIosPeople />,
    iconClosed: <RiIcons.RiArrowDownSFill />,
    iconOpened: <RiIcons.RiArrowUpSFill />,
    subNav: ssffTeams.map(t => {
        return {
            team: t.ownerid,
            title: t.teamName,
            path: `/rosters/${t.ownerid.toString()}`,
            icon: <BsIcons.BsDot />,
            state: { id : t.ownerid}
        }
    }
    )
}

const players = {
    title: 'Players',
    path: '#',
    icon: <GiIcons.GiAmericanFootballHelmet />,
    iconClosed: <RiIcons.RiArrowDownSFill />,
    iconOpened: <RiIcons.RiArrowUpSFill />,
    subNav: [
        {
            title: 'Owned',
            path: '/players/owned',
            icon: <BsIcons.BsDot />
        },
        {
            title: 'Available',
            path: '/players/available',
            icon: <BsIcons.BsDot />
        }
    ]
}

const lineups = {
    title: 'Lineups',
    path: '/lineups',
    icon: <HiIcons.HiOutlineClipboardList />,
    iconClosed: <RiIcons.RiArrowDownSFill />,
    iconOpened: <RiIcons.RiArrowUpSFill />,
    subNav: [
        {
            title: 'Game Sheet',
            path: '/lineups/gamesheet',
            icon: <BsIcons.BsDot />
        },
        {
            title: 'Submit Lineup',
            path: '/lineups/submit',
            icon: <BsIcons.BsDot />
        }
    ]
}

const stats = {
    title: 'Stats',
    path: '/stats',
    icon: <GoIcons.GoGraph />,
    iconClosed: <RiIcons.RiArrowDownSFill />,
    iconOpened: <RiIcons.RiArrowUpSFill />,
    subNav: [
        {
            title: 'Points',
            path: '/stats/points',
            icon: <BsIcons.BsDot />
        },
        {
            title: 'Yards',
            path: '/stats/yards',
            icon: <BsIcons.BsDot />
        },
        {
            title: 'Records',
            path: '/stats/records',
            icon: <BsIcons.BsDot />
        },
        {
            title: 'Miscellaneous',
            path: '/stats/misc',
            icon: <BsIcons.BsDot />
        }
    ]
}

const scores = {
    title: 'Scores',
    path: '/scores',
    icon: <FaIcons.FaFootballBall />,
    iconClosed: <RiIcons.RiArrowDownSFill />,
    iconOpened: <RiIcons.RiArrowUpSFill />,
    subNav: weeks.map(w => {
        return {
            title: w.name,
            path: `/roster/${w.week.toString()}`,
            icon: <BsIcons.BsDot />
        }
    }
    )
}

const standings = {
    title: 'Standings',
    path: '/standings',
    icon: <CgIcons.CgViewGrid />
};


const schedules = {
    title: 'Schedules',
    path: '/schedules',
    icon: <BsIcons.BsCalendar />,
    iconClosed: <RiIcons.RiArrowDownSFill />,
    iconOpened: <RiIcons.RiArrowUpSFill />,
    subNav: ssffTeams.map(t => {
        return {
            title: t.teamName,
            path: `/roster/${t.ownerid.toString()}`,
            icon: <BsIcons.BsDot />
        }
    }
    )
}

const messages = {
    title: 'Messages',
    path: '/messages',
    icon: <BsIcons.BsChatDots />
};

const admin = {
    title: 'Admin',
    path: '/admin',
    icon: <GoIcons.GoGraph />,
    iconClosed: <RiIcons.RiArrowDownSFill />,
    iconOpened: <RiIcons.RiArrowUpSFill />,
    subNav: [
        {
            title: 'Teams',
            path: '/stats/points',
            icon: <BsIcons.BsDot />
        }
    ]
}

const logout = {
    title: 'Log Out',
    path: '/logout',
    icon: <ImIcons.ImExit />
};




SidebarData.push(home, roster, players, lineups, stats, scores, standings, schedules, messages, admin, logout);
