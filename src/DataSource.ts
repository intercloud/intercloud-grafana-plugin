import defaults from 'lodash/defaults';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  settings?: DataSourceInstanceSettings;
  type?: string;
  url?: string;
  q?: any;
  backendSrv?: any;
  templateSrv?: any;
  headers?: any;
  metricParamList?: any;
  basicAuth?: any;
  jsonData?: any;
  withCredentials?: boolean;
  constructor(
    instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>,
    $q: any,
    backendSrv: any,
    templateSrv: any
  ) {
    super(instanceSettings);
    this.settings = instanceSettings;
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.jsonData = instanceSettings.jsonData;
    this.headers = { 'Content-Type': 'application/json' };
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
    this.basicAuth = instanceSettings.basicAuth;
    this.metricParamList = {};
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    console.log(options);
    console.log(this.jsonData);

    // Return a constant for each query.
    const data = options.targets.map(target => {
      const query = defaults(target, defaultQuery);
      console.log(query.irn);
      console.log(query.metrics);
      //this.doRequest(`/metrics/query/irn/irn:connectors:skstok62tbks::p0q4dy/bits_send/run?start-d=2020-07-27T11:27:44%2B02:00&end-d=XX`).then((res: { status: number; body: string }) =>
      this.doRequest(`/metrics/query/irn/${query.irn}/${query.metrics}/run`).then(
        (res: { status: number; body: any }) => {
          console.log(res.body);
          res.status === 200
            ? { status: 'success', message: 'OK', title: 'Success' }
            : { status: 'error', message: res.body, title: 'Error' };
        }
      );
      return new MutableDataFrame({
        refId: query.refId,
        fields: [
          { name: 'Time', values: [from, to], type: FieldType.time },
          { name: 'Value', values: [query.irn, query.metrics], type: FieldType.number },
        ],
      });
    });

    return { data };
  }

  async testDatasource() {
    // Implement a health check for your data source.
    // todo query /metrics/healthcheck
    return this.doRequest('/health/metrics').then((res: { status: number; body: string }) =>
      res.status === 200
        ? { status: 'success', message: 'OK', title: 'Success' }
        : { status: 'error', message: res.body, title: 'Error' }
    );
  }

  doRequest(url: string) {
    var options = {
      url: this.url + url,
      withCredentials: this.withCredentials,
      headers: this.headers,
      method: 'GET',
    };
    console.log(options);

    return this.backendSrv.datasourceRequest(options);
  }
}
