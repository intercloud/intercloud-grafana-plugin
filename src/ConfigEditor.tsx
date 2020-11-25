import React, { ChangeEvent, FunctionComponent, useCallback } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from './types';

const { SecretFormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

export const ConfigEditor: FunctionComponent<Props> = ({ onOptionsChange, options }) => {
  // Secure field (only sent to the backend)
  const onAPIKeyChange = useCallback(
    ({ target: { value: apiKey } }: ChangeEvent<HTMLInputElement>) => {
      onOptionsChange({
        ...options,
        secureJsonData: {
          ...options.secureJsonData,
          apiKey,
        },
      });
    },
    [onOptionsChange, options]
  );

  const onResetAPIKey = useCallback(() => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        apiKey: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        apiKey: '',
      },
    });
  }, [onOptionsChange, options]);

  const { secureJsonFields } = options;
  const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;

  return (
    <div className="gf-form-group">
      <div className="gf-form-inline">
        <div className="gf-form">
          <SecretFormField
            isConfigured={!!secureJsonFields?.apiKey}
            value={secureJsonData?.apiKey ?? ''}
            label="API Key"
            placeholder="Enter your personal access token"
            labelWidth={6}
            inputWidth={20}
            onReset={onResetAPIKey}
            onChange={onAPIKeyChange}
          />
        </div>
      </div>
    </div>
  );
};
