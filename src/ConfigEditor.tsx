import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { InlineFormLabel, LegacyForms, Select } from '@grafana/ui';
import React, { ChangeEvent, FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { LoggedAs, MyDataSourceOptions, MySecureJsonData } from './types';
const { SecretFormField, Input: LegacyInput } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

const DefaultLabel = 'Default';

const apiUrl = (path = '') => `https://api-console.intercloud.io/${path}`;

export const ConfigEditor: FunctionComponent<Props> = ({ onOptionsChange, options }) => {
  const {
    secureJsonFields,
    jsonData: { organization },
  } = options;

  const { apiKey } = options.secureJsonData ?? {};

  const isConfigured = !!secureJsonFields.apiKey;
  const hasApiKey = !!apiKey;

  const [loggedAs, setLoggedAs] = useState<LoggedAs>();
  const defaultStateOrganization = organization && isConfigured ? [organization] : [];

  const [organizations, setOrganizations] = useState<Array<{ value: string; label: string }>>(defaultStateOrganization);

  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const getOrganizations = useCallback(async () => {
    const o = getBackendSrv()
      .fetch<Array<{ id: string; name: string }>>({
        url: apiUrl('organisations'),
        credentials: 'omit',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
      .toPromise()
      .then(({ data }) => {
        return data.map(({ id: value, name: label }) => ({ value, label }));
      });

    return await o;
  }, [apiKey]);

  const getLoggedAs = useCallback(async () => {
    return await getBackendSrv()
      .fetch<LoggedAs>({
        url: apiUrl('me/info'),
        credentials: 'omit',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        requestId: 'my-infos',
      })
      .toPromise();
  }, [apiKey]);

  useEffect(() => {
    const {
      secureJsonFields,
      secureJsonData,
      jsonData: { organization },
    } = optionsRef.current;

    if (!!secureJsonFields.apiKey || !secureJsonData?.apiKey) {
      return;
    }
    getLoggedAs()
      .then(({ data: logged }) => {
        setLoggedAs(logged);
        if (!organization) {
          onOptionsChange({
            ...optionsRef.current,
            jsonData: {
              ...optionsRef.current.jsonData,
              organization: {
                label: DefaultLabel,
                value: logged.organisationId,
              },
            },
          });
        }
      })
      .catch(() => {
        setLoggedAs(undefined);
        const { organization, ...jsonData } = optionsRef.current.jsonData;
        setOrganizations([]);
        onOptionsChange({
          ...optionsRef.current,
          jsonData,
        });
      });
  }, [getLoggedAs, onOptionsChange]);

  useEffect(() => {
    if (isConfigured || !hasApiKey) {
      return;
    }

    getOrganizations().then((o) => {
      let alls = [...o];
      if (loggedAs) {
        alls = [
          {
            label: DefaultLabel,
            value: loggedAs.organisationId,
          },
          ...alls,
        ];
      }
      setOrganizations(alls);
    });
  }, [getOrganizations, loggedAs, isConfigured, hasApiKey]);

  // Secure field (only sent to the backend)
  const onAPIKeyChange = useCallback(
    ({ target: { value: apiKey } }: ChangeEvent<HTMLInputElement>) => {
      onOptionsChange({
        ...optionsRef.current,
        secureJsonData: {
          ...optionsRef.current.secureJsonData,
          apiKey,
        },
      });
    },
    [onOptionsChange]
  );

  const onResetAPIKey = useCallback(() => {
    const { organization, ...jsonData } = optionsRef.current.jsonData;
    onOptionsChange({
      ...optionsRef.current,
      jsonData,
      secureJsonFields: {
        ...optionsRef.current.secureJsonFields,
        apiKey: false,
      },
      secureJsonData: {
        ...optionsRef.current.secureJsonData,
        apiKey: '',
      },
    });
    setOrganizations([]);
  }, [onOptionsChange, setOrganizations]);

  const onOrganizationChange = useCallback(
    (organization) => {
      onOptionsChange({
        ...optionsRef.current,
        jsonData: {
          ...optionsRef.current.jsonData,
          organization,
        },
      });
    },
    [onOptionsChange]
  );

  return (
    <div className="gf-form-group">
      <div className="gf-form-inline">
        <div className="gf-form">
          <SecretFormField
            isConfigured={isConfigured}
            value={apiKey ?? ''}
            label="API Key"
            placeholder="Enter your personal access token"
            labelWidth={10}
            inputWidth={20}
            onReset={onResetAPIKey}
            onChange={onAPIKeyChange}
          />
        </div>
      </div>

      <div className="gf-form-inline">
        <div className="gf-form" aria-disabled={isConfigured}>
          <InlineFormLabel className="width-10" tooltip="Select organization">
            Organization
          </InlineFormLabel>
          <div className="width-20">
            {isConfigured ? (
              <LegacyInput aria-invalid type="text" disabled={true} value={organization?.label} />
            ) : (
              <Select
                className="width-20"
                value={organization?.value ?? organizations.find(({ label }) => label === DefaultLabel)?.value}
                onChange={onOrganizationChange}
                options={organizations}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
