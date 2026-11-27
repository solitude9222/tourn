/** Period rankings use recorded visits; lifetime counters are never backfilled into history. */
export async function leaderboard(pool,{sort='views',period='all',limit=25,offset=0}={}){
 const days=sort==='likes'?null:period==='7d'?7:period==='30d'?30:null;
 const size=Math.min(100,Math.max(1,parseInt(limit,10)||25)),skip=Math.max(0,parseInt(offset,10)||0);
 const metric=sort==='likes'?'likes':'views';
 const base=`with visits as (
  select username,count(*) filter(where created_at>=now()-$1::int*interval '1 day')::int current_views,
  count(*) filter(where created_at<now()-$1::int*interval '1 day' and created_at>=now()-($1::int*2)*interval '1 day')::int previous_views
  from profile_view_events where $1::int is not null and created_at>=now()-($1::int*2)*interval '1 day' group by username
 ), reactions as(select username,count(*) filter(where kind='like')::int likes from profile_reactions group by username),
 base as(select u.username,u.alias,u.avatar_url,u.created_at,case when $1::int is null then coalesce(v.views,0)::int else coalesce(h.current_views,0) end views,
 coalesce(r.likes,0)::int likes,coalesce(h.previous_views,0)::int previous_views from users u left join profile_views v on v.username=u.username left join visits h on h.username=u.username left join reactions r on r.username=u.username),
 previous as(select username,row_number() over(order by previous_views desc,created_at,username)::int rank from base where previous_views>0),
 ranked as(select *,row_number() over(order by ${metric} desc,created_at,username)::int rank from base where $1::int is null or views>0)`;
 const {rows}=await pool.query(base+` select ranked.*,previous.rank previous_rank,(select count(*)::int from ranked) total,
 (select min(created_at)<=now()-($1::int*2)*interval '1 day' from profile_view_events) history_complete
 from ranked left join previous using(username) order by ranked.rank limit $2 offset $3`,[days,size,skip]);
 let total=rows[0]?.total;if(total===undefined){const counted=await pool.query(base+' select count(*)::int total from ranked',[days]);total=counted.rows[0]?.total||0;}
 return {period:days?`${days}d`:'all',total:Number(total),profiles:rows.map(row=>({username:row.username,handle:row.alias||row.username,displayName:row.alias||null,avatarUrl:row.avatar_url||null,views:Number(row.views),likes:Number(row.likes),rankChange:days&&row.history_complete&&row.previous_rank?Number(row.previous_rank)-Number(row.rank):null}))};
}
