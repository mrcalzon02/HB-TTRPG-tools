(() => {
  'use strict';
  if(globalThis.BlacklightExoVesselDiegeticControls)return;
  const ROOT_SELECTOR='.exo-vessel-body main';
  const CONFIG={
    'exo-vessel-crew':{minimum:1,maximum:10000,step:1,scale:'log',unit:'crew'},
    'exo-vessel-endurance':{minimum:1,maximum:3650,step:1,scale:'log',unit:'days'},
    'exo-vessel-reserve':{minimum:1,maximum:20,step:1,scale:'linear',unit:'cycles'},
    'exo-vessel-distance':{minimum:.000001,maximum:100,step:.000001,scale:'log',unit:'ly'},
    'exo-vessel-payload':{minimum:0,maximum:1000000000,step:1,scale:'log-zero',unit:'tonnes',allowAutomatic:true,automaticLabel:'Role-derived'},
    'exo-vessel-gameplay-difficulty':{minimum:0,maximum:100,step:1,scale:'linear',unit:'difficulty'},
    'exo-vessel-gameplay-resolve-difficulty':{minimum:0,maximum:100,step:1,scale:'linear',unit:'difficulty'},
    'exo-vessel-gameplay-opposition':{minimum:0,maximum:100,step:1,scale:'linear',unit:'opposition'},
    'exo-vessel-gameplay-sequence':{minimum:1,maximum:1000,step:1,scale:'log',unit:'sequence'},
    'exo-vessel-target-range':{minimum:1,maximum:10000000000,step:1,scale:'log',unit:'km'},
    'exo-vessel-target-size':{minimum:.1,maximum:100000,step:.1,scale:'log',unit:'m'},
    'exo-vessel-target-velocity':{minimum:0,maximum:100000000,step:1,scale:'log-zero',unit:'m/s'},
    'exo-vessel-target-acceleration':{minimum:0,maximum:1000,step:.01,scale:'log-zero',unit:'m/s²'},
    'exo-vessel-target-delta-v':{minimum:0,maximum:10000000,step:1,scale:'log-zero',unit:'m/s'},
    'exo-vessel-track-age':{minimum:0,maximum:86400,step:1,scale:'log-zero',unit:'s'},
    'exo-vessel-track-horizon':{minimum:0,maximum:86400,step:1,scale:'log-zero',unit:'s'},
    'exo-vessel-emission-control':{minimum:0,maximum:100,step:1,scale:'linear',unit:'%'},
    'exo-vessel-active-defense':{minimum:0,maximum:100,step:1,scale:'linear',unit:'%'},
    'exo-vessel-point-defense':{minimum:0,maximum:64,step:1,scale:'linear',unit:'channels'},
    'exo-vessel-countermeasure-quality':{minimum:0,maximum:100,step:1,scale:'linear',unit:'%'},
    'exo-vessel-salvo-count':{minimum:1,maximum:100,step:1,scale:'log',unit:'shots'},
    'exo-vessel-attack-intensity':{minimum:0,maximum:100,step:1,scale:'linear',unit:'%'},
    'exo-vessel-target-evasion':{minimum:0,maximum:100,step:1,scale:'linear',unit:'%'},
    'exo-vessel-damage-control':{minimum:0,maximum:100,step:1,scale:'linear',unit:'%'}
  };
  const enhanced=new WeakSet();
  const observers=new WeakMap();
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const labelFor=control=>control.closest('label')?.querySelector(':scope > span')?.textContent?.trim()||control.getAttribute('aria-label')||control.id||'Control';
  const dispatch=control=>{control.dispatchEvent(new Event('input',{bubbles:true}));control.dispatchEvent(new Event('change',{bubbles:true}));};
  const format=(value,config)=>{if(config.allowAutomatic&&value==='')return config.automaticLabel||'Automatic';const number=finite(value);const digits=Math.abs(number)>=1000?0:Math.abs(number)>=10?1:Math.abs(number)>=1?2:Math.abs(number)>=.01?3:6;return`${number.toLocaleString(undefined,{maximumFractionDigits:digits})}${config.unit?` ${config.unit}`:''}`;};
  function derivedConfig(input){
    const defined=CONFIG[input.id]||{},current=finite(input.value,finite(input.min,0)),minimum=defined.minimum??finite(input.min,Math.min(0,current)),step=defined.step??finite(input.step,Number.isInteger(current)?1:.01);let maximum=defined.maximum??finite(input.max,NaN);if(!Number.isFinite(maximum)||maximum<=minimum)maximum=Math.max(minimum+step,current>minimum?current*4:minimum+100*step);return{minimum,maximum,step,scale:defined.scale||((maximum/Math.max(step,Math.abs(minimum)||1))>1000?'log-zero':'linear'),unit:defined.unit||input.dataset.unit||'',allowAutomatic:Boolean(defined.allowAutomatic||input.dataset.allowAutomatic==='true'),automaticLabel:defined.automaticLabel||'Automatic'};
  }
  function valueToPosition(value,config){const v=clamp(value,config.minimum,config.maximum);if(config.scale==='log'){const min=Math.max(Number.EPSILON,config.minimum),max=Math.max(min*1.000001,config.maximum);return(Math.log(v)-Math.log(min))/(Math.log(max)-Math.log(min))*1000;}if(config.scale==='log-zero'){if(v<=config.minimum)return 0;const span=Math.max(config.step,config.maximum-config.minimum),shift=Math.max(config.step,span/1000000);return Math.log1p((v-config.minimum)/shift)/Math.log1p(span/shift)*1000;}return(v-config.minimum)/Math.max(Number.EPSILON,config.maximum-config.minimum)*1000;}
  function positionToValue(position,config){const t=clamp(position,0,1000)/1000;let value;if(config.scale==='log'){const min=Math.max(Number.EPSILON,config.minimum),max=Math.max(min*1.000001,config.maximum);value=Math.exp(Math.log(min)+t*(Math.log(max)-Math.log(min)));}else if(config.scale==='log-zero'){const span=Math.max(config.step,config.maximum-config.minimum),shift=Math.max(config.step,span/1000000);value=config.minimum+shift*Math.expm1(t*Math.log1p(span/shift));}else value=config.minimum+t*(config.maximum-config.minimum);const steps=Math.round((value-config.minimum)/config.step);return clamp(config.minimum+steps*config.step,config.minimum,config.maximum);}
  function conceal(control){control.classList.add('exo-vessel-native-authority');control.dataset.exoDiegeticAuthority='true';control.tabIndex=-1;control.setAttribute('aria-hidden','true');}
  function enhanceSelect(select){
    if(enhanced.has(select)||select.multiple||select.disabled)return;enhanced.add(select);conceal(select);
    const panel=document.createElement('div');panel.className='exo-diegetic-selector';panel.dataset.controlId=select.id;panel.setAttribute('role','group');panel.setAttribute('aria-label',labelFor(select));
    const previous=document.createElement('button'),next=document.createElement('button'),readout=document.createElement('strong'),rail=document.createElement('div');previous.type=next.type='button';previous.className='exo-diegetic-step';next.className='exo-diegetic-step';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label',`Previous ${labelFor(select)}`);next.setAttribute('aria-label',`Next ${labelFor(select)}`);readout.className='exo-diegetic-readout';rail.className='exo-diegetic-choice-rail';panel.append(previous,readout,next,rail);select.insertAdjacentElement('afterend',panel);
    function options(){return[...select.options].filter(option=>!option.disabled);}
    function move(direction){const rows=options(),index=Math.max(0,rows.findIndex(option=>option.value===select.value)),target=rows[(index+direction+rows.length)%rows.length];if(target){select.value=target.value;dispatch(select);render();}}
    function render(){const rows=[...select.options],selected=rows.find(option=>option.value===select.value)||rows[0];readout.textContent=selected?.textContent||'No selection';rail.replaceChildren();for(const option of rows){const choice=document.createElement('button');choice.type='button';choice.className='exo-diegetic-choice';choice.textContent=option.textContent;choice.disabled=option.disabled;choice.dataset.selected=String(option.value===select.value);choice.setAttribute('aria-pressed',String(option.value===select.value));choice.addEventListener('click',()=>{select.value=option.value;dispatch(select);render();});rail.append(choice);}previous.disabled=next.disabled=options().length<2;}
    previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));select.addEventListener('change',render);const observer=new MutationObserver(render);observer.observe(select,{childList:true,subtree:true,attributes:true});observers.set(select,observer);render();
  }
  function enhanceNumber(input){
    if(enhanced.has(input)||input.disabled)return;enhanced.add(input);const config=derivedConfig(input),automatic=config.allowAutomatic&&input.value==='';conceal(input);
    const panel=document.createElement('div');panel.className='exo-diegetic-number';panel.dataset.controlId=input.id;panel.setAttribute('role','group');panel.setAttribute('aria-label',labelFor(input));
    const readout=document.createElement('strong'),decrease=document.createElement('button'),increase=document.createElement('button'),slider=document.createElement('input'),automaticButton=document.createElement('button');readout.className='exo-diegetic-readout';decrease.type=increase.type=automaticButton.type='button';decrease.className=increase.className='exo-diegetic-step';automaticButton.className='exo-diegetic-auto';decrease.textContent='−';increase.textContent='+';automaticButton.textContent='AUTO';slider.type='range';slider.min='0';slider.max='1000';slider.step='1';slider.className='exo-diegetic-slider';panel.append(decrease,slider,increase,readout);if(config.allowAutomatic)panel.append(automaticButton);input.insertAdjacentElement('afterend',panel);
    let automaticMode=automatic;
    function apply(value,emit=true){automaticMode=false;input.value=String(value);slider.value=String(valueToPosition(value,config));if(emit)dispatch(input);render();}
    function render(){const value=input.value===''?'':finite(input.value,config.minimum);automaticMode=config.allowAutomatic&&input.value==='';readout.textContent=format(value,config);slider.disabled=automaticMode;decrease.disabled=automaticMode||finite(value,config.minimum)<=config.minimum;increase.disabled=automaticMode||finite(value,config.minimum)>=config.maximum;if(!automaticMode)slider.value=String(valueToPosition(value,config));automaticButton.dataset.active=String(automaticMode);automaticButton.setAttribute('aria-pressed',String(automaticMode));panel.dataset.state=automaticMode?'automatic':'manual';}
    slider.addEventListener('input',()=>{automaticMode=false;input.value=String(positionToValue(slider.value,config));input.dispatchEvent(new Event('input',{bubbles:true}));render();});slider.addEventListener('change',()=>dispatch(input));decrease.addEventListener('click',()=>apply(finite(input.value,config.minimum)-config.step));increase.addEventListener('click',()=>apply(finite(input.value,config.minimum)+config.step));automaticButton.addEventListener('click',()=>{if(automaticMode)apply(config.minimum);else{automaticMode=true;input.value='';dispatch(input);render();}});input.addEventListener('input',render);input.addEventListener('change',render);render();
  }
  function enhance(control){if(control.matches('select'))enhanceSelect(control);else if(control.matches('input[type="number"]'))enhanceNumber(control);}
  function enhanceAll(root=document){const host=root.querySelector?.(ROOT_SELECTOR)||root;for(const control of host?.querySelectorAll?.('select,input[type="number"]')||[])enhance(control);}
  function install(){enhanceAll();const root=document.querySelector(ROOT_SELECTOR);if(!root)return;const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;if(node.matches?.('select,input[type="number"]'))enhance(node);enhanceAll(node);}});observer.observe(root,{childList:true,subtree:true});}
  const api=Object.freeze({version:1,enhanceAll,enhanceSelect,enhanceNumber,configuration:CONFIG});
  globalThis.BlacklightExoVesselDiegeticControls=api;
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
