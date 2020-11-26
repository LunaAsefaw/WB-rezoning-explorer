import React, { useRef, useEffect, useContext } from 'react';
import styled from 'styled-components';
import T from 'prop-types';
import { themeVal, makeTitleCase } from '../../styles/utils/general';
import useQsState from '../../utils/qs-state-hook';

import {
  PanelBlock,
  PanelBlockHeader,
  PanelBlockFooter
} from '../common/panel-block';
import TabbedBlockBody from '../common/tabbed-block-body';
import Button from '../../styles/button/button';
import SliderGroup from '../common/slider-group';
import StressedFormGroupInput from '../common/stressed-form-group-input';
import Heading, { Subheading } from '../../styles/type/heading';
import { FormSwitch } from '../../styles/form/switch';
import { glsp } from '../../styles/utils/theme-values';
import collecticon from '../../styles/collecticons';
import { validateRangeNum } from '../../utils/utils';

import { Accordion, AccordionFold } from '../../components/accordion';
import InfoButton from '../common/info-button';
import GridSetter from './grid-setter';

import ExploreContext from '../../context/explore-context';
import { round } from '../../utils/format';
import { INPUT_CONSTANTS, checkIncluded } from './panel-data';
import FormSelect from '../../styles/form/select';
import { FormGroup } from '../../styles/form/group';
import FormLabel from '../../styles/form/label';

const { SLIDER, BOOL, DROPDOWN, MULTI, TEXT, GRID_OPTIONS, DEFAULT_RANGE } = INPUT_CONSTANTS;

const turbineTypeMap = {
  'Off-Shore Wind': [1, 3],
  Wind: [1, 3],
  'Solar PV': [0, 0]
};

const maxZoneScoreO = {
  name: 'Zone Score Range',
  id: 'zone-score-range',
  active: true,
  isRange: true,
  input: {
    value: { min: 0, max: 1 },
    type: SLIDER,
    range: [0, 1]
  }
};
/*
const maxLCOEO = {
  name: 'LCOE Range',
  id: 'lcoe-range',
  active: true,
  isRange: true,
  input: {
    value: { min: 0, max: 1 },
    type: SLIDER,
    range: [0, 1]
  }
}; */

const castByFilterType = type => {
  switch (type) {
    case BOOL:
      return Boolean;
    case DROPDOWN:
    case TEXT:
      return String;
    case SLIDER:
      return Number;
    default:
      return String;
  }
};
const PanelOption = styled.div`
  ${({ hidden }) => hidden && 'display: none;'}
  margin-bottom: 1.5rem;
`;

const PanelOptionTitle = styled.div`
  font-weight: ${themeVal('type.base.weight')};
  font-size: 0.875rem;
`;
const HeadOption = styled.div`
  & ~ & {
    padding-top: ${glsp(0.5)};
  }
  &:last-of-type {
    box-shadow: 0px 1px 0px 0px ${themeVal('color.baseAlphaB')};
    padding-bottom: ${glsp(0.5)};
  }
`;

const HeadOptionHeadline = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  & > :first-child {
    min-width: 5rem;
  }
`;

const Subheadingstrong = styled.strong`
  color: ${themeVal('color.base')};
`;

const OptionHeadline = styled(HeadOptionHeadline)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  > ${FormSwitch} {
    grid-column-start: 5;
  }
  > ${Button}.info-button {
    grid-column-start: 4;
  }
`;

const FormWrapper = styled.section`
  ${({ active }) => {
    if (!active) {
      return 'display: none;';
    }
  }}
`;

