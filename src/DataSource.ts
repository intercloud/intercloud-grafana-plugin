import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions } from './types';

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
    const from = new Date(range!.from.valueOf());
    const to = new Date(range!.to.valueOf());

    // For each query, create a promise
    const promises = options.targets.map(query => {
      const uri = `/metrics/query/irn/${query.irn}/${
        query.metrics
      }/run?start-d=${from.toISOString()}&end-d=${to.toISOString()}`;

      return this.doRequest(uri).then((res: any) => {
        const frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'time', type: FieldType.time },
            { name: res.data.measure, type: FieldType.number },
          ],
        });
        if (res.status === 200) {
          const values = res.data.Results[0].Series[0].values;
          values.forEach((point: any) => {
            const d = new Date(point[0]);
            switch (query.metrics) {
              case 'bits_send':
              case 'bits_received':
              case 'latency':
              case 'packet_loss':
              case 'jitter':
                frame.appendRow([d.getTime(), point[1]]);
                break;
              case 'connStatusHistory':
                frame.appendRow([d.getTime(), (point[1] / (point[1] + point[2])) * 100]);
                break;
            }
          });
        } else {
          throw new Error('An error occurred: ' + res.body);
        }
        return frame;
      });
    });

    // Wait for all promises to resolve, the return all data
    return Promise.all(promises).then(data => {
      return { data };
    });
  }

  async testDatasource() {
    // Health check for the data source: GET /metrics/healthcheck
    return this.doRequest('/health/metrics').then((res: { status: number; body: string }) =>
      res.status === 200
        ? { status: 'success', message: 'OK', title: 'Success' }
        : { status: 'error', message: res.body, title: 'Error' }
    );
  }

  async doRequest(url: string) {
    var options = {
      url: this.url + url,
      withCredentials: this.withCredentials,
      headers: this.headers,
      method: 'GET',
    };
    const result = await this.backendSrv.datasourceRequest(options);
    return result;
  }
}
