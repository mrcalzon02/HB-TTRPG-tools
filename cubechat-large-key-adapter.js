/* CubeChat experimental independently-generated key material adapter.
 * Consumable XOR bytes, never recycled within a session. No OTP claim:
 * outer message also uses AES-GCM; retained AES keys are conventional prototype keys.
 */
(function(root){'use strict';
const HEADER=64,MAX=16777216,te=new TextEncoder(),td=new TextDecoder();
function hex(a){return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('')}
function parse(buffer){if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<HEADER||buffer.byteLength>MAX+HEADER)throw Error('Invalid large key file length');
const raw=new Uint8Array(buffer),v=new DataView(buffer);
if(td.decode(raw.subarray(0,5))!=='CCLK2'||raw[5]!==1||![1,2].includes(raw[6])||raw[7]!==0||raw.slice(24,64).some(Boolean))throw Error('Invalid CCLK2 header');
const length=v.getUint32(20,false);if(length!==raw.byteLength-HEADER||length<1)throw Error('CCLK2 size mismatch');
return {profile:hex(raw.slice(8,20)),direction:raw[6]===1?'AB':'BA',bytes:raw.slice(64),offset:0};}
function reserve(key,length){if(!Number.isSafeInteger(length)||length<0||length>4096)throw Error('Message exceeds 4096 bytes');if(key.offset+length>key.bytes.length)throw Error('Large key exhausted. Provision replacement material.');const start=key.offset;key.offset+=length;return start}
function mix(key,data,start){if(!(data instanceof Uint8Array)||!Number.isSafeInteger(start)||start<0||start+data.length>key.bytes.length)throw Error('Invalid pad region');const out=new Uint8Array(data.length);for(let i=0;i<data.length;i++)out[i]=data[i]^key.bytes[start+i];return out}
root.CubeChatLargeKey={parse,reserve,mix};
})(typeof window!=='undefined'?window:globalThis);
