package intercloud

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/intercloud/intercloud-grafana-plugin/pkg/models"
)

// MetricsDatasource is an example datasource used to scaffold
// new datasource plugins with an backend.
type MetricsDatasource struct {
	// The instance manager can help with lifecycle management
	// of datasource instances in plugins. It's not a requirements
	// but a best practice that we recommend that you follow.
	im instancemgmt.InstanceManager
}

// NewDatasource returns datasource.ServeOpts.
func NewMetricsDatasource() datasource.ServeOpts {
	// creates a instance manager for your plugin. The function passed
	// into `NewInstanceManger` is called when the instance is created
	// for the first time or when a datasource configuration changed.
	im := datasource.NewInstanceManager(newDataSourceInstance)
	ds := &MetricsDatasource{
		im: im,
	}
	return datasource.ServeOpts{
		QueryDataHandler:   ds,
		CheckHealthHandler: ds,
	}
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (md *MetricsDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	log.DefaultLogger.Info("QueryData", "request", req)
	var err error

	// create response struct
	response := backend.NewQueryDataResponse()

	s, err := md.getInstance(req.PluginContext)
	if err != nil {
		return response, err
	}

	log.DefaultLogger.Info("query", "uri", s.uri)

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res, err := md.query(ctx, q, s.uri, s.token)
		if err != nil {
			log.DefaultLogger.Error("QueryData", "error", err.Error())
			continue
		}

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	return response, nil
}

type queryModel struct {
	Format        string `json:"format"`
	Metrics       string `json:"metrics"`
	IRN           string `json:"irn"`
	OrgID         uint32 `json:"orgId"`
	RefID         string `json:"refId"`
	MaxDataPoints uint32 `json:"maxDataPoints"`
	DatasourceID  uint32 `json:"datasourceId"`
	Datasource    string `json:"datasource"`
}

type queryResult struct {
	Type    string `json:"type"`
	Measure string `json:"measure"`
	Axis    struct {
		NonNegativeDerivative struct {
			Unit  string `json:"unit"`
			Title string `json:"title"`
		} `json:"non_negative_derivative"`
	} `json:"axis"`
	Results []struct {
		Series []struct {
			Name    string          `json:"name"`
			Columns []string        `json:"columns"`
			Values  [][]interface{} `json:"values"`
		} `json:"Series"`
		Messages interface{} `json:"Messages"`
	} `json:"Results"`
}

func (md *MetricsDatasource) query(ctx context.Context, query backend.DataQuery, uri, token string) (backend.DataResponse, error) { //nolint
	// Unmarshal the json into our queryModel
	var qm queryModel
	var qr queryResult
	var err error
	var response backend.DataResponse

	timeRange := query.TimeRange
	intervale := query.Interval

	log.DefaultLogger.Info("query", "query", query)
	log.DefaultLogger.Info("query", "timeRange", timeRange)
	log.DefaultLogger.Info("query", "intervale", intervale)

	err = json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return response, err
	}

	// Log a warning if `Format` is empty.
	if qm.Format == "" {
		log.DefaultLogger.Warn("format is empty. defaulting to time series")
	}

	from := timeRange.From.UTC().Format(time.RFC3339)
	to := timeRange.To.UTC().Format(time.RFC3339)
	endpoint := fmt.Sprintf("%s/metrics/query/irn/%s/%s/run?start-d=%s&end-d=%s", uri, qm.IRN, qm.Metrics, from, to)
	log.DefaultLogger.Info("query", "url", endpoint)

	requestURL, err := url.Parse(endpoint)
	if err != nil {
		return response, err
	}

	req := &http.Request{
		Method: "GET",
		URL:    requestURL,
		Header: map[string][]string{
			"Authorization": {"Bearer " + token},
		},
	}

	httpClient := &http.Client{}

	res, err := httpClient.Do(req)
	if err != nil {
		return response, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return response, err
	}

	// decode result from API
	err = json.NewDecoder(res.Body).Decode(&qr)
	if err != nil {
		return response, err
	}

	// create data frame response
	frame := data.NewFrame("response")

	var metricsTimestamps []time.Time
	var metricsValues []float64

	values := qr.Results[0].Series[0].Values
	for _, point := range values {
		ts, err := time.Parse(time.RFC3339, point[0].(string))
		if err != nil {
			log.DefaultLogger.Error("unable to parse time " + point[0].(string) + " : " + err.Error())
		}
		metricsTimestamps = append(metricsTimestamps, ts)
		switch qm.Metrics {
		case "bits_send":
			metricsValues = append(metricsValues, point[1].(float64))
		case "bits_received":
			metricsValues = append(metricsValues, point[1].(float64))
		case "latency":
			metricsValues = append(metricsValues, point[1].(float64))
		case "packet_loss":
			metricsValues = append(metricsValues, point[1].(float64))
		case "jitter":
			metricsValues = append(metricsValues, point[1].(float64))
		case "connStatusHistory":
			nbPointsOK := point[1].(float64)
			nbPointsKO := point[2].(float64)
			metricsValues = append(metricsValues, (nbPointsOK/(nbPointsOK+nbPointsKO))*100)
		}
	}

	// add the time dimension
	frame.Fields = append(frame.Fields,
		data.NewField("time", nil, metricsTimestamps),
	)
	// add values
	frame.Fields = append(frame.Fields,
		data.NewField("values", nil, metricsValues),
	)

	// add the frames to the response
	response.Frames = append(response.Frames, frame)

	return response, nil
}

func (md *MetricsDatasource) getInstance(ctx backend.PluginContext) (*instanceSettings, error) {
	s, err := md.im.Get(ctx)
	if err != nil {
		return nil, err
	}
	return s.(*instanceSettings), nil
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (md *MetricsDatasource) CheckHealth(ctx context.Context, chReq *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	var status = backend.HealthStatusOk
	var message = "Data source is working"

	s, err := md.getInstance(chReq.PluginContext)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: "parse url error",
		}, err
	}

	// todo get url from grafana from config editor (like token)
	requestURL, err := url.Parse(s.uri + "/health/metrics")
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: "parse url error",
		}, err
	}

	req := &http.Request{
		Method: "GET",
		URL:    requestURL,
		Header: map[string][]string{
			"Authorization": {"Bearer " + s.token},
		},
	}

	httpClient := &http.Client{}

	res, err := httpClient.Do(req)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: "check health request error",
		}, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: "error: " + res.Status,
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  status,
		Message: message,
	}, nil
}

type instanceSettings struct {
	token          string
	cachingEnabled bool
	uri            string
}

func newDataSourceInstance(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) { //nolint
	datasourceSettings, err := models.LoadSettings(settings)
	if err != nil {
		return nil, fmt.Errorf("error reading settings: %s", err.Error())
	}

	return &instanceSettings{
		cachingEnabled: datasourceSettings.CachingEnabled,
		token:          datasourceSettings.APIKey,
		uri:            datasourceSettings.URI,
	}, nil
}

func (s *instanceSettings) Dispose() {
	// Called before creatinga a new instance to allow plugin authors
	// to cleanup.
}
