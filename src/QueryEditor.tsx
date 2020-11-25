import React, { ChangeEvent, useCallback, useState, useEffect, useMemo, FunctionComponent } from 'react';
import { Select, Input, InlineFieldRow, InlineField } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { MetricTypeResponse, MyDataSourceOptions, MyQuery } from './types';
import { getBackendSrv } from '@grafana/runtime';
import useDebounce from 'hooks/useDebounce';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

const ErrorNoOption = new Error('no option');

export const QueryEditor: FunctionComponent<Props> = ({
  onChange,
  query,
  onRunQuery,
  datasource: { url: datasourceUrl },
}: Props) => {
  const { irn, metric, refId } = query;

  const [isMetricSelectLoading, setMetricSelectLoading] = useState(false);
  const [options, setOptions] = useState<SelectableValue<string>[]>([]);
  const [validIrn, setValidIrn] = useState(!!irn || false);

  const irnDebounced = useDebounce(irn, 300);

  const onIrnChange = useCallback(
    ({ target: { value: irn } }: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...query, irn });
    },
    [onChange, query]
  );

  const onMetricChange = useCallback(
    (selected: SelectableValue<string> = { value: '' }) => {
      const { value } = selected;
      onChange({ ...query, metric: value ?? '' });
      // executes the query
      onRunQuery();
    },
    [onChange, query, onRunQuery]
  );

  useEffect(() => {
    if (!irnDebounced) {
      return;
    }
    setOptions([]);
    setMetricSelectLoading(true);
    getBackendSrv()
      .get(`${datasourceUrl}/metrics/query/irn/${irnDebounced}`)
      .then((resp: MetricTypeResponse[]) => {
        const opts = resp
          .filter(({ type }) => type === 'timeserie')
          .map(({ name }) => ({
            label: name,
            value: name,
          }));
        setOptions(opts);
        if (!opts.length) {
          throw ErrorNoOption;
        }
        setValidIrn(true);
      })
      .catch(e => {
        setValidIrn(false);
        console.log({ e });
        throw e;
      })
      .finally(() => {
        setMetricSelectLoading(false);
      });
  }, [irnDebounced, setOptions, setMetricSelectLoading, setValidIrn]);

  const selectedValue = useMemo(() => options.find(({ value }) => metric === value), [metric, options]);

  return (
    <>
      <InlineFieldRow>
        <InlineField labelWidth={10} label="IRN" tooltip="Intercloud Resource Name" invalid={!validIrn}>
          <Input
            width={45}
            css // ??
            id={`irnInput-${refId}`}
            name="irnInput"
            placeholder={'Source irn'}
            value={irn}
            onChange={onIrnChange}
          />
        </InlineField>
        <InlineField
          labelWidth={10}
          label="Metric"
          tooltip="Metric type"
          invalid={!!options.length && !selectedValue}
          disabled={!options.length}
        >
          <Select
            width={30}
            isClearable
            value={selectedValue}
            placeholder={'Choose metric'}
            isLoading={isMetricSelectLoading}
            isSearchable={false}
            options={options || []}
            onChange={onMetricChange}
          />
        </InlineField>
      </InlineFieldRow>
    </>
  );
};
