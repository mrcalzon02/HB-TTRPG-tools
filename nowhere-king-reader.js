(() => {
'use strict';

const ROOT_API='https://api.github.com/repos/mrcalzon02/HB-TTRPG-tools/contents/docs/nowhere-king/episodes?ref=main';
const SEASON_RE=/^season-(\d+)$/i;
const EPISODE_RE=/^(\d+(?:\.\d+)?)-(.+)\.md$/i;
const SMALL_WORDS=new Set(['a','an','and','as','at','but','by','for','from','in','of','on','or','the','to','with','without']);
const FALLBACK=[
  {name:'01-CROWN-WITHOUT-COURT.md',path:'docs/nowhere-king/episodes/season-01/01-CROWN-WITHOUT-COURT.md',type:'file',season:1},
  {name:'02-PACKING-THE-MONARCHY.md',path:'docs/nowhere-king/episodes/season-01/02-PACKING-THE-MONARCHY.md',type:'file',season:1}
];

const byId=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function titleFromSlug(slug){
  return slug.split('-').map((word,index)=>{
    const lower=word.toLowerCase();
    if(index>0&&SMALL_WORDS.has(lower))return lower;
    return lower.charAt(0).toUpperCase()+lower.slice(1);
  }).join(' ');
}
function inlineMarkdown(text){
  let value=esc(text);
  value=value.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  value=value.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g,'$1<em>$2</em>');
  value=value.replace(/`([^`]+)`/g,'<code>$1</code>');
  return value;
}
function renderMarkdown(markdown){
  const lines=markdown.replace(/\r\n?/g,'\n').split('\n');
  const out=[];
  let paragraph=[],listType=null,listItems=[];
  const flushParagraph=()=>{if(paragraph.length){out.push('<p>'+inlineMarkdown(paragraph.join(' '))+'</p>');paragraph=[]}};
  const flushList=()=>{if(listType){out.push('<'+listType+'>'+listItems.map(item=>'<li>'+inlineMarkdown(item)+'</li>').join('')+'</'+listType+'>');listType=null;listItems=[]}};
  const flush=()=>{flushParagraph();flushList()};
  for(const raw of lines){
    const line=raw.trimEnd();
    if(!line.trim()){flush();continue}
    if(/^---+$/.test(line.trim())){flush();out.push('<hr>');continue}
    const heading=line.match(/^(#{1,6})\s+(.+)$/);
    if(heading){flush();const level=Math.min(6,heading[1].length);out.push('<h'+level+'>'+inlineMarkdown(heading[2])+'</h'+level+'>');continue}
    if(line.startsWith('> ')){flush();out.push('<blockquote><p>'+inlineMarkdown(line.slice(2))+'</p></blockquote>');continue}
    const ul=line.match(/^\s*[-*]\s+(.+)$/);
    if(ul){flushParagraph();if(listType&&listType!=='ul')flushList();listType='ul';listItems.push(ul[1]);continue}
    const ol=line.match(/^\s*\d+[.)]\s+(.+)$/);
    if(ol){flushParagraph();if(listType&&listType!=='ol')flushList();listType='ol';listItems.push(ol[1]);continue}
    flushList();paragraph.push(line.trim());
  }
  flush();
  return out.join('\n');
}
function activatePanel(id,updateHash=true){
  const panels=[...document.querySelectorAll('[data-story-tab-panel]')];
  const tabs=[...document.querySelectorAll('[data-story-panel]')];
  if(!panels.some(panel=>panel.id===id))id='chapter-index';
  panels.forEach(panel=>panel.hidden=panel.id!==id);
  tabs.forEach(tab=>{
    const active=tab.dataset.storyPanel===id;
    tab.classList.toggle('is-active',active);
    tab.setAttribute('aria-selected',active?'true':'false');
  });
  if(updateHash){
    const target=id==='story-bible'?'#story-bible':'#chapter-index';
    history.replaceState(null,'',location.pathname+location.search+target);
  }
}
function archiveShell(){
  const section=byId('chapter-index');
  if(!section)return null;
  const list=byId('chapter-index-list');
  const state=byId('chapter-index-state');
  const layout=document.createElement('div');
  layout.className='chapter-archive-layout';

  const toc=document.createElement('aside');
  toc.className='chapter-toc';
  toc.setAttribute('aria-label','Episode index');
  toc.innerHTML='<div class="chapter-toc-heading">Episode Index</div><label class="chapter-filter" for="chapter-filter"><span>Find an episode</span><input id="chapter-filter" type="search" placeholder="Season, episode, or title" autocomplete="off"></label>';
  toc.append(list,state);

  const stream=document.createElement('main');
  stream.className='chapter-reader-stream';
  stream.id='chapter-reader-stream';
  stream.setAttribute('aria-live','polite');
  stream.innerHTML='<div class="chapter-reader-loading"><strong>Loading released episodes…</strong><p>Season One, Episode One will appear first, followed by every released episode in order.</p></div>';

  section.querySelectorAll(':scope > .chapter-index-list,:scope > .chapter-index-state,:scope > .chapter-archive-layout').forEach(node=>node.remove());
  layout.append(toc,stream);
  section.append(layout);
  return {section,list,state,stream,filter:byId('chapter-filter')};
}
function normalizeFiles(files,seasonHint){
  return files.filter(file=>file&&file.type==='file'&&EPISODE_RE.test(file.name)).map(file=>{
    const match=file.name.match(EPISODE_RE);
    return {season:Number(file.season||seasonHint||1),number:Number(match[1]),title:titleFromSlug(match[2]),path:file.path,size:file.size||0};
  });
}
async function getJson(url){
  const response=await fetch(url,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
  if(!response.ok)throw new Error('GitHub request failed: '+response.status);
  return response.json();
}
async function discoverEpisodes(){
  try{
    const root=await getJson(ROOT_API);
    const folders=root.filter(item=>item&&item.type==='dir'&&SEASON_RE.test(item.name));
    let episodes=[];
    for(const folder of folders){
      const season=Number(folder.name.match(SEASON_RE)[1]);
      const url=folder.url+(folder.url.includes('?')?'&':'?')+'ref=main';
      episodes.push(...normalizeFiles(await getJson(url),season));
    }
    episodes.sort((a,b)=>a.season-b.season||a.number-b.number);
    if(!episodes.length)throw new Error('No episode files discovered');
    return {episodes,fallback:false};
  }catch(error){
    const episodes=normalizeFiles(FALLBACK,1).sort((a,b)=>a.season-b.season||a.number-b.number);
    return {episodes,fallback:true};
  }
}
function parseEpisode(markdown,episode){
  const normalized=markdown.replace(/\r\n?/g,'\n');
  const firstBreak=normalized.indexOf('\n---\n');
  const preamble=firstBreak>=0?normalized.slice(0,firstBreak):normalized;
  let prose=firstBreak>=0?normalized.slice(firstBreak+5):normalized;
  const endState=prose.search(/\n---\n\s*##\s+Episode-end state/i);
  if(endState>=0)prose=prose.slice(0,endState);
  prose=prose.trim();
  const headings=[...preamble.matchAll(/^#{1,2}\s+(.+)$/gm)].map(match=>match[1].trim());
  const field=name=>{
    const match=preamble.match(new RegExp('\\*\\*'+name+':\\*\\*\\s*([^\\n]+)','i'));
    return match?match[1].trim():'';
  };
  return {...episode,title:headings[1]||episode.title,markdown:normalized.endsWith('\n')?normalized:normalized+'\n',prose,rendered:renderMarkdown(prose),meta:{status:field('Status'),season:field('Season'),episode:field('Episode')}};
}
async function loadEpisode(episode){
  const response=await fetch(episode.path,{cache:'no-store'});
  if(!response.ok)throw new Error('Episode request failed: '+response.status);
  return parseEpisode(await response.text(),episode);
}
function anchorId(episode){return 'season-'+episode.season+'-episode-'+String(episode.number).replace('.','-')}
function renderIndex(episodes,ui){
  ui.list.replaceChildren();
  for(const episode of episodes){
    const link=document.createElement('a');
    link.className='chapter-index-entry';
    link.href='#'+anchorId(episode);
    link.dataset.season=String(episode.season);
    link.dataset.chapterNumber=String(episode.number);
    link.dataset.chapterTitle=episode.title.toLowerCase();
    link.innerHTML='<span class="chapter-index-number">Season '+episode.season+' · Episode '+episode.number+'</span><span class="chapter-index-title">'+esc(episode.title)+'</span><span class="chapter-index-meta">Released canon prose</span>';
    ui.list.append(link);
  }
  const count=episodes.length;
  const countEl=byId('chapter-index-count');
  if(countEl)countEl.textContent=count===1?'1 episode on main':count+' episodes on main';
  const badge=byId('chapter-count-badge');
  if(badge){badge.textContent=String(count);badge.setAttribute('aria-label',count+' released episodes')}
}
function chips(meta){
  const values=[meta.status,meta.season,meta.episode].filter(Boolean);
  return values.map(value=>'<span>'+esc(value)+'</span>').join('');
}
function safeName(value){
  return String(value||'episode').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'episode';
}
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function proseText(episode,section){
  const prose=section.querySelector('.chapter-reader-prose');
  return 'Season '+episode.season+', Episode '+episode.number+' — '+episode.title+'\n\n'+(prose?.innerText||'').trim()+'\n';
}
function standaloneHtml(episode,section){
  const title='Season '+episode.season+', Episode '+episode.number+' — '+episode.title;
  const prose=section.querySelector('.chapter-reader-prose');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>body{max-width:52rem;margin:3rem auto;padding:0 1.2rem;font:18px/1.65 Georgia,serif;color:#191919;background:#fff}h1{line-height:1.15}p{margin:0 0 1em}</style></head><body><h1>'+esc(title)+'</h1>'+(prose?.innerHTML||'')+'</body></html>';
}
function buildDownloadMenu(episode,section){
  const details=document.createElement('details');
  details.className='chapter-download';
  const summary=document.createElement('summary');
  summary.textContent='Download episode';
  const menu=document.createElement('div');
  menu.className='chapter-download-menu';
  details.append(summary,menu);
  if(!episode.markdown){details.hidden=true;return details}
  const stem=safeName('season-'+episode.season+'-episode-'+episode.number+'-'+episode.title);
  const option=(label,action)=>{
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();action();details.removeAttribute('open')});
    menu.append(button);
  };
  option('Raw Markdown (.md)',()=>downloadBlob(new Blob([episode.markdown],{type:'text/markdown;charset=utf-8'}),stem+'.md'));
  option('Reader text (.txt)',()=>downloadBlob(new Blob([proseText(episode,section)],{type:'text/plain;charset=utf-8'}),stem+'.txt'));
  option('Standalone HTML (.html)',()=>downloadBlob(new Blob([standaloneHtml(episode,section)],{type:'text/html;charset=utf-8'}),stem+'.html'));
  if(Number(episode.number)===10.5){
    option('Episodes 01–10 Combined (.md)',async()=>{
      const response=await fetch('docs/nowhere-king/collections/season-01-episodes-01-10-combined.md',{cache:'no-store'});
      if(!response.ok)throw new Error('Combined edition request failed: '+response.status);
      downloadBlob(new Blob([await response.text()],{type:'text/markdown;charset=utf-8'}),'nowhere-king-season-01-episodes-01-10-combined.md');
    });
  }
  return details;
}
function renderStream(episodes,ui){
  ui.stream.replaceChildren();
  for(const episode of episodes){
    const section=document.createElement('section');
    section.className='chapter-reading-entry';
    section.id=anchorId(episode);
    section.dataset.season=String(episode.season);
    section.dataset.chapterNumber=String(episode.number);

    const header=document.createElement('header');
    header.className='chapter-reading-header';
    header.innerHTML='<p class="eyebrow">Season '+episode.season+' · Episode '+episode.number+'</p><h2>'+esc(episode.title)+'</h2><div class="chapter-reader-meta">'+chips(episode.meta)+'</div>';
    header.append(buildDownloadMenu(episode,section));

    const prose=document.createElement('article');
    prose.className='chapter-reader-prose';
    prose.innerHTML=episode.rendered;
    section.append(header,prose);
    ui.stream.append(section);
  }
}
function failedEpisode(episode,error){
  return {...episode,markdown:'',meta:{status:'Reader load failed'},rendered:'<div class="chapter-reader-error"><strong>Reader load failed for this episode.</strong><p>The episode remains in the canonical directory, but its prose could not be loaded in this browser session.</p></div>',loadError:String(error&&error.message||error)};
}
function applyFilter(ui){
  const q=(ui.filter.value||'').trim().toLowerCase();
  ui.list.querySelectorAll('.chapter-index-entry').forEach(entry=>{
    const hay=('season '+entry.dataset.season+' episode '+entry.dataset.chapterNumber+' '+entry.dataset.chapterTitle).toLowerCase();
    entry.classList.toggle('is-filtered',!!q&&!hay.includes(q));
  });
}
function watchPosition(ui){
  const entries=[...ui.stream.querySelectorAll('.chapter-reading-entry')];
  const links=[...ui.list.querySelectorAll('.chapter-index-entry')];
  const setActive=(season,number)=>links.forEach(link=>link.classList.toggle('is-active',Number(link.dataset.season)===Number(season)&&Number(link.dataset.chapterNumber)===Number(number)));
  if(!('IntersectionObserver' in window)){if(entries[0])setActive(entries[0].dataset.season,entries[0].dataset.chapterNumber);return}
  const observer=new IntersectionObserver(changes=>{
    const visible=changes.filter(change=>change.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
    if(visible[0])setActive(visible[0].target.dataset.season,visible[0].target.dataset.chapterNumber);
  },{rootMargin:'-12% 0px -68% 0px',threshold:[0,.05,.2,.5]});
  entries.forEach(entry=>observer.observe(entry));
}
async function boot(){
  const ui=archiveShell();if(!ui)return;
  document.querySelectorAll('[data-story-panel]').forEach(tab=>tab.addEventListener('click',()=>activatePanel(tab.dataset.storyPanel)));
  ui.filter.addEventListener('input',()=>applyFilter(ui));
  if(location.hash==='#story-bible')activatePanel('story-bible',false);else activatePanel('chapter-index',false);

  const discovery=await discoverEpisodes();
  renderIndex(discovery.episodes,ui);
  ui.state.textContent=discovery.fallback?'Showing the embedded current episode list because live directory discovery is temporarily unavailable.':'Episode list synchronized from every Nowhere King season directory on main.';

  const loaded=await Promise.all(discovery.episodes.map(async episode=>{try{return await loadEpisode(episode)}catch(error){return failedEpisode(episode,error)}}));
  renderIndex(loaded,ui);renderStream(loaded,ui);applyFilter(ui);watchPosition(ui);

  const target=location.hash&&/^#season-\d+-episode-\d+(?:-\d+)?$/.test(location.hash)?document.querySelector(location.hash):null;
  if(target){activatePanel('chapter-index',false);requestAnimationFrame(()=>target.scrollIntoView({block:'start'}))}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
