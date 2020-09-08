import defaults from 'lodash/defaults';

import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './DataSource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

const { FormField } = LegacyForms;

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onIrnChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, irn: event.target.value });
    // executes the query
    onRunQuery();
  };

  onMetricsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, metrics: event.target.value });
    // executes the query
    onRunQuery();
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { metrics, irn } = query;

    return (
      <div className="gf-form">
        <FormField
          width={4}
          value={irn || ''}
          onChange={this.onIrnChange}
          label="IRN"
          type="string"
          tooltip="Intercloud resource name"
        />
        <FormField
          labelWidth={8}
          value={metrics || ''}
          onChange={this.onMetricsChange}
          label="Metrics Name"
          type="string"
          tooltip="Metrics name"
        />
      </div>
    );
  }
}
