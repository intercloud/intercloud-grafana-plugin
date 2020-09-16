package intercloud

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/go-resty/resty/v2"
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

	// create response struct
	response := backend.NewQueryDataResponse()

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res := md.query(ctx, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	return response, nil
}

type queryModel struct {
	Format string `json:"format"`
}

func (md *MetricsDatasource) query(ctx context.Context, query backend.DataQuery) backend.DataResponse { //nolint
	// Unmarshal the json into our queryModel
	var qm queryModel

	response := backend.DataResponse{}

	response.Error = json.Unmarshal(query.JSON, &qm)
	if response.Error != nil {
		return response
	}

	// Log a warning if `Format` is empty.
	if qm.Format == "" {
		log.DefaultLogger.Warn("format is empty. defaulting to time series")
	}

	// create data frame response
	frame := data.NewFrame("response")

	// add the time dimension
	frame.Fields = append(frame.Fields,
		data.NewField("time", nil, []time.Time{query.TimeRange.From, query.TimeRange.To}),
	)

	// add values
	frame.Fields = append(frame.Fields,
		data.NewField("values", nil, []int64{10, 20}),
	)

	// add the frames to the response
	response.Frames = append(response.Frames, frame)

	return response
}

func (md *MetricsDatasource) getInstance(ctx backend.PluginContext) (*instanceSettings, error) {
	s, err := md.im.Get(ctx)
	if err != nil {
		return nil, err
	}
	fmt.Printf("--------- getInstance: %+v\n", s)
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
	str := fmt.Sprintf("--------- CheckHealth: %+v\n", s)

	// todo get url from grafana from config editor (like token)
	log.DefaultLogger.Info(str)
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
		/*Header: map[string][]string{
			"Authorization": {"Bearer " + "xxx"},
		},*/
	}
	log.DefaultLogger.Info("** req ** " + req.URL.String())

	httpClient := &http.Client{}

	res, err := httpClient.Do(req)
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: "check health request error",
		}, err
	}
	defer res.Body.Close()
	log.DefaultLogger.Info("** res ** " + res.Status)

	if res.StatusCode != 200 {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: "wrong status code: " + res.Status,
		}, nil
	}

	return &backend.CheckHealthResult{
		Status:  status,
		Message: message,
	}, nil
}

/*
func makeHTTPRequest(ctx context.Context, httpClient *http.Client, req *http.Request) ([]byte, error) {
	res, err := ctxhttp.Do(ctx, httpClient, req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := ioutil.ReadAll(res.Body)

	if res.StatusCode != http.StatusOK {
		return body, fmt.Errorf("error status: %v", res.Status)
	}

	if err != nil {
		return nil, err
	}
	return body, nil
}
*/
type instanceSettings struct {
	token          string
	cachingEnabled bool
	uri            string
	client         *resty.Client
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
		client:         datasourceSettings.Client,
	}, nil
}

func (s *instanceSettings) Dispose() {
	// Called before creatinga a new instance to allow plugin authors
	// to cleanup.
}
