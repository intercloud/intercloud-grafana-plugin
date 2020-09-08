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
    const from = new Date(range!.from.valueOf());
    const to = new Date(range!.to.valueOf());

    console.log('1');
    // For each query...
    const promises = options.targets.map(target => {
      const query = defaults(target, defaultQuery);
      const uri = `/metrics/query/irn/${query.irn}/${
        query.metrics
      }/run?start-d=${from.toISOString()}&end-d=${to.toISOString()}`;

      console.log('2');
      this.doRequest(uri).then((res: any) => {
        console.log('3');
        const frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'time', type: FieldType.time },
            { name: 'value', type: FieldType.number },
          ],
        });
        console.log(res);
        if (res.status === 200) {
          const values = res.data.Results[0].Series[0].values;
          values.forEach((point: any) => {
            const d = new Date(point[0]);
            frame.add({ time: d.getTime(), value: point[1] });
            //frame.appendRow([d.getTime(), point[1]]);
          });
        } else {
          console.log('error ' + res.body);
        }
        console.log('RETURN FROM REQUEST');
        console.log(frame);
        return frame;
      });
    });

    return Promise.all(promises).then(data => ({ data }));
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
    console.log('2.5');
    return this.backendSrv.datasourceRequest(options);
  }
}
