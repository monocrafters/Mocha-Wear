"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Pause,Play,ArrowUpRight} from 'lucide-react';
import {useCatalog} from './catalog-provider';
import {StoreImage} from './store-image';
import {apiJson} from '@/lib/api-cache';
import {collectionHref} from '@/lib/collection';
import defaults from '@/lib/spotlight-defaults.json';
export type SpotlightConfig=typeof defaults;
export function CollectionSpotlight(){
 const {collections,loading}=useCatalog();
 const [config,setConfig]=useState<SpotlightConfig>(defaults);
 const [selected,setSelected]=useState('');
 const [paused,setPaused]=useState(false);
 const [interacting,setInteracting]=useState(false);
 const [reduced,setReduced]=useState(false);
 useEffect(()=>{let live=true;apiJson<{spotlight:SpotlightConfig}>('/api/spotlight',{staleWhileRevalidate:true,onUpdate:d=>{if(live&&d.spotlight)setConfig(d.spotlight)}}).then(d=>{if(live&&d.spotlight)setConfig(d.spotlight)}).catch(()=>undefined);const m=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(m.matches);sync();m.addEventListener('change',sync);return()=>{live=false;m.removeEventListener('change',sync)};},[]);
 const items=config.items.filter(i=>i.enabled&&collections.some(c=>c.id===i.collection_id));
 const index=Math.max(0,items.findIndex(i=>i.id===selected));
 const active=items[index];
 useEffect(()=>{if(!config.enabled||!config.autoplay||paused||interacting||reduced||items.length<2)return;const timer=setInterval(()=>{if(!document.hidden)setSelected(items[(index+1)%items.length].id)},config.interval);return()=>clearInterval(timer)},[config.enabled,config.autoplay,config.interval,paused,interacting,reduced,items,index]);
 if(!config.enabled)return null;
 if(!active)return loading?<div className="spotlight-loading" aria-label="Loading collections"/>:null;
 const collection=collections.find(c=>c.id===active.collection_id)!;
 return <section className="collection-spotlight" aria-label="Collection spotlight" onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)} onFocusCapture={()=>setInteracting(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setInteracting(false)}}>
 <div className="spotlight-stage">
 {items.map(i=>{const c=collections.find(c=>c.id===i.collection_id)!;const image=i.background||i.image||c.cover_image;return <div key={i.id} className={`spotlight-scene${active.id===i.id?' is-active':''}`} aria-hidden="true">{image&&<StoreImage src={image} alt="" sizes="100vw" cloudWidth={1600} preserveCrop className="spotlight-scene-image"/>}</div>})}
 <div className="spotlight-copy" key={active.id}><p>THE COLLECTION EDIT</p><h1>{active.title}</h1><p className="spotlight-description">{active.description}</p><Link href={collectionHref(collection)}>Explore collection <ArrowUpRight size={17}/></Link></div>
 <div className="spotlight-counter"><span>{String(index+1).padStart(2,'0')} / {String(items.length).padStart(2,'0')}</span>{config.autoplay&&items.length>1&&<button aria-label={paused?'Play collections':'Pause collections'} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={15}/>:<Pause size={15}/>}</button>}</div>
 </div>
 <div className="spotlight-rail" aria-label="Choose a collection">{items.map(i=>{const c=collections.find(c=>c.id===i.collection_id)!;return <button key={i.id} type="button" aria-pressed={active.id===i.id} onClick={()=>{setSelected(i.id);setPaused(true)}}><span className="spotlight-circle"><StoreImage src={i.image||c.cover_image} alt="" sizes="160px" cloudWidth={400} className="object-cover"/></span><span>{i.title}</span></button>})}</div>
 </section>
}
