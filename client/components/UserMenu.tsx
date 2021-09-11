import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const StyledMenu = styled.div`
    background: #808080;
    width: 200px;
    height: 10vh;
    //display: flex;
    //justify-content: center;
    //position: flex;
    top: 100;
    left: 900;
    transition: 350ms;
    z-index: 10;
    font-size: 1rem;
    color: white;
`;

const MenuLink = styled(Link)`

`;



const UserMenu = () => {

    return (
        <StyledMenu>
            <MenuLink to="/rosters/:type">Item 1</MenuLink>
            <MenuLink to="/rosters/:type">Item 2</MenuLink>
            <hr></hr>
            <span>Logout</span>
        </StyledMenu>
    )

}

export default UserMenu;