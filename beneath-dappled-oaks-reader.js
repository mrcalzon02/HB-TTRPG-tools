(() => {
'use strict';

const directoryApi='https://api.github.com/repos/mrcalzon02/HB-TTRPG-tools/contents/docs/beneath-dappled-oaks/chapters?ref=main';
const chapterPattern=/^(\d+(?:\.\d+)?)-(.+)\.md$/i;
const smallWords=new Set(['a','an','and','as','at','but','by','for','from','in','of','on','or','the','to','with']);
const encoder=new TextEncoder();
const fallbackFiles=[
  {name:'01-THE-LAST-SEVEN.md',path:'docs/beneath-dappled-oaks/chapters/01-THE-LAST-SEVEN.md',size:31397,type:'file'},
  {name:'02-THE-COST-OF-SILK.md',path:'docs/beneath-dappled-oaks/chapters/02-THE-COST-OF-SILK.md',size:31458,type:'file'},
  {name:'03-SEVEN-DOORS.md',path:'docs/beneath-dappled-oaks/chapters/03-SEVEN-DOORS.md',size:39165,type:'file'},
  {name:'04-NECESSARY-TRUTH.md',path:'docs/beneath-dappled-oaks/chapters/04-NECESSARY-TRUTH.md',size:38405,type:'file'},
  {name:'05-SOMETHING-BURIED-NEAR-THE-HOUSE.md',path:'docs/beneath-dappled-oaks/chapters/05-SOMETHING-BURIED-NEAR-THE-HOUSE.md',size:163274,type:'file'},
  {name:'06-THE-PRICE-OF-BEING-SEEN.md',path:'docs/beneath-dappled-oaks/chapters/06-THE-PRICE-OF-BEING-SEEN.md',size:309599,type:'file'},
  {name:'07-LEAF-SEVENTY-THREE.md',path:'docs/beneath-dappled-oaks/chapters/07-LEAF-SEVENTY-THREE.md',size:23027,type:'file'},
  {name:'08-THE-EDGES-LEFT-BEHIND.md',path:'docs/beneath-dappled-oaks/chapters/08-THE-EDGES-LEFT-BEHIND.md',size:34432,type:'file'},
  {name:'09-THE-RIDER.md',path:'docs/beneath-dappled-oaks/chapters/09-THE-RIDER.md',size:26169,type:'file'},
  {name:'10-WHAT-THE-OATH-KEEPS.md',path:'docs/beneath-dappled-oaks/chapters/10-WHAT-THE-OATH-KEEPS.md',size:24074,type:'file'},
  {name:'11-THE-SECOND-SIGNATURE.md',path:'docs/beneath-dappled-oaks/chapters/11-THE-SECOND-SIGNATURE.md',size:19783,type:'file'},
  {name:'12-FOUR-HOUSES-LISTENING.md',path:'docs/beneath-dappled-oaks/chapters/12-FOUR-HOUSES-LISTENING.md',size:17788,type:'file'},
  {name:'13-THE-COST-OF-KEEPING-SEVEN.md',path:'docs/beneath-dappled-oaks/chapters/13-THE-COST-OF-KEEPING-SEVEN.md',size:25650,type:'file'},
  {name:'14-THE-INVITATION-THAT-KNOWS-TOO-MUCH.md',path:'docs/beneath-dappled-oaks/chapters/14-THE-INVITATION-THAT-KNOWS-TOO-MUCH.md',size:26710,type:'file'},
  {name:'15-THE-THINGS-FAMILIES-COUNT.md',path:'docs/beneath-dappled-oaks/chapters/15-THE-THINGS-FAMILIES-COUNT.md',size:27460,type:'file'},
  {name:'16-WHAT-CORREN-KEPT.md',path:'docs/beneath-dappled-oaks/chapters/16-WHAT-CORREN-KEPT.md',size:24579,type:'file'},
  {name:'17-THE-OTHER-HALF-OF-THE-LOCK.md',path:'docs/beneath-dappled-oaks/chapters/17-THE-OTHER-HALF-OF-THE-LOCK.md',size:23416,type:'file'},
  {name:'18-THE-RESERVE-HAND.md',path:'docs/beneath-dappled-oaks/chapters/18-THE-RESERVE-HAND.md',size:18779,type:'file'},
  {name:'19-THE-ARITHMETIC-BEFORE-THE-FIRE.md',path:'docs/beneath-dappled-oaks/chapters/19-THE-ARITHMETIC-BEFORE-THE-FIRE.md',size:19948,type:'file'},
  {name:'20-WHO-ASKED-TO-SEE-THE-COUNT.md',path:'docs/beneath-dappled-oaks/chapters/20-WHO-ASKED-TO-SEE-THE-COUNT.md',size:23612,type:'file'},
  {name:'21-WHAT-THE-SECOND-OFFICE-KNEW.md',path:'docs/beneath-dappled-oaks/chapters/21-WHAT-THE-SECOND-OFFICE-KNEW.md',size:20727,type:'file'},
  {name:'22-TWELVE-DAYS-WEST.md',path:'docs/beneath-dappled-oaks/chapters/22-TWELVE-DAYS-WEST.md',size:19011,type:'file'},
  {name:'23-WHAT-THE-COMMISSION-BOUGHT.md',path:'docs/beneath-dappled-oaks/chapters/23-WHAT-THE-COMMISSION-BOUGHT.md',size:26548,type:'file'},
  {name:'24-WHERE-THE-QUESTION-CHANGED.md',path:'docs/beneath-dappled-oaks/chapters/24-WHERE-THE-QUESTION-CHANGED.md',size:32128,type:'file'},
  {name:'25-THE-SHAPE-OF-TOO-MUCH-FUTURE.md',path:'docs/beneath-dappled-oaks/chapters/25-THE-SHAPE-OF-TOO-MUCH-FUTURE.md',size:22939,type:'file'},
  {name:'26-THE-RESERVATION-IN-RED-WAX.md',path:'docs/beneath-dappled-oaks/chapters/26-THE-RESERVATION-IN-RED-WAX.md',size:17392,type:'file'},
  {name:'27-WHAT-THE-FIRST-OFFICE-EXPECTED.md',path:'docs/beneath-dappled-oaks/chapters/27-WHAT-THE-FIRST-OFFICE-EXPECTED.md',size:16646,type:'file'},
  {name:'28-THE-ACKNOWLEDGING-HAND.md',path:'docs/beneath-dappled-oaks/chapters/28-THE-ACKNOWLEDGING-HAND.md',size:20055,type:'file'},
  {name:'29-WHO-SENT-PELLISAR.md',path:'docs/beneath-dappled-oaks/chapters/29-WHO-SENT-PELLISAR.md',size:23369,type:'file'},
  {name:'30-WHAT-LAWFUL-REMEDIES-COULD-NOT-DO.md',path:'docs/beneath-dappled-oaks/chapters/30-WHAT-LAWFUL-REMEDIES-COULD-NOT-DO.md',size:0,type:'file'}
];
let released=[];

function byId(id){return document.getElementById(id)}
function titleFromSlug(slug){
  return slug.split('-').map((word,index)=>{
    const lower=word.toLowerCase();
    if(index>0&&smallWords.has(lower))return lower;
    return lower.charAt(0).toUpperCase()+lower.slice(1);
  }).join(' ');
}
function esc(value){
  return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
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
    const split=line.indexOf(':');
    if(split<0)continue;
    const key=line.slice(0,split).trim();
    const value=line.slice(split+1).trim().replace(/^["']|["']$/g,'');
    result.meta[key]=value;
  }
  result.body=markdown.slice(end+5);
  return result;
}
function renderMarkdown(markdown){
  const lines=markdown.replace(/\r\n?/g,'\n').split('\n');
  const out=[];
  let paragraph=[];
  const flush=()=>{
    if(!paragraph.length)return;
    out.push('<p>'+inlineMarkdown(paragraph.join(' '))+'</p>');
    paragraph=[];
  };
  for(const raw of lines){
    const line=raw.trimEnd();
    if(!line.trim()){flush();continue}
    if(/^---+$/.test(line.trim())){flush();out.push('<hr>');continue}
    const heading=line.match(/^(#{1,6})\s+(.+)$/);
    if(heading){
      flush();
      const level=Math.min(6,heading[1].length);
      out.push('<h'+level+'>'+inlineMarkdown(heading[2])+'</h'+level+'>');
      continue;
    }
    if(line.startsWith('> ')){
      flush();
      out.push('<blockquote><p>'+inlineMarkdown(line.slice(2))+'</p></blockquote>');
      continue;
    }
    paragraph.push(line.trim());
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
  const hero=section.querySelector('.hero-card');
  if(hero){
    const eyebrow=hero.querySelector('.eyebrow');
    if(eyebrow)eyebrow.textContent='Beneath Dappled Oaks · Canon prose';
    const h2=hero.querySelector('h2');
    if(h2)h2.textContent='Chapter Archive & Reader';
    const copy=hero.querySelector('p:last-child');
    if(copy)copy.innerHTML='Open the archive and read immediately. Every released chapter is rendered continuously below; the left index jumps directly to any chapter and each chapter has its own download menu.';
  }

  let list=byId('chapter-index-list');
  let state=byId('chapter-index-state');
  if(!list){
    list=document.createElement('div');
    list.id='chapter-index-list';
    list.className='chapter-index-list';
  }
  if(!state){
    state=document.createElement('p');
    state.id='chapter-index-state';
    state.className='chapter-index-state';
  }

  const layout=document.createElement('div');
  layout.className='chapter-archive-layout';

  const toc=document.createElement('aside');
  toc.className='chapter-toc';
  toc.setAttribute('aria-label','Chapter index');
  toc.innerHTML='<div class="chapter-toc-heading">Chapter Index</div><label class="chapter-filter" for="chapter-filter"><span>Find a chapter</span><input id="chapter-filter" type="search" placeholder="Chapter number or title" autocomplete="off"></label>';
  toc.append(list,state);

  const stream=document.createElement('main');
  stream.className='chapter-reader-stream';
  stream.id='chapter-reader-stream';
  stream.setAttribute('aria-live','polite');
  stream.innerHTML='<div class="chapter-reader-loading"><strong>Loading released chapters…</strong><p>Chapter One will appear here first, followed by every released chapter in order.</p></div>';

  section.querySelectorAll(':scope > .chapter-index-list,:scope > .chapter-index-state,:scope > .chapter-archive-layout').forEach(node=>node.remove());
  layout.append(toc,stream);
  section.append(layout);
  return {section,list,state,stream,filter:byId('chapter-filter')};
}
function normalizeFiles(files){
  return files
    .filter(file=>file&&file.type==='file'&&chapterPattern.test(file.name))
    .map(file=>{
      const match=file.name.match(chapterPattern);
      return {
        number:Number(match[1]),
        title:titleFromSlug(match[2]),
        href:file.path,
        size:file.size||0
      };
    })
    .sort((a,b)=>a.number-b.number);
}
async function fetchChapter(chapter){
  const response=await fetch(chapter.href,{cache:'no-store'});
  if(!response.ok)throw new Error('Chapter request failed: '+response.status);
  const markdown=await response.text();
  const parsed=parseFrontMatter(markdown);
  const title=parsed.meta.title||chapter.title;
  const body=parsed.body.replace(/^\s*#\s+[^\n]+\n+/,'');
  return {
    ...chapter,
    title,
    markdown:markdown.endsWith('\n')?markdown:markdown+'\n',
    meta:parsed.meta,
    body,
    rendered:renderMarkdown(body)
  };
}
function renderIndex(chapters,ui){
  ui.list.replaceChildren();
  for(const chapter of chapters){
    const link=document.createElement('a');
    link.className='chapter-index-entry';
    link.href='#chapter-'+String(chapter.number).replace('.','-');
    link.dataset.chapterNumber=String(chapter.number);
    link.dataset.chapterTitle=chapter.title.toLowerCase();
    link.innerHTML='<span class="chapter-index-number">Chapter '+chapter.number+'</span><span class="chapter-index-title">'+esc(chapter.title)+'</span>';
    const meta=document.createElement('span');
    meta.className='chapter-index-meta';
    meta.textContent='Released canon prose';
    link.append(meta);
    ui.list.append(link);
  }
  const count=chapters.length;
  const countEl=byId('chapter-index-count');
  if(countEl)countEl.textContent=count===1?'1 chapter on main':count+' chapters on main';
  const badge=byId('chapter-count-badge');
  if(badge){
    badge.textContent=String(count);
    badge.setAttribute('aria-label',count+' released chapters');
  }
}
function metaChips(meta){
  const values=[];
  if(meta.status)values.push(meta.status);
  if(meta.era)values.push(meta.era);
  if(meta.season)values.push(meta.season);
  return values.map(value=>'<span>'+esc(value)+'</span>').join('');
}
function renderStream(chapters,ui){
  ui.stream.replaceChildren();
  for(const chapter of chapters){
    const section=document.createElement('section');
    section.className='chapter-reading-entry';
    section.id='chapter-'+String(chapter.number).replace('.','-');
    section.dataset.chapterNumber=String(chapter.number);

    const header=document.createElement('header');
    header.className='chapter-reading-header';
    header.innerHTML=
      '<p class="eyebrow">Chapter '+chapter.number+'</p>'+
      '<h2>'+esc(chapter.title)+'</h2>'+
      '<div class="chapter-reader-meta">'+metaChips(chapter.meta)+'</div>';

    const download=buildDownloadMenu(chapter,section);
    header.append(download);

    const prose=document.createElement('article');
    prose.className='chapter-reader-prose';
    prose.innerHTML=chapter.rendered;
    section.append(header,prose);
    ui.stream.append(section);
  }
}
function renderLoadFailure(chapter,error){
  return {
    ...chapter,
    markdown:'',
    meta:{status:'Reader load failed'},
    body:'',
    rendered:'<div class="chapter-reader-error"><strong>Reader load failed for this chapter.</strong><p>The chapter remains listed in the canonical directory, but its prose could not be loaded in this browser session.</p></div>',
    loadError:String(error&&error.message||error)
  };
}
function applyFilter(ui){
  const q=(ui.filter.value||'').trim().toLowerCase();
  ui.list.querySelectorAll('.chapter-index-entry').forEach(entry=>{
    const hay=('chapter '+entry.dataset.chapterNumber+' '+entry.dataset.chapterTitle).toLowerCase();
    entry.classList.toggle('is-filtered',!!q&&!hay.includes(q));
  });
}
function watchReadingPosition(ui){
  const entries=[...ui.stream.querySelectorAll('.chapter-reading-entry')];
  const links=[...ui.list.querySelectorAll('.chapter-index-entry')];
  const setActive=number=>{
    links.forEach(link=>link.classList.toggle('is-active',Number(link.dataset.chapterNumber)===Number(number)));
  };
  if(!('IntersectionObserver' in window)){
    if(entries[0])setActive(entries[0].dataset.chapterNumber);
    return;
  }
  const observer=new IntersectionObserver(changes=>{
    const visible=changes
      .filter(change=>change.isIntersecting)
      .sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
    if(visible[0])setActive(visible[0].target.dataset.chapterNumber);
  },{rootMargin:'-12% 0px -68% 0px',threshold:[0,.05,.2,.5]});
  entries.forEach(entry=>observer.observe(entry));
}
function safeName(value){
  return String(value||'chapter').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'chapter';
}
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function textFromSection(chapter,section){
  const prose=section.querySelector('.chapter-reader-prose');
  return 'Chapter '+chapter.number+' — '+chapter.title+'\n\n'+(prose?.innerText||prose?.textContent||'').trim()+'\n';
}
function standaloneHtml(chapter,section){
  const title='Chapter '+chapter.number+' — '+chapter.title;
  const prose=section.querySelector('.chapter-reader-prose');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>body{max-width:52rem;margin:3rem auto;padding:0 1.2rem;font:18px/1.65 Georgia,serif;color:#191919;background:#fff}h1{line-height:1.15}p{margin:0 0 1em}</style></head><body><h1>'+esc(title)+'</h1>'+(prose?.innerHTML||'')+'</body></html>';
}
function normalizePdfText(value){
  return String(value).replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/\u2026/g,'...').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E\n]/g,'?');
}
function wrapPdfLines(text,width=88){
  const out=[];
  for(const raw of normalizePdfText(text).split('\n')){
    const line=raw.trimEnd();
    if(!line){out.push('');continue}
    const words=line.split(/\s+/);
    let cur='';
    for(const word of words){
      if(!cur)cur=word;
      else if((cur+' '+word).length<=width)cur+=' '+word;
      else{out.push(cur);cur=word}
    }
    if(cur)out.push(cur);
  }
  return out;
}
function pdfEscape(value){return value.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function pdfBlob(text){
  const lines=wrapPdfLines(text,88);
  const perPage=50;
  const pages=[];
  for(let i=0;i<lines.length;i+=perPage)pages.push(lines.slice(i,i+perPage));
  if(!pages.length)pages.push(['']);
  const objects=[];
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  const kids=[];
  pages.forEach((pageLines,index)=>{
    const contentId=4+index*2;
    const pageId=5+index*2;
    kids.push(pageId+' 0 R');
    const commands=['BT','/F1 10 Tf','48 744 Td','13 TL'];
    for(const line of pageLines)commands.push('('+pdfEscape(line)+') Tj','T*');
    commands.push('ET');
    const stream=commands.join('\n');
    objects[contentId]='<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream';
    objects[pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentId+' 0 R >>';
  });
  objects[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
  let pdf='%PDF-1.4\n% HB-TTRPG-tools chapter export\n';
  const offsets=[0];
  for(let i=1;i<objects.length;i++){
    offsets[i]=pdf.length;
    pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n';
  }
  const xref=pdf.length;
  pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
  for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return new Blob([pdf],{type:'application/pdf'});
}
const crcTable=(()=>{
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
    table[n]=c>>>0;
  }
  return table;
})();
function crc32(bytes){
  let c=0xFFFFFFFF;
  for(const b of bytes)c=crcTable[(c^b)&0xFF]^(c>>>8);
  return(c^0xFFFFFFFF)>>>0;
}
function le16(n){return Uint8Array.of(n&255,(n>>>8)&255)}
function le32(n){return Uint8Array.of(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255)}
function catBytes(parts){
  const size=parts.reduce((n,p)=>n+p.length,0);
  const out=new Uint8Array(size);
  let offset=0;
  for(const part of parts){out.set(part,offset);offset+=part.length}
  return out;
}
function zipStore(entries){
  const locals=[];
  const centrals=[];
  let offset=0;
  for(const entry of entries){
    const name=encoder.encode(entry.name);
    const data=entry.data instanceof Uint8Array?entry.data:encoder.encode(entry.data);
    const crc=crc32(data);
    const local=catBytes([le32(0x04034b50),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),name,data]);
    locals.push(local);
    const central=catBytes([le32(0x02014b50),le16(20),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name]);
    centrals.push(central);
    offset+=local.length;
  }
  const centralBlob=catBytes(centrals);
  const end=catBytes([le32(0x06054b50),le16(0),le16(0),le16(entries.length),le16(entries.length),le32(centralBlob.length),le32(offset),le16(0)]);
  return catBytes([...locals,centralBlob,end]);
}
function epubBlob(chapter,section){
  const title='Chapter '+chapter.number+' — '+chapter.title;
  const creator='Mrcalzon02 / Christopher Vardeman';
  const id='urn:hb-ttrpg-tools:beneath-dappled-oaks:'+safeName(title);
  const prose=section.querySelector('.chapter-reader-prose');
  const chapterXhtml='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><meta charset="utf-8"/><title>'+esc(title)+'</title></head><body><h1>'+esc(title)+'</h1>'+(prose?.innerHTML||'')+'</body></html>';
  const toc='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol><li><a href="chapter.xhtml">'+esc(title)+'</a></li></ol></nav></body></html>';
  const opf='<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">'+esc(id)+'</dc:identifier><dc:title>'+esc(title)+'</dc:title><dc:creator>'+esc(creator)+'</dc:creator><dc:language>en</dc:language></metadata><manifest><item id="nav" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>';
  const container='<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
  const bytes=zipStore([
    {name:'mimetype',data:encoder.encode('application/epub+zip')},
    {name:'META-INF/container.xml',data:encoder.encode(container)},
    {name:'OEBPS/content.opf',data:encoder.encode(opf)},
    {name:'OEBPS/toc.xhtml',data:encoder.encode(toc)},
    {name:'OEBPS/chapter.xhtml',data:encoder.encode(chapterXhtml)}
  ]);
  return new Blob([bytes],{type:'application/epub+zip'});
}
function combinedMarkdown(chapters){
  return '# Beneath Dappled Oaks — Combined Reader Edition\n\n**Generated in-browser from the released canonical chapter files currently loaded by this reader.**\n\n---\n\n'+chapters.filter(ch=>ch.markdown).map(ch=>ch.markdown.trimEnd()).join('\n\n---\n\n')+'\n';
}
function buildDownloadMenu(chapter,section){
  const details=document.createElement('details');
  details.className='chapter-download';
  const summary=document.createElement('summary');
  summary.textContent='Download chapter';
  const menu=document.createElement('div');
  menu.className='chapter-download-menu';
  details.append(summary,menu);

  if(!chapter.markdown){
    details.hidden=true;
    return details;
  }

  const stem=safeName('chapter-'+chapter.number+'-'+chapter.title);
  const option=(label,action)=>{
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label;
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      action();
      details.removeAttribute('open');
    });
    menu.append(button);
  };
  option('Raw Markdown (.md)',()=>downloadBlob(new Blob([chapter.markdown],{type:'text/markdown;charset=utf-8'}),stem+'.md'));
  option('Plain text (.txt)',()=>downloadBlob(new Blob([textFromSection(chapter,section)],{type:'text/plain;charset=utf-8'}),stem+'.txt'));
  option('PDF (.pdf)',()=>downloadBlob(pdfBlob(textFromSection(chapter,section)),stem+'.pdf'));
  option('EPUB e-reader (.epub)',()=>downloadBlob(epubBlob(chapter,section),stem+'.epub'));
  option('Standalone HTML (.html)',()=>downloadBlob(new Blob([standaloneHtml(chapter,section)],{type:'text/html;charset=utf-8'}),stem+'.html'));
  option('Combined released chapters (.md)',()=>downloadBlob(new Blob([combinedMarkdown(released)],{type:'text/markdown;charset=utf-8'}),'beneath-dappled-oaks-combined-released-chapters.md'));
  return details;
}
async function discoverFiles(){
  try{
    const response=await fetch(directoryApi,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
    if(!response.ok)throw new Error('GitHub directory request failed');
    const files=await response.json();
    const normalized=normalizeFiles(files);
    if(!normalized.length)throw new Error('No chapter files returned');
    return {files:normalized,fallback:false};
  }catch(error){
    return {files:normalizeFiles(fallbackFiles),fallback:true};
  }
}
async function boot(){
  const ui=archiveShell();
  if(!ui)return;

  document.querySelectorAll('[data-story-panel]').forEach(tab=>{
    tab.addEventListener('click',()=>activatePanel(tab.dataset.storyPanel));
  });
  ui.filter.addEventListener('input',()=>applyFilter(ui));

  const requestedHash=location.hash;
  if(requestedHash==='#story-bible')activatePanel('story-bible',false);
  else activatePanel('chapter-index',false);

  const discovery=await discoverFiles();
  released=discovery.files;
  renderIndex(released,ui);
  ui.state.textContent=discovery.fallback
    ? 'Showing the embedded current chapter list because the live directory refresh is temporarily unavailable.'
    : 'Chapter list synchronized from the canonical chapter directory on main.';

  const loaded=await Promise.all(released.map(async chapter=>{
    try{return await fetchChapter(chapter)}
    catch(error){return renderLoadFailure(chapter,error)}
  }));
  released=loaded;
  renderIndex(loaded,ui);
  renderStream(loaded,ui);
  applyFilter(ui);
  watchReadingPosition(ui);

  const target=location.hash&&/^#chapter-\d+(?:-\d+)?$/.test(location.hash)?document.querySelector(location.hash):null;
  if(target){
    activatePanel('chapter-index',false);
    requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();