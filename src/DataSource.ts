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
  //name?: string;
  path?: string;
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
    //this.url = 'https://api-console-dev.intercloud.io';
    //this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.jsonData = instanceSettings.jsonData;
    this.path = instanceSettings.jsonData.path;
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

    // Return a constant for each query.
    const data = options.targets.map(target => {
      const query = defaults(target, defaultQuery);
      return new MutableDataFrame({
        refId: query.refId,
        fields: [
          { name: 'Time', values: [from, to], type: FieldType.time },
          { name: 'Value', values: [query.constant, query.constant], type: FieldType.number },
        ],
      });
    });

    return { data };
  }

  async testDatasource() {
    // Implement a health check for your data source.
    // todo query /metrics/healthcheck
    console.log('testDatasource: ' + this.url + '/health/metrics');
    console.log(this.q);
    console.log(this.withCredentials);
    console.log(this.basicAuth);
    console.log(this.headers);
    console.log(this.path);
    console.log(this.jsonData);
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
