import React, { useCallback } from 'react';
import T from 'prop-types';
import styled from 'styled-components';
import Button from '../../../styles/button/button';

import {
  FormWrapper,
  FormGroupWrapper,
  PanelOption,
  OptionHeadline,
  PanelOptionTitle,
  EmptyState
} from '../../../styles/form/form';
import FormIntro from './form-intro';
import { Accordion, AccordionFold, AccordionFoldTrigger } from '../../../components/accordion';
import Heading from '../../../styles/type/heading';
import { makeTitleCase } from '../../../styles/utils/general';

import { FormSwitch } from '../../../styles/form/switch';
import { INPUT_CONSTANTS } from '../panel-data';

import FormInput from './form-input';
import Dropdown from '../../common/dropdown';

const { BOOL } = INPUT_CONSTANTS;

const DropdownWide = styled(Dropdown)`
  max-width: 40rem;
`;

/* Filters info table
 * @param filter_data is an array of shape
 *  [
 *    {label: String, info: String},
 *    ...
 *  ]
 */
function FilterInfoTable (props) {
  const { filter_data } = props;
  
  return (
    <table style={{"border": "1px solid"}}>
      <thead>
          <b style={{"padding": "5px"}}>Filter Info</b>
      </thead>
      <tbody>
          {filter_data.map( (info) => ( info.info ?
            <tr>
              <td style={{"padding": "5px", "border": "1px solid"}}>{info.label}</td>
              <td style={{"padding": "5px", "border": "1px solid"}}>{info.info}</td>
            </tr>
            : null
          ) )}
      </tbody>
    </table>
  );
}

FilterInfoTable.propTypes = {
  filter_data: T.array,
};

/* Filters form
 * @param outputFilters is an array of shape
 *  [
 *    [getFilter1 (value), setFilter1 (func), filter1Object (object) ],
 *    ...
 *  ]
 *  @param presets - required, accessed by parent TabbedBlockBody
 *  @param setPreset - requred, accessed by parent TabbedBlockBody
 */
function FiltersForm (props) {
  const {
    filters,
    checkIncluded,
    resource,
    active,
    disabled
  } = props;

  return (
    <>
      {disabled && (
        <EmptyState>
          Select Area and Resource to view and interact with input parameters.
        </EmptyState>
      )}
      <FormWrapper active={active} disabled={disabled}>
        <FormIntro
          formTitle='Spatial Filters'
          introText='This step identifies areas suitable for solar PV (or wind or offshore wind) development by applying spatial filters. Suitable areas will then be used to generate solar energy zones, which can be scored with user-provided weights and economic assumptions.'
        />
        <Accordion
          initialState={[
            ...filters
              .reduce((seen, [filt, setFilt]) => {
                if (!seen.includes(filt.category)) {
                  seen.push(filt);
                }
                return seen;
              }, [])
              .map((_) => true)
          ]}
          // foldCount={Object.keys(filters).length + 1}
          allowMultiple
        >
          {({ checkExpanded, setExpanded }) => (
            <>
              {Object.entries(
                filters.reduce((accum, filt) => {
                  const [get] = filt;
                  if (!accum[get.category]) {
                    accum[get.category] = [];
                  }
                  accum[get.category].push(filt);
                  return accum;
                }, {})
              ).map(([group, list], idx) => {
                /* Filters, built as AccordionFolds for each category */
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
                      list
                        .sort(([a, _a], [b, _b]) => {
                          return a.priority - b.priority;
                        })
                        .filter(
                          ([f, _]) => f.input.range[0] !== f.input.range[1]
                        )
                        .map(([filter, setFilter], ind) => {
                          const inputOnChange = useCallback(
                            (value) => {
                              if (filter.active) {
                                setFilter({
                                  ...filter,
                                  input: {
                                    ...filter.input,
                                    value
                                  }
                                });
                              }
                            },

                            [filter]
                          );

                          const switchOnChange = useCallback(() => {
                            setFilter({
                              ...filter,
                              active: !filter.active,
                              input: {
                                ...filter.input,
                                value:
                                  filter.input.type === BOOL
                                    ? !filter.active
                                    : filter.input.value
                              }
                            });
                          }, [filter]);
                          return (
                            checkIncluded(filter, resource) && (
                              <PanelOption
                                key={filter.name}
                                hidden={!isFoldExpanded}
                              >
                                <OptionHeadline>
                                  <PanelOptionTitle>
                                    {`${filter.name}`.concat(
                                      filter.unit ? ` (${filter.unit})` : ''
                                    )}
                                  </PanelOptionTitle>
                                  {filter.info && (
                                    <DropdownWide
                                      alignment='center'
                                      direction='down'
                                      triggerElement={
                                        <Button
                                          hideText
                                          useIcon='circle-information'
                                          className='info-button'
                                          title={filter.info}
                                        >
                                          Info
                                        </Button>
                                      }>
                                      <FilterInfoTable filter_data={[
                                        {label: "Title: ", info: filter.title}, 
                                        {label: "Description: ", info: filter.description}, 
                                        {label: "Secondary description: ", info: filter.secondary_description},
                                        {label: "Energy type: ", info: filter.energy_type},
                                        {label: "Unit: ", info: filter.unit},
                                        {label: "Category: ", info: filter.category},
                                        {label: "Secondary category: ", info: filter.secondary_category},
                                        {label: "Layer: ", info: filter.layer},
                                      ]}/>
                                    </DropdownWide>
                                  )}

                                  {filter.input.type === BOOL && (
                                    <FormSwitch
                                      hideText
                                      name={`toggle-${filter.name.replace(
                                        / /g,
                                        '-'
                                      )}`}
                                      disabled={filter.disabled}
                                      checked={filter.active}
                                      onChange={switchOnChange}
                                    >
                                      Toggle filter
                                    </FormSwitch>
                                  )}
                                </OptionHeadline>
                                <FormInput
                                  option={filter}
                                  onChange={inputOnChange}
                                />
                              </PanelOption>
                            )
                          );
                        })}
                  />
                );
              })}
            </>
          )}
        </Accordion>
      </FormWrapper>
    </>
  );
}

FiltersForm.propTypes = {
  /* eslint-disable react/no-unused-prop-types */
  presets: T.object,
  setPreset: T.func,
  name: T.string,
  icon: T.string,
  filters: T.array,
  resource: T.string,
  setFilters: T.func,
  outputFilters: T.array,
  checkIncluded: T.func,
  active: T.bool,
  disabled: T.bool
};

export default FiltersForm;
