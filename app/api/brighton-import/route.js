import h from '@/lib/brighton';
export async function POST(req){ const body=await req.json().catch(()=>({})); let code=200,out={}; const res={setHeader(){},status(c){code=c;return this},json(o){out=o;return this}}; await h({method:'POST',body},res); return Response.json(out,{status:code}); }
