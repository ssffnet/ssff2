import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const SidebarLink = styled(Link)`
  display: flex;
  color: #c0c0c0;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  list-style: none;
  height: 30px;
  text-decoration: none;
  font-size: 14px;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  border-bottom: 1px solid #303030;

  &:hover {
    background: #303030;
    border-left: 2px solid #202020;
    border-top: 2px solid #202020;
    cursor: pointer;
    color: #48a0dd;
  }
`;

const SidebarLabel = styled.span`
  margin-left: 16px;
`;

const DropdownLink = styled(Link)`
  background: #505050;
  height: 40px;
  padding-left: 1rem;
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #C0C0C0;
  font-size: 14px;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  border-bottom: 1px solid #404040;

  &:hover {
    background: #303030;
    border-left: 4px solid #808080;
    cursor: pointer;
  }
`;

const SubMenu = (props) => {
  const [subnav, setSubnav] = useState(false);

  const showSubnav = () => setSubnav(!subnav);

  const item = props.item;

  return (
    <>
      <SidebarLink to={item.path} onClick={item.subNav && showSubnav}>
        <div>
          {item.icon}
          <SidebarLabel>{item.title}</SidebarLabel>
        </div>
        <div>
          {item.subNav && subnav
            ? item.iconOpened
            : item.subNav
            ? item.iconClosed
            : null}
        </div>
      </SidebarLink>
      {subnav &&
        item.subNav.map((item, index) => {
          return (
            <DropdownLink to={{ pathname: item.path, state: {id : '9'} }} key={index}>
              {/* {item.icon} */}
              <SidebarLabel>{item.title}</SidebarLabel>
            </DropdownLink>
          );
        })}
    </>
  );
};

export default SubMenu;