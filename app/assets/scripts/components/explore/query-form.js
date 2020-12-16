import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import T from 'prop-types';
import { themeVal } from '../../styles/utils/general';
import useQsState from '../../utils/qs-state-hook';
import {
  PanelBlock,
  PanelBlockHeader,
  PanelBlockFooter
} from '../common/panel-block';
import TabbedBlockBody from '../common/tabbed-block-body';
import Button from '../../styles/button/button';
import Heading, { Subheading } from '../../styles/type/heading';

import GridSetter from './grid-setter';

import { round } from '../../utils/format';
import { INPUT_CONSTANTS, checkIncluded, apiResourceNameMap, setRangeByUnit } from './panel-data';
import { HeadOption, HeadOptionHeadline } from './form/form';
import { FiltersForm, WeightsForm, LCOEForm } from './form';

const { SLIDER, BOOL, DROPDOWN, MULTI, TEXT, GRID_OPTIONS, DEFAULT_RANGE } = INPUT_CONSTANTS;

const castByFilterType = type => {
  switch (type) {
    case BOOL:
      return Boolean;
    case DROPDOWN:
    case MULTI:
    case TEXT:
      return String;
    case SLIDER:
      return Number;
    default:
      return String;
  }
};

const Subheadingstrong = styled.strong`
  color: ${themeVal('color.base')};
`;

export const EditButton = styled(Button).attrs({
  variation: 'base-plain',
  size: 'small',
  useIcon: 'pencil',
  hideText: true
})`
  opacity: 50%;
  margin-left: auto;
`;

