package models

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// Settings represents the Datasource options in Grafana
type DatasourceSettings struct {
	// Loaded from jsonData
	URI            string `json:"uri"`
	CachingEnabled bool   `json:"cachingEnabled"`

	// Loaded from root object
	URL    string
	APIKey string `json:"apiKey"`
}

// LoadSettings converts the DataSourceInLoadSettings to usable Github settings
func LoadSettings(settings backend.DataSourceInstanceSettings) (*DatasourceSettings, error) { //nolint
	s := &DatasourceSettings{}
	err := json.Unmarshal(settings.JSONData, &s)
	if err != nil {
		return nil, fmt.Errorf("error reading settings: %s", err.Error())
	}

	// Load from root object
	if val, ok := settings.DecryptedSecureJSONData["apiKey"]; ok {
		s.APIKey = val
	}
	s.URL = settings.URL

	return s, nil
}
