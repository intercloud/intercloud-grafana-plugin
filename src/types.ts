import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  irn?: string;
  metrics: string;
}

export const defaultQuery: Partial<MyQuery> = {
  irn: 'irn:connector:aaaa:csp:bbbb',
  metrics: 'latency',
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
