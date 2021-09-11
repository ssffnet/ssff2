import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { SidebarData } from './SidebarData';
import SubMenu from './SubMenu';
import { IconContext } from 'react-icons/lib';

const NavIcon = styled(Link)`
  margin-left: 2rem;
  font-size: 2rem;
  height: 80px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const SidebarNav = styled.nav`
  background: #404040;
  width: 200px;
  height: 100vh;
  display: flex;
  justify-content: center;
  position: flex;
  //top: 0;
  //left: ${({ sidebar }) => (sidebar ? '0' : '-100%')};
  margin-left: ${({ sidebar }) => (sidebar ? '0' : '-200px')};
  transition: 350ms;
 // z-index: 10;
`;

const SidebarWrap = styled.div`
  width: 100%;
`;

const Sidebar = (props) => {

    var sidebar = props.sidebar;

    return (
        <>
            <IconContext.Provider value={{ color: '#fff' }}>
                <SidebarNav sidebar={sidebar}>
                    <SidebarWrap>
                        {SidebarData.map((item, index) => {
                            return <SubMenu item={item} key={index} />;
                        })}
                    </SidebarWrap>
                </SidebarNav>
            </IconContext.Provider>
        </>
    );
};

export default Sidebar;