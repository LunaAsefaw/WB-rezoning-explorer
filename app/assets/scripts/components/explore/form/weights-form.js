import React from 'react';
import T from 'prop-types';
import {
  FormWrapper,
  PanelOption,
  PanelOptionTitle,
  OptionHeadline
} from '../../../styles/form/form';
import FormIntro from './form-intro';
import FormInput from '../form/form-input';
import { distributedDivision, sumBy } from '../../../utils/math';
import Button from '../../../styles/button/button';
import { exportZoneWeightsCsv } from '../export/csv';

function updateWeight(weights, id, value) {
  const [w, setValue] = weights.find(([w]) => w.id === id);
  setValue({
    ...w,
    input: {
      ...w.input,
      value: value > 100 ? 1 : value > 0 ? Math.round(value) : 0
    }
  });
}

function WeightsForm(props) {
  const { weights, active, weightsLocks, setWeightLocks, selectedArea } = props;

  function onSliderChange(id, sliderVal) {
    let updatedValuesArray = weights.map(([w]) => {
      return {
        id: w.id,
        locked: typeof weightsLocks[w.id] !== 'undefined' ? weightsLocks[w.id] : false,
        value: id === w.id ? sliderVal : w.input.value
      };
    });

    // Sliders to update. Everyone except the disabled ones and the current.
    const slidersToUpdate = updatedValuesArray.filter(
      (slider) => !slider.locked && slider.id !== id && slider.value > 0
    );

    // Get by how much is over 100;
    const excess = 100 - sumBy(updatedValuesArray, 'value');
    // By how much we need to update the sliders.
    // Since the steps are integers the deltas is an array with the value to
    // use to update each of the indexes.
    const deltas = distributedDivision(excess, slidersToUpdate.length);

    // Update the values of the other sliders.
    updatedValuesArray = updatedValuesArray.map((slider, i) => {
      // If this slider is not locked, we can update the value
      if (slidersToUpdate.find(s => s.id === slider.id)) {
        const deltaIndex = slidersToUpdate.findIndex(s => s.id === slider.id);
        // Calculate the new value and keep it between 0 - 100.
        const newVal = Math.max(0, Math.min(slider.value + deltas[deltaIndex], 100));
        // If the sliding slider reached 100 then this is 0.
        // Otherwise use the value.
        return {
          ...slider,
          value: newVal
        };
      } else {
        // Otherwise just use the locked value
        return slider;
      }
    });

    // Total of other sliders.
    const otherTotalVal = sumBy(updatedValuesArray, (val) =>
      val.id === id ? 0 : val.value
    );

    // Allowed value to ensure that the sum doesn't go over or below 100.
    const allowedSliderVal = 100 - otherTotalVal;

    // Update active slider
    updateWeight(weights, id, allowedSliderVal);

    // Update other sliders
    slidersToUpdate.forEach((s, i) => {
      updateWeight(weights, s.id, s.value + deltas[i]);
    });
  }

  return (
    <FormWrapper active={active}>
      <FormIntro
        formTitle='Zone weights'
        introText='Set custom zone weighting parameters to change the calculated zone scores.'
      />
      {weights.map(([weight]) => {
        return (
          <PanelOption key={weight.id}>
            <OptionHeadline>
              <PanelOptionTitle>{weight.name}</PanelOptionTitle>
            </OptionHeadline>
            <FormInput
              isWeight
              isLocked={weightsLocks[weight.id]}
              onLockChange={(value) => {
                setWeightLocks({
                  ...weightsLocks,
                  [weight.id]: value
                });
              }}
              option={{ ...weight, active: !weightsLocks[weight.id] }}
              onChange={(value) =>
                onSliderChange(weight.id, Math.round(value))}
            />
          </PanelOption>
        );
      })}
      <Button
        size='large'
        style={{"width": "100%"}}
        onClick={() => { exportZoneWeightsCsv( selectedArea, weights.map( f => f[0] ) ) }}
        variation='primary-raised-light'
        useIcon='download'
      >
        Export (.csv)
      </Button>
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
  active: T.bool,
  disabled: T.bool,
  weightsLocks: T.object,
  setWeightLocks: T.func
};

export default WeightsForm;
