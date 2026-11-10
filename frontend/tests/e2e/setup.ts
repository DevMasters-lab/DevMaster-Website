import {execFileSync} from 'node:child_process';
import path from 'node:path';
export default async function setup(){const root=path.resolve(process.cwd(),'..');execFileSync(process.env.PHP_BINARY||'php',[path.join(root,'backend/tests/e2e-fixture.php'),path.join(root,'.runtime/e2e.json')],{cwd:root,env:{...process.env,APP_ENV:'testing',DB_DATABASE:'devmaster-website_test'},stdio:['ignore','ignore','pipe']});}
