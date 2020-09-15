# InterCloud Grafana Data Source Plugin

This plugin provides a Grafana Data Source to show InterCloud's services metrics from the REST API.

## Quick Test

### 1. Environment and tools

You need a node engine version ">=12 <13". You can use [nvm](https://github.com/nvm-sh/nvm) to manage different version.
You also will need [yarn](https://yarnpkg.com/) to build the data source plugin.
Then, you will need [mage](https://magefile.org/) to build the backend plugin.

To install and build the plugin:

```BASH
mkdir grafana-plugins
cd grafana-plugins
git clone https://github.com/intercloud/intercloud-grafana-plugin.git
cd intercloud-grafana-plugin
yarn install
yarn build
mage -v
```

### 2. Run a local grafana with InterCloud's plugin

This commands will execute plugin without signature for development purpose.
.
```BASH
mkdir grafana-plugins
cd grafana-plugins
git clone https://github.com/intercloud/intercloud-grafana-plugin.git
docker run -d -p 3000:3000 -v <path_to_grafana-plugins_directory>:/var/lib/grafana/plugins \
    -e "GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=intercloud-grafana-datasource" --name=grafana grafana/grafana:7.0.0
```

Then open your browser on http://localhost:3000 (use admin/admin as default credentials, you can change it after login).

Add the InterCloud Data Source (See https://grafana.com/docs/grafana/latest/features/datasources/add-a-data-source/) and configure you `API Key` to make grafana access InterCloud API (You can create an [InterCloud portal Personal Access Token](https://doc.intercloud.io/api-howtos/authentication/personal-access-token/) to be used as Grafana `API Key`)

> To minimize the amount of sensitive information sent to and from the browser, data source plugins can use the Grafana data source proxy. When using the data source proxy, any requests containing sensitive information go through the Grafana server. No sensitive data is sent to the browser after the data is saved.

Press `Save & Test` button.

### 3. Create panel

Go to `+ > Create > Dashboard` and Add a new panel.
Fill the query information with the [IRN](https://doc.intercloud.io/api-howtos/metrics/) of the service you want to retrieve metrics (e.g. `irn:connectors:skstok62tbks::p0q4dy`) and the metrics name (e.g. `bits_received`)

You can add more than one query per panel (e.g. `bits_send` and `bits_received`) and change the panel title.

You can find a list of available metrics per service in the [InterCloud documentation](https://doc.intercloud.io/api-howtos/metrics/).

![](assets/panel.png)

## Metrics types currently supported

### Connectors
* `bits_send`
* `bits_received`
* `connStatusHistory`

### Links
* `latency`
* `packet_loss`
* `jitter`

## Getting started with development for the plugin

### 1. Install dependencies

```BASH
yarn install
```

### 2. Build plugin in development mode or run in watch mode
```BASH
yarn dev
```
or
```BASH
yarn watch
```

### 3. Build plugin in production mode
```BASH
yarn build
```

## Todo

* Signature verification
* Support status measures
* Add alerting support (backend plugin)
* Add annotations support

## Learn more
- [InterCloud Portal and API Documentation](https://doc.intercloud.io)
- [Grafana documentation](https://grafana.com/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/) - Grafana Tutorials are step-by-step guides that help you make the most of Grafana
