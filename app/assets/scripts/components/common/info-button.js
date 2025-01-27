import React from 'react';
import T from 'prop-types';
import ReactTooltip from 'react-tooltip';
import Button from '../../styles/button/button';
import styled from 'styled-components';
const StyledTooltip = styled(ReactTooltip)`
  width: ${({ width }) => width || 'auto'};
  /* Z index set to 1000 to go over shadow scroll bar
   * which has z-index 1000 */
  z-index: 1001;
  &.tooltip {
    z-index:9999
  } 
`;

function InfoButton (props) {
  const { info, id, useIcon, width } = props;
  return (
    <>
      <Button
        hideText
        useIcon={useIcon || 'circle-information'}
        data-tip
        data-for={id}
        className='info-button'
        {...props}
      >
        {props.children}
      </Button>
      {info &&
        <StyledTooltip className='tooltip' width={width} id={id} place='bottom' effect='solid' >
          {info}
        </StyledTooltip>}
    </>
  );
}

InfoButton.propTypes = {
  info: T.string,
  id: T.string,
  children: T.node,
  useIcon: T.oneOfType([T.string, T.array]),
  width: T.string
};

export default InfoButton;
