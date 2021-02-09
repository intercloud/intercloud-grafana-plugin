import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  irn?: string;
  metric?: string;
}

export const defaultQuery: Partial<MyQuery> = {
  irn: '',
  metric: '',
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}

/**
 * Influx response type
 */
export type InfluxResponse = {
  type: 'timeserie' | 'status';
  measure: string;
  axis: Record<string, { title: string; unit: string }>;
  Results: Array<{
    Series:
      | Array<{
          columns: [string, string, string];
          values: Array<[string, number, number]>;
          name: string;
        }>
      | Array<{
          columns: [string, string];
          values: Array<[string, number]>;
          name: string;
        }>
      | null;
  }>;
};

/**
 * Metric type response
 */
export type MetricTypeResponse = {
  name: string;
  type: 'timeserie' | 'status';
};
