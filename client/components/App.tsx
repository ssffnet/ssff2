import React, { useState, useEffect } from 'react';
import Main from "./Main";
import Rosters from './Rosters'
import Standings from './Standings'
import Sidebar from './SideBar'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import * as FaIcons from 'react-icons/fa';
import * as IoIcons from 'react-icons/io';

import { DropdownButton, Dropdown } from 'react-bootstrap'
import UserMenu from './UserMenu';
import Login from './Login';
import axios from 'axios';

const routes = [
    {
        path: "/",
        exact: true,
        page: () => <Main />
    },
    {
        path: "/rosters/:type",
        exact: true,
        page: () => <Rosters />
    },
    {
        path: "/standings",
        page: () => <Standings />
    }
];

function setToken(userToken) {
    localStorage.setItem('token', JSON.stringify(userToken));
}

function getToken() {
    const tokenString = localStorage.getItem('token');
    const userToken = JSON.parse(tokenString);
    return userToken?.token
}


const App = () => {

    const [sidebar, setSidebar] = useState(true);

    //const [token, setToken] = useState();

    const showSidebar = () => setSidebar(!sidebar);



    // useEffect(() => {
    //     axios.post(`/auth`)
    //         .then(response => {
    //             setRoster(response.data);
    //             console.log(roster);
    //         });
    // }, []);

    // const token = getToken();


    // if (!token) {
    //     return <Login setToken={setToken} />
    // }

    return (

        <Router>

            <div style={{ display: "flex", height: "40px" }}>
                <div style={{ display: "flex", height: "40px" }} className="topBar"><FaIcons.FaBars onClick={showSidebar} /></div>
                <div style={{ display: "flex", height: "40px", flexGrow: 1, justifyContent: 'end' }} className="topBar">
                    <IoIcons.IoMdPerson />
                </div>
            </div>

            <div style={{ display: "flex", height: "100vh" }}>

                <Sidebar sidebar={sidebar} />

                <Switch>
                    {routes.map((route, index) => (
                        <Route
                            key={index}
                            path={route.path}
                            exact={route.exact}
                            component={route.page}
                        />
                    ))}
                </Switch>

            </div>

        </Router>

    );


}

export default App;