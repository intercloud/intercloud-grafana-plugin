import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  DataFrameDTO,
  FieldType,
} from '@grafana/data';
import { getBackendSrv, FetchResponse } from '@grafana/runtime';
import { MyQuery, MyDataSourceOptions, InfluxResponse } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url: string;
  headers: Record<string, string> = { 'Content-Type': 'application/json' };
  basicAuth: string;
  withCredentials: boolean;
  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    const { url, withCredentials, basicAuth } = instanceSettings;
    this.url = url ?? '';
    this.withCredentials = !!withCredentials;

    if (basicAuth?.length) {
      this.headers = { ...this.headers, Authorization: basicAuth };
    }
    this.basicAuth = basicAuth ?? '';
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = new Date(range!.from.valueOf());
    const to = new Date(range!.to.valueOf());

    // For each query, create a promise
    const promises = options.targets.map(async ({ irn, metric, refId }) => {
      const uri = `/metrics/query/irn/${irn}/${metric}/run?start-d=${from.toISOString()}&end-d=${to.toISOString()}`;

      const res = await this.doRequest<InfluxResponse>(uri);
      const frame: DataFrameDTO = {
        refId,
        fields: [
          { name: 'time', type: FieldType.time },
          { name: res.data.measure, type: FieldType.number },
        ],
      };
      const helper = new MutableDataFrame(frame);
      if (res.status === 200) {
        const values = res.data?.Results?.[0]?.Series?.[0]?.values || [];
        values.forEach(([timeS, val1, val2]: [string, number, number] | [string, number]) => {
          const d = new Date(timeS);
          const v = val2 ?? false;
          if (v !== false && val1 + v !== 0) {
            helper.appendRow([d.getTime(), (val1 / (val1 + v)) * 100]);
          } else {
            helper.appendRow([d.getTime(), val1]);
          }
        });
      } else {
        throw new Error('An error occurred: ' + res.data);
      }
      return helper;
    });

    // Wait for all promises to resolve, the return all data
    return Promise.all(promises).then((data) => {
      return { data };
    });
  }

  async testDatasource() {
    // Health check for the data source: GET /metrics/healthcheck
    return this.doRequest<{ status: number; body: string }>(
      '/health/metrics'
    ).then(({ status, data: { body: message } }) =>
      status === 200
        ? { status: 'success', message: 'OK', title: 'Success' }
        : { status: 'error', message, title: 'Error' }
    );
  }

  async doRequest<T extends Record<string, unknown> | Array<Record<string, unknown>>>(
    url: string
  ): Promise<FetchResponse<T>> {
    var options = {
      url: this.url + url,
      withCredentials: this.withCredentials,
      headers: this.headers,
      method: 'GET',
    };

    return await getBackendSrv().fetch<T>(options).toPromise();
  }
}
