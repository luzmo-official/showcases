import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const baseEnv = {
  WHATSAPP_ACCESS_TOKEN: 'token',
  WHATSAPP_PHONE_NUMBER_ID: '123',
  WHATSAPP_VERIFY_TOKEN: 'verify',
  WHATSAPP_APP_SECRET: 'secret',
  LUZMO_API_KEY: '00000000-0000-4000-8000-000000000001',
  LUZMO_API_TOKEN: 'luzmo-token',
  LUZMO_DATASET_ID: '11111111-1111-4111-8111-111111111111',
  LUZMO_TENANT_COLUMN_ID: 'tenant-col',
};

describe('loadConfig', () => {
  it('treats empty LUZMO_THEME_ID as unset', () => {
    const config = loadConfig({
      ...baseEnv,
      LUZMO_THEME_ID: '',
    } as NodeJS.ProcessEnv);
    expect(config.LUZMO_THEME_ID).toBeUndefined();
    expect(config.chartTheme).toBeUndefined();
  });

  it('accepts a theme id', () => {
    const config = loadConfig({
      ...baseEnv,
      LUZMO_THEME_ID: '  vivid  ',
    } as NodeJS.ProcessEnv);
    expect(config.chartTheme).toEqual({ id: 'vivid' });
  });

  it('defaults to sqlite storage', () => {
    const config = loadConfig({ ...baseEnv } as NodeJS.ProcessEnv);
    expect(config.STORAGE_BACKEND).toBe('sqlite');
    expect(config.SQLITE_PATH).toBe('./data/whatsapp-analyst.sqlite');
  });

  it('requires DYNAMODB_TABLE_NAME for dynamodb backend', () => {
    expect(() =>
      loadConfig({
        ...baseEnv,
        STORAGE_BACKEND: 'dynamodb',
      } as NodeJS.ProcessEnv)
    ).toThrow(/DYNAMODB_TABLE_NAME/);
  });

  it('accepts dynamodb backend with table name', () => {
    const config = loadConfig({
      ...baseEnv,
      STORAGE_BACKEND: 'dynamodb',
      DYNAMODB_TABLE_NAME: 'whatsapp-analyst',
      AWS_REGION: 'eu-west-1',
    } as NodeJS.ProcessEnv);
    expect(config.STORAGE_BACKEND).toBe('dynamodb');
    expect(config.DYNAMODB_TABLE_NAME).toBe('whatsapp-analyst');
  });
});
