// Local manual acceptance only. Never prints environment values.
const fs=require('node:fs');const path=require('node:path');
const source=path.join(process.cwd(),'.env.production.local');
if(fs.existsSync(source))for(const line of fs.readFileSync(source,'utf8').split(/\r?\n/)){
 const match=/^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);if(!match)continue;
 if(!['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].includes(match[1]))continue;
 const raw=match[2];process.env[match[1]]=raw.startsWith('"')&&raw.endsWith('"')?JSON.parse(raw):raw;
}
if(require.main===module){const {spawn}=require('node:child_process');const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--port',process.argv[2]||'3001'],{stdio:'inherit',env:{...process.env,NODE_ENV:'development'}});child.on('exit',code=>process.exit(code??1));}
