import type { App } from '../lib/App.js';
import type { Integration } from '../lib/Integration.js';
import { db } from '../db/database.js';
import { codedError } from '../lib/utils.js';
import { loadIntegration } from './integrationService.js';

const supportedAppNames = ['outlook'];

export function getApps() {
  return db.selectFrom('s4p.apps').select(['id', 'name', 'ui_name'])
    .where('name', 'in', supportedAppNames).orderBy('ui_name').execute();
}

export async function loadApp(appId: string): Promise<App> {
  const record = await db.selectFrom('s4p.apps').select(['name', 'integration_id'])
    .where('id', '=', appId).executeTakeFirst();
  if (!record) throw codedError('UI_ERROR', 'App not found.');
  if (!supportedAppNames.includes(record.name)) throw codedError('UI_ERROR', 'This app is not supported yet.');

  let module: { default: new (integration: Integration) => App };
  try {
    const extension = import.meta.url.endsWith('.ts') ? 'ts' : 'js';
    module = await import(`../apps/${record.name}/${record.name}.${extension}`);
  } catch {
    throw codedError('APP_LOAD_FAILED', `Unable to load app module: ${record.name}.`);
  }
  return new module.default(await loadIntegration(record.integration_id));
}
