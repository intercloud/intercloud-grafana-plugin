import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions /*, defaultQuery*/ } from './types';
//import defaults from 'lodash/defaults';

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
    const promises = options.targets.map(query => {
      const uri = `/metrics/query/irn/${query.irn}/${
        query.metrics
      }/run?start-d=${from.toISOString()}&end-d=${to.toISOString()}`;

      console.log('2');
      return this.doRequest(uri).then((res: any) => {
        console.log('3');
        const frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'time', type: FieldType.time },
            { name: 'value', type: FieldType.number },
          ],
        });
        if (res.status === 200) {
          const values = res.data.Results[0].Series[0].values;
          values.forEach((point: any) => {
            const d = new Date(point[0]);
            //frame.add({ time: d.getTime(), value: point[1] });
            frame.appendRow([d.getTime(), point[1]]);
          });
        } else {
          console.log('error ' + res.body);
        }
        console.log('RETURN FROM MAP');
        console.log(frame);
        return frame;
      });
    });

    return Promise.all(promises).then(data => {
      console.log('RETURN FROM PROMISES');
      console.log(data);
      return { data };
    });

    /*
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    const data = options.targets.map(target => {
      const query = defaults(target, defaultQuery);
      const frame = new MutableDataFrame({
        refId: query.refId,
        fields: [
          { name: 'time', type: FieldType.time },
          { name: 'value', type: FieldType.number },
        ],
      });
      // duration of the time range, in milliseconds.
      const duration = to - from;

      // step determines how close in time (ms) the points will be to each other.
      const step = duration / 1000;
      for (let t = 0; t < duration; t += step) {
        frame.add({ time: from + t, value: Math.sin((2 * Math.PI * t) / duration) });
      }
      console.log('RETURN FROM MAP');
      console.log(frame);
      return frame;
      
    });

    console.log('RETURN FROM QUERY');
    console.log(data);
    return { data };*/
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

  async doRequest(url: string) {
    var options = {
      url: this.url + url,
      withCredentials: this.withCredentials,
      headers: this.headers,
      method: 'GET',
    };
    console.log('2.5');
    //return this.backendSrv.datasourceRequest(options);
    const result = await this.backendSrv.datasourceRequest(options);
    return result;
  }
}
