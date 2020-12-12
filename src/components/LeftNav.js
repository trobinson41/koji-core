import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Link } from 'gatsby';

import { BLACK, BLUE, DARK_GRAY, LIGHT_GRAY } from '../constants/colors';

const Container = styled.nav`
  width: 246px;
  height: 100%;
  max-height: 100vh;
  overflow: auto;
  padding: 0 0 32px 10px;
  position: sticky;
  top: 0;
  margin-left: -10px;
  display: block;

  @media screen and (max-width: 768px) {
    display: none;
  }

  &:hover {
    ::-webkit-scrollbar-thumb {
      background-color: #babac0;
    }
  }

  /* total width */
  ::-webkit-scrollbar {
      background-color: #fff;
      width: 16px;
  }

  /* background of the scrollbar except button or resizer */
  ::-webkit-scrollbar-track {
      background-color: #fff;
  }

  /* scrollbar itself */
  ::-webkit-scrollbar-thumb {
      background-color: transparent;
      border-radius: 16px;
      border: 4px solid #fff;
  }

  /* set button(top and bottom of the scrollbar) */
  ::-webkit-scrollbar-button {
      display:none;
  }
`;

const Section = styled.div`

`;

const SectionHeader = styled.h3`
  margin: 25px auto 8px;
  font-size: 13px;
  text-transform: uppercase;
  font-weight: 500;
  color: #333333;
`;

const SectionItems = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const SectionItem = styled.li`
  font-size: 13px;
  padding: 5px 10px;
  margin: 0 0 0 -10px;
  background: ${({ style: { isActive } }) => isActive ? BLUE : 'transparent'};
  cursor: pointer;
  border-radius: 2.5px;
  color: ${({ style: { isActive } }) => isActive ? '#ffffff' : '#333333'};

  &:hover {
    background: ${LIGHT_GRAY};
    color: ${BLUE};
  }
`;

const StyledLink = styled(Link)`
  color: ${({ style: { isActive } }) => isActive ? '#ffffff' : BLACK};
  text-decoration: none;

  &:hover {
    color: ${BLUE};
  }
`;

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: rgba(0, 0, 0, 0.5);
  margin: 12px 0;
`;

const ExternalLink = styled.a`
  display: block;
  font-size: 13px;
  padding: 5px 10px;
  margin: 0 0 0 -10px;
  background: transparent
  cursor: pointer;
  border-radius: 2.5px;
  color: #333333;
  text-decoration: none;


  &:hover {
    text-decoration: none;
    background: ${LIGHT_GRAY};
    color: ${BLUE};
  }
`;

const LeftNav = ({ location, navItems }) => {
  const currentNavItem = navItems.find(({ root }) => location.pathname.includes(root)) || {};

  const { sections = [] } = currentNavItem;

  return (
    <Container>
      {
        sections.sort((a, b) => a.idx - b.idx).map(({ items, name }) => (
          <Section key={name}>
            <SectionHeader>{name}</SectionHeader>
            <SectionItems>
              {
                items.sort((a, b) => a.idx - b.idx).map(({ name: itemName, path }) => (
                  <StyledLink
                    key={itemName}
                    style={{ isActive: location.pathname === path }}
                    to={path}
                  >
                    <SectionItem style={{ isActive: location.pathname === path }}>
                      {itemName}
                    </SectionItem>
                  </StyledLink>
                ))
              }
            </SectionItems>
          </Section>
        ))
      }
      <Divider />
      <ExternalLink
        href={'https://withkoji.com/resources/privacy'}
        target={'blank'}
      >
        {'Privacy'}
      </ExternalLink>
      <ExternalLink
        href={'https://withkoji.com/resources/terms'}
        target={'blank'}
      >
        {'Terms of Use'}
      </ExternalLink>
      <ExternalLink
        href={'https://withkoji.com/resources/copyright'}
        target={'blank'}
      >
        {'Copyright'}
      </ExternalLink>
    </Container>
  );
};

LeftNav.propTypes = {
  location: PropTypes.object,
  navItems: PropTypes.arrayOf(PropTypes.shape({

  })),
};

LeftNav.defaultProps = {
  location: {},
  navItems: [],
};

export default LeftNav;