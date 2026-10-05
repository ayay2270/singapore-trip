// Local MRT-inspired app icon; no remote assets or build dependencies.
const fs = require('node:fs');
const zlib = require('node:zlib');
const crcTable = Array.from({length:256},(_,i)=>{for(let k=0;k<8;k++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0});
function chunk(type,data){const name=Buffer.from(type),b=Buffer.concat([name,data]);let crc=0xffffffff;for(const c of b)crc=crcTable[(crc^c)&255]^(crc>>>8);const n=Buffer.alloc(4),end=Buffer.alloc(4);n.writeUInt32BE(data.length);end.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([n,b,end]);}
for(const size of [192,512]){
 const row=size*3+1,raw=Buffer.alloc(row*size),ink=[15,31,46],white=[247,244,237];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)for(let c=0;c<3;c++)raw[y*row+1+x*3+c]=ink[c];
 function rect(x,y,w,h,color){for(let yy=Math.floor(y);yy<Math.min(size,y+h);yy++)for(let xx=Math.floor(x);xx<Math.min(size,x+w);xx++)for(let c=0;c<3;c++)raw[yy*row+1+xx*3+c]=color[c];}
 const s=size/12,pattern=['11111','10000','10000','11111','00001','00001','11111'];
 pattern.forEach((r,y)=>[...r].forEach((v,x)=>{if(v==='1')rect(size*.29+x*s,size*.16+y*s,s,s,white)}));
 [[0,122,56],[0,94,196],[153,0,170],[229,138,0]].forEach((color,i)=>rect(size*(.16+i*.18),size*.82,size*.14,size*.06,color));
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=2;
 fs.writeFileSync('icon-'+size+'.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
