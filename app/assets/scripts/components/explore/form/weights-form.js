import React from 'react';
import T from 'prop-types';
import { FormWrapper, PanelOption, PanelOptionTitle, OptionHeadline } from './form';
import InfoButton from '../../common/info-button';

function WeightsForm (props) {
  const {
    weights,
    setWeights,
    inputOfType,
    updateStateList,
    active
  } = props;
  return (
    <FormWrapper
      active={active}
    >
      {weights.map((weight, ind) => (
        <PanelOption key={weight.name}>
          <OptionHeadline>
            <PanelOptionTitle>{weight.name}</PanelOptionTitle>
            <InfoButton info={weight.info} id={weight.name}>
                Info
            </InfoButton>
          </OptionHeadline>

          {
            inputOfType(weight, (value) => {
              setWeights(
                updateStateList(weights, ind, {
                  ...weight,
                  input: {
                    ...weight.input,
                    value
                  }
                })
              );
            })
          }
        </PanelOption>
      ))}
    </FormWrapper>

  );
}

WeightsForm.propTypes = {
  /* eslint-disable react/no-unused-prop-types */
  name: T.string,
  icon: T.string,
  presets: T.object,
  setPreset: T.func,
  weights: T.array,
  setWeights: T.func,
  inputOfType: T.func,
  updateStateList: T.func,
  active: T.bool
};

export default WeightsForm;
