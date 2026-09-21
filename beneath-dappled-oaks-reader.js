(() => {
'use strict';

const api='https://api.github.com/repos/mrcalzon02/HB-TTRPG-tools/contents/docs/beneath-dappled-oaks/chapters?ref=main';
const chapterPattern=/^(\d+)-(.+)\.md$/i;
const smallWords=new Set(['a','an','and','as','at','but','by','for','from','in','of','on','or','the','to','with']);
const encoder=new TextEncoder();
let released=[],current=null,currentMarkdown='';

function byId(id){return document.getElementById(id)}
function titleFromSlug(slug){
  return slug.split('-').map((word,index)=>{
    const lower=word.toLowerCase();
    if(index>0&&smallWords.has(lower))return lower;
    return lower.charAt(0).toUpperCase()+lower.slice(1);
  }).join(' ');
}
function esc(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function inlineMarkdown(text){
  let value=esc(text);
  value=value.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  value=value.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g,'$1<em>$2</em>');
  value=value.replace(/`([^`]+)`/g,'<code>$1</code>');
  return value;
}
function parseFrontMatter(markdown){
  const result={meta:{},body:markdown};
  if(!markdown.startsWith('---\n'))return result;
  const end=markdown.indexOf('\n---\n',4);
  if(end<0)return result;
  for(const line of markdown.slice(4,end).split('\n')){
    const split=line.indexOf(':'); if(split<0)continue;
    const key=line.slice(0,split).trim();
    let value=line.slice(split+1).trim().replace(/^["']|["']$/g,'');
    result.meta[key]=value;
  }
  result.body=markdown.slice(end+5);
  return result;
}
function renderMarkdown(markdown){
  const lines=markdown.replace(/\r\n?/g,'\n').split('\n');
  const out=[]; let paragraph=[];
  const flush=()=>{if(!paragraph.length)return;out.push('<p>'+inlineMarkdown(paragraph.join(' '))+'</p>');paragraph=[]};
  for(const raw of lines){
    const line=raw.trimEnd();
    if(!line.trim()){flush();continue}
    if(/^---+$/.test(line.trim())){flush();out.push('<hr>');continue}
    const heading=line.match(/^(#{1,6})\s+(.+)$/);
    if(heading){flush();const level=Math.min(6,heading[1].length);out.push('<h'+level+'>'+inlineMarkdown(heading[2])+'</h'+level+'>');continue}
    if(line.startsWith('> ')){flush();out.push('<blockquote><p>'+inlineMarkdown(line.slice(2))+'</p></blockquote>');continue}
    paragraph.push(line.trim());
  }
  flush(); return out.join('\n');
}
function activatePanel(id,updateHash=true){
  const panels=[...document.querySelectorAll('[data-story-tab-panel]')];
  const tabs=[...document.querySelectorAll('[data-story-panel]')];
  if(!panels.some(p=>p.id===id))id='story-bible';
  panels.forEach(p=>p.hidden=p.id!==id);
  tabs.forEach(t=>{
    const active=t.dataset.storyPanel===id;
    t.classList.toggle('is-active',active);
    t.setAttribute('aria-selected',active?'true':'false');
  });
  if(updateHash)history.replaceState(null,'',id==='story-bible'?location.pathname:'#chapter-index');
}
function rebuildArchiveShell(){
  const section=byId('chapter-index'); if(!section)return null;
  const hero=section.querySelector('.hero-card');
  if(hero){
    const eyebrow=hero.querySelector('.eyebrow'); if(eyebrow)eyebrow.textContent='Released canon prose';
    const h2=hero.querySelector('h2'); if(h2)h2.textContent='Chapter Archive & Reader';
    const p=hero.querySelector('p:last-child');
    if(p)p.innerHTML='Canonical chapter files are discovered directly from <code>docs/beneath-dappled-oaks/chapters/</code> on <code>main</code> and opened directly in the archive reading pane.';
  }
  let list=byId('chapter-index-list');
  let state=byId('chapter-index-state');
  const layout=document.createElement('div'); layout.className='chapter-archive-layout';
  const toc=document.createElement('aside'); toc.className='chapter-toc'; toc.setAttribute('aria-label','Chapter index');
  const label=document.createElement('label'); label.className='chapter-filter'; label.htmlFor='chapter-filter';
  label.innerHTML='<span>Filter chapters</span><input id="chapter-filter" type="search" placeholder="Chapter number or title" autocomplete="off">';
  toc.append(label);
  if(!list){list=document.createElement('div');list.id='chapter-index-list';list.className='chapter-index-list'}
  if(!state){state=document.createElement('p');state.id='chapter-index-state';state.className='chapter-index-state'}
  toc.append(list,state);

  const reader=document.createElement('section'); reader.className='chapter-reader-shell'; reader.id='chapter-reader'; reader.setAttribute('aria-label','Chapter reader');
  reader.innerHTML=
    '<div class="hero-card"><p class="eyebrow">Beneath Dappled Oaks · Canon prose</p>'+
    '<h2 id="chapter-reader-title">Select a released chapter</h2><div class="chapter-reader-meta" id="chapter-reader-meta"></div>'+
    '<details class="chapter-download" id="chapter-download" hidden><summary>Download chapter</summary><div class="chapter-download-menu" id="chapter-download-menu"></div></details>'+
    '<p class="chapter-reader-note">Downloads are generated from the canonical chapter currently open in the reader.</p></div>'+
    '<article class="chapter-reader-prose" id="chapter-reader-prose" aria-live="polite"><p>Select a released chapter from the chapter register.</p></article>';
  layout.append(toc,reader);
  section.querySelectorAll(':scope > .chapter-index-list,:scope > .chapter-index-state,:scope > #chapter-reader').forEach(n=>n.remove());
  section.append(layout);
  return {section,list,state,filter:byId('chapter-filter')};
}
function renderIndex(files,ui){
  released=files.filter(f=>f&&f.type==='file'&&chapterPattern.test(f.name)).map(file=>{
    const m=file.name.match(chapterPattern);
    return {number:Number(m[1]),title:titleFromSlug(m[2]),href:file.path,size:file.size||0};
  }).sort((a,b)=>a.number-b.number);

  const rows=[...released];

  ui.list.replaceChildren();
  rows.forEach(ch=>{
    const article=document.createElement('article');
    article.className='chapter-index-entry';
    article.dataset.chapterNumber=String(ch.number);
    article.dataset.chapterTitle=ch.title.toLowerCase();
    article.innerHTML='<div class="chapter-index-number">Chapter '+ch.number+'</div><h3 class="chapter-index-title">'+esc(ch.title)+'</h3>';
    const meta=document.createElement('p'); meta.className='chapter-index-meta';
    meta.textContent='Released canon prose · '+Math.max(1,Math.round(ch.size/1024))+' KB';
    article.append(meta);
    const link=document.createElement('a');link.className='chapter-index-link';link.href='?chapter='+ch.number+'#chapter-index';link.dataset.openChapter=String(ch.number);link.textContent='Read chapter';article.append(link);
    article.addEventListener('click',event=>{if(event.target.closest('a'))return;openChapter(ch.number,true,ui)});
    ui.list.append(article);
  });
  const count=released.length;
  const countEl=byId('chapter-index-count'); if(countEl)countEl.textContent=count===1?'1 released chapter on main':count+' released chapters on main';
  const badge=byId('chapter-count-badge'); if(badge){badge.textContent=String(count);badge.setAttribute('aria-label',count+' released chapters')}
  ui.state.textContent='Released files are synchronized from the canonical chapter directory on main.';
}
function applyFilter(ui){
  const q=(ui.filter.value||'').trim().toLowerCase();
  ui.list.querySelectorAll('.chapter-index-entry').forEach(entry=>{
    const hay=('chapter '+entry.dataset.chapterNumber+' '+entry.dataset.chapterTitle).toLowerCase();
    entry.classList.toggle('is-filtered',!!q&&!hay.includes(q));
  });
}
function markActive(number,ui){
  ui.list.querySelectorAll('.chapter-index-entry').forEach(entry=>{
    entry.classList.toggle('is-active',Number(entry.dataset.chapterNumber)===Number(number));
  });
}
function safeName(value){return String(value||'chapter').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'chapter'}
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function currentText(){
  const prose=byId('chapter-reader-prose'); if(!current||!prose)return'';
  return 'Chapter '+current.number+' — '+current.title+'\n\n'+(prose.innerText||prose.textContent||'').trim()+'\n';
}
function standaloneHtml(){
  const prose=byId('chapter-reader-prose'),title='Chapter '+current.number+' — '+current.title;
  const paragraphs=(prose?.innerText||'').split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>body{max-width:52rem;margin:3rem auto;padding:0 1.2rem;font:18px/1.65 Georgia,serif;color:#191919;background:#fff}h1{line-height:1.15}p{white-space:pre-wrap}</style></head><body><h1>'+esc(title)+'</h1>'+paragraphs.map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('')+'</body></html>';
}
function normalizePdfText(value){return String(value).replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/\u2026/g,'...').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E\n]/g,'?')}
function wrapPdfLines(text,width=88){
  const out=[];for(const raw of normalizePdfText(text).split('\n')){const line=raw.trimEnd();if(!line){out.push('');continue}const words=line.split(/\s+/);let cur='';for(const word of words){if(!cur)cur=word;else if((cur+' '+word).length<=width)cur+=' '+word;else{out.push(cur);cur=word}}if(cur)out.push(cur)}return out
}
function pdfEscape(value){return value.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function pdfBlob(){
  const lines=wrapPdfLines(currentText(),88),perPage=50,pages=[];for(let i=0;i<lines.length;i+=perPage)pages.push(lines.slice(i,i+perPage));if(!pages.length)pages.push(['']);
  const objects=[];objects[1]='<< /Type /Catalog /Pages 2 0 R >>';objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';const kids=[];
  pages.forEach((pageLines,i)=>{const contentId=4+i*2,pageId=5+i*2;kids.push(pageId+' 0 R');const commands=['BT','/F1 10 Tf','48 744 Td','13 TL'];for(const line of pageLines)commands.push('('+pdfEscape(line)+') Tj','T*');commands.push('ET');const stream=commands.join('\n');objects[contentId]='<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream';objects[pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentId+' 0 R >>'});
  objects[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';let pdf='%PDF-1.4\n% HB-TTRPG-tools chapter export\n';const offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n'}const xref=pdf.length;pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return new Blob([pdf],{type:'application/pdf'})
}
const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);table[n]=c>>>0}return table})();
function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=crcTable[(c^b)&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function le16(n){return Uint8Array.of(n&255,(n>>>8)&255)}
function le32(n){return Uint8Array.of(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255)}
function catBytes(parts){const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let off=0;for(const p of parts){out.set(p,off);off+=p.length}return out}
function zipStore(entries){
  const locals=[],centrals=[];let offset=0;
  for(const entry of entries){const name=encoder.encode(entry.name),data=entry.data instanceof Uint8Array?entry.data:encoder.encode(entry.data),crc=crc32(data);const local=catBytes([le32(0x04034b50),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),name,data]);locals.push(local);const central=catBytes([le32(0x02014b50),le16(20),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name]);centrals.push(central);offset+=local.length}
  const centralBlob=catBytes(centrals),end=catBytes([le32(0x06054b50),le16(0),le16(0),le16(entries.length),le16(entries.length),le32(centralBlob.length),le32(offset),le16(0)]);return catBytes([...locals,centralBlob,end])
}
function epubBlob(){
  const prose=byId('chapter-reader-prose'),title='Chapter '+current.number+' — '+current.title,creator='Mrcalzon02 / Christopher Vardeman',id='urn:hb-ttrpg-tools:beneath-dappled-oaks:'+safeName(title);
  const paragraphs=(prose?.innerText||'').split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
  const chapter='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><meta charset="utf-8"/><title>'+esc(title)+'</title><style>body{font-family:serif;line-height:1.5}p{margin:0 0 1em}</style></head><body><h1>'+esc(title)+'</h1>'+paragraphs.map(p=>'<p>'+esc(p).replace(/\n/g,'<br/>')+'</p>').join('')+'</body></html>';
  const toc='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol><li><a href="chapter.xhtml">'+esc(title)+'</a></li></ol></nav></body></html>';
  const opf='<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">'+esc(id)+'</dc:identifier><dc:title>'+esc(title)+'</dc:title><dc:creator>'+esc(creator)+'</dc:creator><dc:language>en</dc:language></metadata><manifest><item id="nav" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>';
  const container='<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
  const bytes=zipStore([{name:'mimetype',data:encoder.encode('application/epub+zip')},{name:'META-INF/container.xml',data:encoder.encode(container)},{name:'OEBPS/content.opf',data:encoder.encode(opf)},{name:'OEBPS/toc.xhtml',data:encoder.encode(toc)},{name:'OEBPS/chapter.xhtml',data:encoder.encode(chapter)}]);return new Blob([bytes],{type:'application/epub+zip'})
}
function configureDownloads(){
  const details=byId('chapter-download'),menu=byId('chapter-download-menu');if(!details||!menu)return;menu.replaceChildren();
  if(!current||!currentMarkdown){details.hidden=true;return}
  const stem=safeName('chapter-'+current.number+'-'+current.title);
  const options=[
    ['Raw Markdown (.md)',()=>downloadBlob(new Blob([currentMarkdown],{type:'text/markdown;charset=utf-8'}),stem+'.md')],
    ['Plain text (.txt)',()=>downloadBlob(new Blob([currentText()],{type:'text/plain;charset=utf-8'}),stem+'.txt')],
    ['PDF (.pdf)',()=>downloadBlob(pdfBlob(),stem+'.pdf')],
    ['EPUB e-reader (.epub)',()=>downloadBlob(epubBlob(),stem+'.epub')],
    ['Standalone HTML (.html)',()=>downloadBlob(new Blob([standaloneHtml()],{type:'text/html;charset=utf-8'}),stem+'.html')]
  ];
  for(const [label,action] of options){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();action();details.removeAttribute('open')});menu.append(b)}
  details.hidden=false;
}
async function openChapter(number,updateHistory,ui){
  const chapter=released.find(item=>item.number===Number(number));if(!chapter)return;
  activatePanel('chapter-index',false);markActive(chapter.number,ui);
  const title=byId('chapter-reader-title'),meta=byId('chapter-reader-meta'),prose=byId('chapter-reader-prose'),downloads=byId('chapter-download');
  title.textContent='Loading Chapter '+chapter.number+'…';meta.replaceChildren();prose.innerHTML='<p>Loading canon prose…</p>';downloads.hidden=true;
  try{
    const response=await fetch(chapter.href,{cache:'no-store'});if(!response.ok)throw new Error('Chapter request failed: '+response.status);
    const markdown=await response.text(),parsed=parseFrontMatter(markdown),actualTitle=parsed.meta.title||chapter.title;
    current=Object.assign({},chapter,{title:actualTitle});currentMarkdown=markdown.endsWith('\n')?markdown:markdown+'\n';
    title.textContent='Chapter '+chapter.number+' — '+actualTitle;
    const metadata=[];if(parsed.meta.status)metadata.push(parsed.meta.status);if(parsed.meta.era)metadata.push(parsed.meta.era);if(parsed.meta.season)metadata.push(parsed.meta.season);
    meta.replaceChildren(...metadata.map(value=>{const s=document.createElement('span');s.textContent=value;return s}));
    const body=parsed.body.replace(/^\s*#\s+[^\n]+\n+/,'');
    prose.innerHTML=renderMarkdown(body);configureDownloads();
    if(updateHistory){const url=new URL(location.href);url.searchParams.set('chapter',String(chapter.number));url.hash='chapter-index';history.replaceState(null,'',url.pathname+url.search+url.hash)}
  }catch(error){
    current=null;currentMarkdown='';title.textContent='Chapter '+chapter.number+' — '+chapter.title;
    prose.innerHTML='<div class="chapter-reader-error"><strong>Reader load failed.</strong> The canonical Markdown file remains in the repository, but this page could not render it in place.</div>';configureDownloads();
  }
}
function boot(){
  document.querySelector('[data-story-panel="chapter-reader"]')?.remove();
  const ui=rebuildArchiveShell();if(!ui)return;
  document.querySelectorAll('[data-story-panel]').forEach(tab=>tab.addEventListener('click',()=>activatePanel(tab.dataset.storyPanel)));
  ui.list.addEventListener('click',event=>{const link=event.target.closest('[data-open-chapter]');if(!link)return;event.preventDefault();openChapter(link.dataset.openChapter,true,ui)});
  ui.filter.addEventListener('input',()=>applyFilter(ui));
  const requested=Number(new URLSearchParams(location.search).get('chapter'));
  fetch(api,{headers:{Accept:'application/vnd.github+json'}}).then(r=>{if(!r.ok)throw new Error('GitHub directory request failed');return r.json()}).then(files=>{
    renderIndex(files,ui);applyFilter(ui);
    const initial=requested&&released.some(ch=>ch.number===requested)?requested:released[0]?.number;
    if(location.hash==='#chapter-index'||requested){activatePanel('chapter-index',false);if(initial)openChapter(initial,false,ui)}else activatePanel('story-bible',false);
  }).catch(()=>{
    const fallback=[
      {name:'01-THE-LAST-SEVEN.md',path:'docs/beneath-dappled-oaks/chapters/01-THE-LAST-SEVEN.md',size:33000,type:'file'},
      {name:'02-THE-COST-OF-SILK.md',path:'docs/beneath-dappled-oaks/chapters/02-THE-COST-OF-SILK.md',size:32000,type:'file'},
      {name:'03-SEVEN-DOORS.md',path:'docs/beneath-dappled-oaks/chapters/03-SEVEN-DOORS.md',size:34885,type:'file'},
      {name:'04-NECESSARY-TRUTH.md',path:'docs/beneath-dappled-oaks/chapters/04-NECESSARY-TRUTH.md',size:38387,type:'file'}
    ];
    renderIndex(fallback,ui);applyFilter(ui);ui.state.textContent+=' Live GitHub directory refresh is temporarily unavailable; embedded Chapters One through Four fallbacks are active.';
    if(location.hash==='#chapter-index'||requested){activatePanel('chapter-index',false);const initialFallback=(requested>=1&&requested<=4)?requested:1;openChapter(initialFallback,false,ui)}else activatePanel('story-bible',false);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();