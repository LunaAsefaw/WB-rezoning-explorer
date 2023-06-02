import React, { useContext, useState } from 'react';
import { withRouter } from 'react-router-dom';
import Dropdown from './dropdown';
import Button from '../../styles/button/button';
import SubmitIssueTray from '../explore/submit-issue-tray';
import styled from 'styled-components';
import { tint } from 'polished';
import { stylizeFunction, themeVal } from '../../styles/utils/general';

const _tint = stylizeFunction(tint);

const FeedbackFormBlock = styled.footer`
  background: ${_tint(0.02, themeVal('color.surface'))};
  position: relative;
`;

function FeedbackForm() {
  return (
    <Dropdown
      className='feedback'
      alignment='right'
      direction='down'
      triggerElement={
        <Button
          id='toggle-feedback-tray'
          variation='achromic-plain'
          title='Toggle Feedback Form'
          hideText
          useIcon='feedback'
        >
          <span>Feedback Form</span>
        </Button>
      }
    >
      <span style={{color:'white'}}>Feedback Form</span>
      <Button
          title='Close Feedback Form'
          hideText
          useIcon='xmark'
          onClick={()=>Dropdown.closeAll()}
          style={{color:'white', marginLeft: '45px'}}
        >
          <span>Feedback Form</span>
        </Button>
      <FeedbackFormBlock>
        <div
          style={{
            align: 'center',
            display: 'grid',
            backgroundColor: '#23a7f5'
          }}
        >
          <SubmitIssueTray
            show={true}
            className='submit-issue-tray'
            style={{ padding: '0' }}
          />
        </div>
      </FeedbackFormBlock>
    </Dropdown>
  );
}

export default withRouter(FeedbackForm);