const FormGroupWrapper = styled.div`
  box-shadow: 0px 1px 0px 0px ${themeVal('color.baseAlphaB')};
  padding: 1rem 0;

  &:first-of-type {
    padding-top: 0;
  }
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

export const AccordionFoldTrigger = styled.a`
  display: flex;
  align-items: center;
  margin: -${glsp(0.5)} -${glsp()};
  padding: ${glsp(0.5)} ${glsp()};

  &,
  &:visited {
    color: inherit;
  }
  &:active {
    transform: none;
  }
  &:after {
    ${collecticon('chevron-down--small')}
    margin-left: auto;
    transition: transform 240ms ease-in-out;
    transform: ${({ isExpanded }) =>
      isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const SubmissionSection = styled(PanelBlockFooter)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0rem 1rem;
`;

const initByType = (obj, ranges) => {
  const apiRange = ranges[obj.id];
  const { input } = obj;

  const range = (apiRange && [round(apiRange.min), round(apiRange.max)]) || obj.input.range || DEFAULT_RANGE;

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
        ...obj,
        value: false,
        range: [true, false]
      };
    case MULTI:
    case DROPDOWN:
      return {
        ...obj,
        value: obj.value || (obj.options && obj.options[0]) || '',
        unit: null
      };
    default:
      return {};
  }
};

const updateStateList = (list, i, updatedValue) => {
  const updated = list.slice();
  updated[i] = updatedValue;
  return updated;
};

function QueryForm (props) {
  const { updateFilteredLayer, filtersLists, filterRanges, presets } = useContext(ExploreContext);

  const {
    area,
    resource,
    weightsList,
    lcoeList,
    onAreaEdit,
    onResourceEdit,
    onInputTouched,
    onSelectionChange,
    gridMode,
    setGridMode,
    gridSize, setGridSize,
    maxZoneScore, setMaxZoneScore
    // maxLCOE, setMaxLCOE
  } = props;

  const firstLoad = useRef(true);

  const initListToState = (list) => {
    return list.map((obj) => ({
      ...obj,
      input: initByType(obj, filterRanges.getData()),
      active: obj.active === undefined ? true : obj.active
    }));
  };

  const [weights, setWeights] = useQsState({
    key: 'weights',
    hydrator: v => {
      let base = initListToState(weightsList);
      if (v) {
        const qsValues = v.split('|').map(vals => {
          const [value, active] = vals.split(',');
          return {
            value: Number(value),
            active: active === undefined
          };
        });
        base = base.map((weight, i) => (
          {
            ...weight,
            active: qsValues[i].active,
            input: {
              ...weight.input,
              value: qsValues[i].value || weight.input.value
            }
          }
        ));
      }
      return base;
    },
    dehydrator: v => {
      return v && v.map(w => {
        const { value } = w.input;
        let shard = `${value}`;
        shard = w.active ? shard : `${shard},${false}`;
        return shard;
      }).join('|');
    },
    default: undefined
  });

  const [filters, setFilters] = useQsState({
    key: 'filters',
    hydrator: v => {
      let baseFilts = initListToState(filtersLists);
      if (v) {
        const qsValues = v.split('|').map((vals, i) => {
          const thisFilt = baseFilts[i];
          if (thisFilt.isRange) {
            const [min, max, active] = vals.split(',');
            return {
              value: {
                min: Number(min),
                max: Number(max)
              },
              active: active === undefined
            };
          } else {
            const [val, active] = vals.split(',');
            return {
              value: castByFilterType(thisFilt.input.type)(val),
              active: active === undefined
            };
          }
        });

        baseFilts = baseFilts.map((filt, i) => (
          {
            ...filt,
            active: qsValues[i].active,
            input: {
              ...filt.input,
              value: qsValues[i].value || filt.input.value
            }
          }
        ));
      }
      return baseFilts;
    },
    dehydrator: v => {
      return v && v.map(f => {
        const { value } = f.input;
        let shard = f.isRange ? `${value.min}, ${value.max}` : `${value}`;
        shard = f.active ? shard : `${shard},${false}`;
        return shard;
      }).filter(f => !f.excluded)
        .join('|');
    },
    default: undefined
  });

  const [lcoe, setLcoe] = useQsState({
    key: 'lcoe',
    hydrator: v => {
      let base = initListToState(lcoeList);
      if (v) {
        const qsValues = v.split('|').map(vals => {
          const [value, active] = vals.split(',');
          return {
            value: Number(value),
            active: active === undefined
          };
        });
        base = base.map((cost, i) => (
          {
            ...cost,
            active: qsValues[i].active,
            input: {
              ...cost.input,
              value: qsValues[i].value || cost.input.value
            }
          }
        ));
      }
      return base;
    },
    dehydrator: v => {
      return v && v.map(w => {
        const { value } = w.input;
        let shard = `${value}`;
        shard = w.active ? shard : `${shard},${false}`;
        return shard;
      }).join('|');
    },
    default: undefined
  });

  const inputOfType = (option, onChange) => {
    const { range } = option.input;
    let errorMessage;
    if (range) {
      errorMessage = range[1] - range[0] === 0 ? `Allowed value is ${range[0]}` : `Allowed range is ${round(range[0])} - ${round(range[1])}`;
    } else {
      errorMessage = 'Value not accepted';
    }

    // Get filter range, if available
    const filterRange = filterRanges.getData()[option.id];

    if (option.id === 'lcoe-range') {
    }

    switch (option.input.type) {
      case SLIDER:
        return (
          <SliderGroup
            unit={option.input.unit || '%'}
            range={filterRange ? [round(filterRange.min), round(filterRange.max)] : option.input.range}
            id={option.name}
            value={option.input.value}
            isRange={option.isRange}
            disabled={!option.active}
            onChange={onChange}
          />
        );
      case TEXT:
        return (
          <StressedFormGroupInput
            inputType='number'
            inputSize='small'
            disabled={option.readOnly}
            id={`${option.name}`}
            name={`${option.name}`}
            label={option.name}
            value={option.input.value}
            validate={option.input.range ? validateRangeNum(option.input.range[0], option.input.range[1]) : () => true}
            errorMessage={errorMessage}
            onChange={onChange}
            validationTimeout={1500}
          />
        );
      case BOOL:
        return null;
      case MULTI:
      case DROPDOWN:
        return (
          <FormGroup>
            <FormLabel htmlFor={option.name}>{option.name}</FormLabel>
            <FormSelect
              id={option.name}
              onChange={(e) => onChange(e.target.value)}
              value={option.input.value}
            >
              {
                option.input.options.map(o => {
                  return (
                    <option
                      value={o}
                      key={o}
                    >
                      {o}
                    </option>
                  );
                })
              }
            </FormSelect>
          </FormGroup>
        );
      default:
        return null;
    }
  };

  const resetClick = () => {
    setWeights(initListToState(weightsList));
    setFilters(initListToState(filtersLists));
    setLcoe(initListToState(lcoeList));
  };

  const applyClick = () => {
    const weightsValues = Object.values(weights)
      .reduce((accum, weight) => (
        {
          ...accum,
          [weight.id || weight.name]: Number(weight.input.value)
        }), {});

    const lcoeValues = Object.values(lcoe)
      .reduce((accum, weight) => (
        {
          ...accum,
          [weight.id || weight.name]: Number(weight.input.value)
        }), {});
    updateFilteredLayer(filters, weightsValues, lcoeValues);
  };

  useEffect(onInputTouched, [area, resource, weights, filters, lcoe]);
  useEffect(onSelectionChange, [area, resource, gridSize]);

  useEffect(() => {
    if (resource) {
      const turbineType = lcoe.find(cost => cost.id === 'turbine_type');
      turbineType.input.range = turbineTypeMap[resource];
      turbineType.input.value = turbineType.input.range[0];
    }
  }, [resource]);

  /* Reinitialize filters when new ranges are received */

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
    } else {
      setFilters(initListToState(filtersLists));
    }
  }, [filterRanges]);

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
        <FormWrapper
          name='filters'
          icon='filter'
          presets={presets.filters}
          setPreset={(preset) => {
            if (preset === 'reset') {
              setFilters(initListToState(filtersLists));
            } else {
              setFilters(initListToState(presets.filters[preset]));
            }
          }}
        >

          <Accordion
            initialState={[
              true,
              ...filters.reduce((seen, filt) => {
                if (!seen.includes(filt.category)) {
                  seen.push(filt);
                }
                return seen;
              }, [])
                .slice(1)
                .map((_) => false)
            ]}
            foldCount={Object.keys(filters).length + 1}
            allowMultiple
          >
            {({ checkExpanded, setExpanded }) => (
              <>
                <AccordionFold
                  forwardedAs={FormGroupWrapper}
                  isFoldExpanded={checkExpanded(0)}
                  setFoldExpanded={(v) => setExpanded(0, v)}
                  renderHeader={({ isFoldExpanded, setFoldExpanded }) => (
                    <AccordionFoldTrigger
                      isExpanded={isFoldExpanded}
                      onClick={() => setFoldExpanded(!isFoldExpanded)}
                    >
                      <Heading size='small' variation='primary'>
                        {makeTitleCase('Output Filters')}
                      </Heading>
                    </AccordionFoldTrigger>
                  )}
                  renderBody={({ isFoldExpanded }) => (
                    <>
                      <PanelOption hidden={!isFoldExpanded}>
                        <OptionHeadline>
                          <PanelOptionTitle>{maxZoneScoreO.name}</PanelOptionTitle>
                          {maxZoneScoreO.info && (
                            <InfoButton info={maxZoneScoreO.info} id={maxZoneScoreO.name}>
                                Info
                            </InfoButton>
                          )}
                        </OptionHeadline>
                        {inputOfType({
                          ...maxZoneScoreO,
                          input: {
                            ...maxZoneScoreO.input,
                            value: maxZoneScore
                          }
                        }, ({ min, max }) => {
                          setMaxZoneScore({ min: round(min), max: round(max) });
                        })}
                      </PanelOption>

                      {/* <PanelOption hidden={!isFoldExpanded}>
                        <OptionHeadline>
                          <PanelOptionTitle>{maxLCOEO.name}</PanelOptionTitle>
                          {maxLCOEO.info && (
                            <InfoButton info={maxLCOEO.info} id={maxLCOEO.name}>
                                Info
                            </InfoButton>
                          )}
                        </OptionHeadline>
                        {inputOfType({
                          ...maxLCOEO,
                          input: {
                            ...maxLCOEO.input,
                            value: maxLCOE
                          }
                        }, ({ min, max }) => {
                          setMaxLCOE({ min: round(min), max: round(max) });
                        })}
                      </PanelOption> */}
                    </>
                  )}
                />

                {Object.entries(filters.reduce((accum, filt) => {
                  if (!accum[filt.category]) {
                    accum[filt.category] = [];
                  }
                  accum[filt.category].push(filt);
                  return accum;
                }, {}))
                  .map(([group, list], idx) => {
                    idx += 1;
                    return (
                      <AccordionFold
                        key={group}
                        forwardedAs={FormGroupWrapper}
                        isFoldExpanded={checkExpanded(idx)}
                        setFoldExpanded={(v) => setExpanded(idx, v)}
                        renderHeader={({ isFoldExpanded, setFoldExpanded }) => (
                          <AccordionFoldTrigger
                            isExpanded={isFoldExpanded}
                            onClick={() => setFoldExpanded(!isFoldExpanded)}
                          >
                            <Heading size='small' variation='primary'>
                              {makeTitleCase(group.replace(/_/g, ' '))}
                            </Heading>
                          </AccordionFoldTrigger>
                        )}
                        renderBody={({ isFoldExpanded }) =>
                          list.map((filter, ind) => (
                            checkIncluded(filter, resource) &&
                        <PanelOption key={filter.name} hidden={!isFoldExpanded}>
                          <OptionHeadline>
                            <PanelOptionTitle>{`${filter.name}`.concat(filter.unit ? ` (${filter.unit})` : '')}</PanelOptionTitle>
                            {filter.info && (
                              <InfoButton info={filter.info} id={filter.name}>
                                Info
                              </InfoButton>
                            )}
                            <FormSwitch
                              hideText
                              name={`toggle-${filter.name.replace(/ /g, '-')}`}
                              disabled={filter.disabled}
                              checked={filter.active}
                              onChange={() => {
                                const ind = filters.findIndex(f => f.id === filter.id);
                                setFilters(updateStateList(filters, ind, {
                                  ...filter,
                                  active: !filter.active,
                                  input: {
                                    ...filter.input,
                                    value: filter.input.type === BOOL ? !filter.active : filter.input.value
                                  }
                                }));
                              }}
                            >
                              Toggle filter
                            </FormSwitch>
                          </OptionHeadline>
                          {
                            inputOfType(filter, (value) => {
                              if (filter.active) {
                                const ind = filters.findIndex(f => f.id === filter.id);
                                setFilters(updateStateList(filters, ind, {
                                  ...filter,
                                  input: {
                                    ...filter.input,
                                    value
                                  }

                                }));
                              }
                            })
                          }

                        </PanelOption>
                          ))}
                      />
                    );
                  })}
              </>
            )}
          </Accordion>
        </FormWrapper>

        <FormWrapper
          name='weights'
          icon='sliders-horizontal'
          presets={presets.weights}
          setPreset={(preset) => {
            if (preset === 'reset') {
              setWeights(initListToState(weightsList));
            } else {
              setWeights(initListToState(presets.weights[preset]));
            }
          }}
        >
          {weights.map((weight, ind) => (
            <PanelOption key={weight.name}>
              <PanelOptionTitle>{weight.name}</PanelOptionTitle>
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

        <FormWrapper
          name='lcoe'
          icon='disc-dollar'
          presets={presets.lcoe}
          setPreset={(preset) => {
            if (preset === 'reset') {
              setLcoe(initListToState(lcoeList));
            } else {
              setLcoe(initListToState(presets.lcoe[preset]));
            }
          }}
        >
          {lcoe.map((cost, ind) => (
            <PanelOption key={cost.name}>
              {
                inputOfType(cost, (v) => {
                  setLcoe(updateStateList(lcoe, ind, {
                    ...cost,
                    input: {
                      ...cost.input,
                      value: v
                    }
                  }));
                })
              }
            </PanelOption>
          ))}
        </FormWrapper>
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

FormWrapper.propTypes = {
  setPreset: T.func.isRequired,
  name: T.string,
  icon: T.string
};

QueryForm.propTypes = {
  area: T.object,
  resource: T.string,
  weightsList: T.array,
  lcoeList: T.array,
  onResourceEdit: T.func,
  onAreaEdit: T.func,
  onInputTouched: T.func,
  onSelectionChange: T.func,
  gridMode: T.bool,
  setGridMode: T.func,
  gridSize: T.number,
  setGridSize: T.func,
  maxZoneScore: T.object,
  setMaxZoneScore: T.func
  /* maxLCOE: T.object,
  setMaxLCOE: T.func */
};

export default QueryForm;