const SubmissionSection = styled(PanelBlockFooter)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0rem 1rem;
`;

const initByType = (obj, ranges, resource) => {
  // Api filter schema includes layer property
  // Use to resolve correct range from api /filter/{country}/layers
  const apiRange = ranges[obj.layer];
  const { input, options } = obj;

  const range = setRangeByUnit(
    (apiRange &&
      [round(apiRange.min), round(apiRange.max)]) ||
      obj.input.range || DEFAULT_RANGE,
    obj.unit);

  switch (input.type) {
    case SLIDER:
      return {
        ...input,
        range,
        unit: input.unit,
        value: input.value || input.default || (obj.isRange ? { min: round(range[0]), max: round(range[1]) } : range[0])
      };
    case TEXT:
      return {
        ...input,
        range: input.range || DEFAULT_RANGE,
        unit: input.unit,
        value: input.value || input.default || (input.range || DEFAULT_RANGE)[0]
      };
    case BOOL:
      return {
        ...input,
        value: false,
        range: [true, false]
      };
    case MULTI:
      return {
        ...input,
        // For multi select use first option as default value
        value: input.value || [0],
        unit: null
      };
    case DROPDOWN:
      return {
        ...input,
        value: obj.value || (
          options[resource] && options[resource][0]) || '',
        availableOptions: options[resource] || [],
        unit: null
      };
    default:
      return {};
  }
};

function QueryForm (props) {
  const {
    area,
    resource,
    filtersLists,
    weightsList,
    lcoeList,
    updateFilteredLayer,
    filterRanges,
    presets,
    onAreaEdit,
    onResourceEdit,
    onInputTouched,
    onSelectionChange,
    gridMode,
    setGridMode,
    gridSize, setGridSize,
    maxZoneScore, setMaxZoneScore,
    maxLCOE, setMaxLCOE
  } = props;

  const firstLoad = useRef(true);

  /* Generate weights qs state variables
  */
  const weightsInd = weightsList.map(w => {
    const [weight, setWeight] = useQsState({
      key: w.id,
      hydrator: v => {
        const base = {
          ...w,
          input: initByType(w, {}),
          active: w.active === undefined ? true : w.active
        };
        let inputUpdate = {};
        if (v) {
          const [value, active] = v.split(',');
          inputUpdate = {
            value: castByFilterType(base.input.type)(value),
            active: active === undefined
          };
        }
        return {
          ...base,
          active: inputUpdate.active === undefined ? base.active : inputUpdate.active,
          input: {
            ...base.input,
            value: inputUpdate.value || base.input.value
          }
        };
      },
      dehydrator: w => {
        const { value } = w.input;
        let shard = `${value}`;
        shard = w.active ? shard : `${shard},${false}`;
        return shard;
      }
    });
    return [weight, setWeight];
  });

  /* Generate filters qs state variables */
  const filtersInd = filtersLists.map(f => {
    const [filt, setFilt] = useQsState({
      key: f.id,
      default: undefined,
      hydrator: v => {
        const base = {
          ...f,
          input: initByType(f, filterRanges.getData(), apiResourceNameMap[resource]),
          active: f.active === undefined ? true : f.active
        };

        let inputUpdate;
        if (v) {
          if (base.isRange) {
            const [min, max, active] = v.split(',');
            inputUpdate = {
              value: {
                min: Number(min),
                max: Number(max)
              },
              active: active === undefined
            };
          } else if (base.input.options) {
            v = v.split(',');
            let active = true;
            if (v[v.length - 1] === 'false') {
              // remove active
              v = v.slice(0, v.length - 2).map(Number);
              active = false;
            } else {
              v = v.map(Number);
            }
            inputUpdate = {
              value: v,
              active
            };
          } else {
            const [val, active] = v.split(',');
            inputUpdate = {
              value: castByFilterType(base.input.type)(val),
              active: active === undefined
            };
          }

          return {
            ...base,
            active: inputUpdate.active,
            input: {
              ...base.input,
              value: inputUpdate.value || base.input.value
            }
          };
        }
      },
      dehydrator: f => {
        const { value } = f.input;
        let shard;
        if (f.isRange) {
          shard = `${value.min}, ${value.max}`;
        } else if (f.input.options) {
          shard = value.join(',');
        } else {
          shard = `${value}`;
        }
        shard = f.active ? shard : `${shard},${false}`;
        return shard;
      }
    });
    return [filt, setFilt];
  });

  const initialize = (baseList, destList, options) => {
    const { reset, apiRange } = options || {};
    if (firstLoad.current && filterRanges.isReady()) {
      firstLoad.current = false;
    }
    baseList.forEach((base, ind) => {
      const [object, setObject] = destList[ind];
      if (object && !reset) {
        // This filter has been set via the url
        // Does not need to be initialized
        return;
      }

      // Initialize the filter with default values
      setObject({
        ...base,
        input: {
          ...initByType(base,
            apiRange || {},
            apiResourceNameMap[resource])
        },
        active: base.active === undefined ? true : base.active
      });
    });
  };

  const lcoeInd = lcoeList.map(c => {
    const [cost, setCost] = useQsState({
      key: c.id,
      default: undefined,
      hydrator: v => {
        const base = {
          ...c,
          input: initByType(c, {}, apiResourceNameMap[resource]),
          active: c.active === undefined ? true : c.active
        };
        let inputUpdate = {};
        if (v) {
          const [value, active] = v.split(',');
          inputUpdate = {
            value: castByFilterType(base.input.type)(value),
            active: active === undefined
          };
        }
        return {
          ...base,
          active: inputUpdate.active === undefined ? base.active : inputUpdate.active,
          input: {
            ...base.input,
            value: inputUpdate.value || base.input.value
          }
        };
      },
      dehydrator: c => {
        const { value } = c.input;
        let shard = `${value}`;
        shard = c.active ? shard : `${shard},${false}`;
        return shard;
      }
    });
    return [cost, setCost];
  });

  const resetClick = () => {
    initialize(filtersLists, filtersInd, { reset: true });
    initialize(weightsList, weightsInd, { reset: true });
    initialize(lcoeList, lcoeInd, { reset: true });
  };

  /* Reduce filters, weights, and lcoe
   * Call function to send values to api
   */
  const applyClick = () => {
    const weightsValues = weightsInd.reduce((accum, [weight, _]) => ({
      ...accum,
      [weight.id || weight.name]: castByFilterType(weight.input.type)(weight.input.value)
    }), {});

    const lcoeValues = lcoeInd.reduce((accum, [cost, _]) => ({
      ...accum,
      [cost.id || cost.name]: castByFilterType(cost.input.type)(cost.input.value)
    }), {});

    // Get filters and discard setting functions
    const filters = filtersInd.map(([filter, _]) => filter);

    updateFilteredLayer(filters, weightsValues, lcoeValues);
  };
  useEffect(() => {
    initialize(filtersLists, filtersInd, {
      reset: false,
      apiRange: filterRanges.getData()
    });
  }, [filterRanges, resource]);

  useEffect(onInputTouched, [area, resource]);
  useEffect(onSelectionChange, [area, resource, gridSize]);

  /* Update capacity factor options based on
   * what the current resource is
   */
  useEffect(() => {
    if (resource) {
      try {
        const [capacity, setCapacity] = lcoeInd.find(([cost, _]) => cost.id === 'capacity_factor');
        capacity.input.availableOptions = capacity.input.options[apiResourceNameMap[resource]];
        capacity.input.value = capacity.input.availableOptions[0];
        setCapacity(capacity);
      } catch (err) {
        /* eslint-disable-next-line */
        console.error(err);
      }
    }
  }, [resource]);

  /* Wait until elements have mounted and been parsed to render the query form */
  if (firstLoad.current) {
    return null;
  }

  return (
    <PanelBlock>
      <PanelBlockHeader>
        <HeadOption>
          <HeadOptionHeadline id='selected-area-prime-panel-heading'>
            <Heading size='large' variation='primary'>
              {area ? area.name : 'Select Area'}
            </Heading>
            <EditButton
              id='select-area-button'
              onClick={onAreaEdit}
              title='Edit Area'
            >
              Edit Area Selection
            </EditButton>
          </HeadOptionHeadline>
        </HeadOption>

        <HeadOption>
          <HeadOptionHeadline id='selected-resource-prime-panel-heading'>
            <Subheading>Resource: </Subheading>
            <Subheading variation='primary'>
              <Subheadingstrong>
                {resource || 'Select Resource'}
              </Subheadingstrong>
            </Subheading>
            <EditButton
              id='select-resource-button'
              onClick={onResourceEdit}
              title='Edit Resource'
            >
              Edit Resource Selection
            </EditButton>
          </HeadOptionHeadline>
        </HeadOption>

        <HeadOption>
          <HeadOptionHeadline>
            <Subheading>Grid Size: </Subheading>
            <Subheading variation='primary'>
              <Subheadingstrong>
                {gridMode ? `${gridSize} km²` : 'Boundaries'}
              </Subheadingstrong>
            </Subheading>

            <GridSetter
              gridOptions={GRID_OPTIONS}
              gridSize={gridSize}
              setGridSize={setGridSize}
              gridMode={gridMode}
              setGridMode={setGridMode}
              disableBoundaries={resource === 'Off-Shore Wind'}
            />
          </HeadOptionHeadline>
        </HeadOption>
      </PanelBlockHeader>

      <TabbedBlockBody>
        <FiltersForm
          name='filters'
          icon='filter'
          setPreset={(preset) => {
            if (preset === 'reset') {
              initialize(filtersLists, filtersInd, {
                reset: true,
                apiRange: filterRanges.getData()
              });
            } else {
              initialize(presets.filters[preset], filtersInd, {
                reset: true,
                apiRange: filterRanges.getData()
              });
            }
          }}
          filters={filtersInd}
          checkIncluded={checkIncluded}
          resource={resource}
          outputFilters={
            [
              [maxZoneScore, setMaxZoneScore, 'Run analysis to filter on zone score'],
              [maxLCOE, setMaxLCOE, 'Run analysis to filter on LCOE']
            ]
          }
        />
        <WeightsForm
          name='weights'
          icon='sliders-horizontal'
          weights={weightsInd}
          presets={presets.weights}
          setPreset={(preset) => {
            if (preset === 'reset') {
              initialize(weightsList, weightsInd, {
                reset: true
              });
            } else {
              initialize(presets.weights[preset], weightsInd, {
                reset: true
              });
            }
          }}

        />
        <LCOEForm
          name='lcoe'
          icon='disc-dollar'
          lcoe={lcoeInd}
          // setLcoe={setLcoe}
          presets={presets.lcoe}
          setPreset={(preset) => {
            if (preset === 'reset') {
              initialize(lcoeList, lcoeInd, {
                reset: true
              });
            } else {
              initialize(presets.lcoe[preset], lcoeInd, {
                reset: true
              });
            }
          }}

        />

      </TabbedBlockBody>

      <SubmissionSection>
        <Button
          size='small'
          type='reset'
          onClick={resetClick}
          variation='primary-raised-light'
          useIcon='arrow-loop'
        >
          Reset
        </Button>
        <Button
          size='small'
          type='submit'
          onClick={applyClick}
          variation='primary-raised-dark'
          useIcon='tick--small'
        >
          Apply
        </Button>
      </SubmissionSection>
    </PanelBlock>
  );
}

QueryForm.propTypes = {
  area: T.object,
  resource: T.string,
  filtersLists: T.array,
  weightsList: T.array,
  lcoeList: T.array,
  updateFilteredLayer: T.func,
  filterRanges: T.object,
  presets: T.shape({
    weights: T.object,
    lcoe: T.object,
    filters: T.object
  }),
  onResourceEdit: T.func,
  onAreaEdit: T.func,
  onInputTouched: T.func,
  onSelectionChange: T.func,
  gridMode: T.bool,
  setGridMode: T.func,
  gridSize: T.number,
  setGridSize: T.func,
  maxZoneScore: T.object,
  setMaxZoneScore: T.func,
  maxLCOE: T.object,
  setMaxLCOE: T.func
};

export default QueryForm;
