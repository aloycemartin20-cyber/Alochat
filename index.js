const corsHeaders = (origin, env) => {
  const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map(x => x.trim());
  const allow = allowed.includes("*") || allowed.includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
};
function json(data, status, headers) {
  return new Response(JSON.stringify(data), {status, headers:{...headers,"Content-Type":"application/json; charset=utf-8"}});
}
export default {
 async fetch(request, env) {
  const origin=request.headers.get("Origin")||"*";
  const cors=corsHeaders(origin,env);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  const url=new URL(request.url);
  if(url.pathname==="/health")return json({ok:true,service:"ALOCHAT API",time:new Date().toISOString()},200,cors);
  if(url.pathname==="/api/models"&&request.method==="GET"){
   if(!env.OPENROUTER_API_KEY)return json({error:"OPENROUTER_API_KEY secret is missing"},500,cors);
   const r=await fetch("https://openrouter.ai/api/v1/models",{headers:{Authorization:`Bearer ${env.OPENROUTER_API_KEY}`}});
   return new Response(r.body,{status:r.status,headers:{...cors,"Content-Type":"application/json"}});
  }
  if(url.pathname==="/api/chat"&&request.method==="POST"){
   if(!env.OPENROUTER_API_KEY)return json({error:"Server setup incomplete: OPENROUTER_API_KEY secret is missing."},500,cors);
   let body;try{body=await request.json();}catch{return json({error:"Invalid JSON body"},400,cors);}
   if(!Array.isArray(body.messages)||!body.messages.length)return json({error:"messages array is required"},400,cors);
   if(body.messages.length>60)return json({error:"Too many messages in one request"},413,cors);
   const messages=body.messages.map(m=>({role:m.role==="assistant"?"assistant":"user",content:String(m.content||"").slice(0,12000)}));
   const language=({sw:"Kiswahili",en:"English",fr:"French",es:"Spanish"})[body.language];
   const system="You are Alochat, a helpful, honest and friendly AI assistant created by ALOYCE GAMING CO. Answer clearly and accurately. If unsure, say so. Do not invent facts. "+(language?`Reply in ${language} unless the user explicitly requests another language.`:"Reply in the language used by the user.");
   const payload={model:String(body.model||"openrouter/auto"),stream:true,messages:[{role:"system",content:system},...messages]};
   const upstream=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${env.OPENROUTER_API_KEY}`,"Content-Type":"application/json","HTTP-Referer":env.SITE_URL||"https://github.com/","X-Title":"ALOCHAT"},body:JSON.stringify(payload)});
   if(!upstream.ok){const detail=await upstream.text();return new Response(detail,{status:upstream.status,headers:{...cors,"Content-Type":"application/json"} });}
   const headers=new Headers(cors);headers.set("Content-Type","text/event-stream; charset=utf-8");headers.set("Cache-Control","no-cache, no-transform");headers.set("Connection","keep-alive");
   return new Response(upstream.body,{status:200,headers});
  }
  return json({error:"Not found"},404,cors);
 }
};