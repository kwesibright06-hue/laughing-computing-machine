const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = process.env.PORT || 10000;
const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
const CACHE = new Map();
const TTL = 10 * 60 * 1000;
const GENRES = {
  28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",
  18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",
  9648:"Mystery",10749:"Romance",878:"Sci-Fi",10770:"TV Movie",53:"Thriller",
  10752:"War",37:"Western",10759:"Action",10762:"Family",10763:"News",10764:"Reality",
  10765:"Sci-Fi",10766:"Drama",10767:"Talk",10768:"War"
};
function send(res, status, data) {
  res.writeHead(status, {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});
  res.end(JSON.stringify(data));
}
function cached(key, fn) {
  const old = CACHE.get(key);
  if (old && Date.now() - old.time < TTL) return Promise.resolve(old.value);
  return fn().then(value => { CACHE.set(key,{time:Date.now(),value}); return value; });
}
async function tmdb(endpoint) {
  if (!TOKEN) throw new Error("TMDB_READ_ACCESS_TOKEN is not set");
  const response = await fetch("https://api.themoviedb.org/3" + endpoint, {
    headers: { Authorization: "Bearer " + TOKEN, accept: "application/json" }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error("TMDB request failed (" + response.status + "): " + body.slice(0,180));
  }
  return response.json();
}
function regionCode(v) {
  const s = String(v || "GH").toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : "GH";
}
function mediaResults(data, type) {
  return (data.results || []).map(x => ({...x, media_type: x.media_type || type}));
}
async function catalog(region) {
  return cached("catalog:"+region, async () => {
    const [trending, movies, shows] = await Promise.all([
      tmdb("/trending/all/week?language=en-US"),
      tmdb("/movie/popular?region="+region+"&language=en-US&page=1"),
      tmdb("/tv/popular?language=en-US&page=1")
    ]);
    let all = [
      ...mediaResults(trending,"movie"),
      ...mediaResults(movies,"movie"),
      ...mediaResults(shows,"tv")
    ];
    const seen = new Set();
    all = all.filter(x => {
      const k = x.media_type+":"+x.id;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    }).slice(0,48);
    // Ask TMDB for current regional watch-provider data for a small initial batch.
    const first = await Promise.all(all.slice(0,18).map(async item => {
      try {
        const route = item.media_type === "tv" ? "/tv/" : "/movie/";
        const p = await tmdb(route+item.id+"/watch/providers");
        const offers = p.results && p.results[region];
        const names = offers ? [...(offers.flatrate||[]),...(offers.free||[]),...(offers.ads||[]),...(offers.rent||[]),...(offers.buy||[])] : [];
        item.providers = [...new Set(names.map(n=>n.provider_name))];
      } catch (_) { item.providers = []; }
      return item;
    }));
    return [...first,...all.slice(18)];
  });
}
async function handler(req,res) {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/health") return send(res,200,{ok:true,tokenConfigured:!!TOKEN,regionDefault:"GH"});
  try {
    if (url.pathname === "/api/catalog") {
      const region=regionCode(url.searchParams.get("region"));
      return send(res,200,{region,results:await catalog(region),genres:GENRES});
    }
    if (url.pathname === "/api/search") {
      const q=(url.searchParams.get("q")||"").trim();
      const region=regionCode(url.searchParams.get("region"));
      if (q.length < 2) return send(res,200,{region,results:[]});
      const data=await cached("search:"+region+":"+q.toLowerCase(),()=>tmdb("/search/multi?query="+encodeURIComponent(q)+"&include_adult=false&language=en-US&page=1"));
      return send(res,200,{region,results:(data.results||[]).filter(x=>["movie","tv"].includes(x.media_type)).slice(0,30)});
    }
    if (url.pathname === "/api/providers") {
      const id=Number(url.searchParams.get("id"));
      const type=url.searchParams.get("type")==="tv"?"tv":"movie";
      const region=regionCode(url.searchParams.get("region"));
      if (!Number.isInteger(id)||id<1) return send(res,400,{error:"A valid title ID is required"});
      const data=await cached("providers:"+type+":"+id+":"+region,()=>tmdb("/"+type+"/"+id+"/watch/providers"));
      const regionData=data.results&&data.results[region];
      const providers=regionData ? [...(regionData.flatrate||[]),...(regionData.free||[]),...(regionData.ads||[]),...(regionData.rent||[]),...(regionData.buy||[])] : [];
      const unique=[...new Map(providers.map(p=>[p.provider_id,p])).values()].map(p=>({name:p.provider_name,link:regionData.link||"https://www.themoviedb.org/"}));
      return send(res,200,{region,type,id,providers:unique,source:"TMDB watch-provider data"});
    }
    if (url.pathname.startsWith("/api/")) return send(res,404,{error:"API endpoint not found"});
    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const file = path.join(__dirname, requested.replace(/^\/+/,""));
    if (!file.startsWith(__dirname)) return send(res,403,{error:"Forbidden"});
    fs.readFile(file,(err,body)=>{
      if(err) return send(res,404,{error:"Not found"});
      const ext=path.extname(file);
      const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml"};
      res.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream"});
      res.end(body);
    });
  } catch (error) {
    console.error(error.message);
    send(res,500,{error: TOKEN ? "Catalog provider request failed. Check your TMDB token and try again." : "Add TMDB_READ_ACCESS_TOKEN in the hosting environment to enable live movie data."});
  }
}
http.createServer(handler).listen(PORT,()=>console.log("STREAMORA listening on "+PORT));
