package models

import (
	"encoding/json"
	"fmt"

	"github.com/go-resty/resty/v2"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

// Settings represents the Datasource options in Grafana
type DatasourceSettings struct {
	// Loaded from jsonData
	URI            string `json:"uri"`
	CachingEnabled bool   `json:"cachingEnabled"`

	// Loaded from root object
	URL    string
	APIKey string `json:"apiKey"`
	Client *resty.Client
}

// LoadSettings converts the DataSourceInLoadSettings to usable Github settings
func LoadSettings(settings backend.DataSourceInstanceSettings) (*DatasourceSettings, error) { //nolint
	str := fmt.Sprintf("--------- LoadSettings: %+v\n", settings)
	s := &DatasourceSettings{}
	err := json.Unmarshal(settings.JSONData, &s)
	if err != nil {
		return nil, fmt.Errorf("error reading settings: %s", err.Error())
	}
	client := resty.New()
	client.SetDebug(true)
	client.SetHostURL(s.URI)

	// Load from root object
	if val, ok := settings.DecryptedSecureJSONData["apiKey"]; ok {
		s.APIKey = val
		str += " - " + val
		client.SetAuthToken(val)
	}
	s.URL = settings.URL
	s.Client = client

	str = fmt.Sprintf("--------- LoadSettings: %+v\n", s)
	log.DefaultLogger.Info(str)

	return s, nil
}
