"use strict";const E=require("siyuan");let Cn={};function xi(n){Cn=n&&typeof n=="object"?n:{}}function f(n,t){const e=Cn[n],i=typeof e=="string"?e:n;return t?i.replace(/\{(\w+)\}/g,(s,a)=>a in t?String(t[a]):s):i}const Tt="siyuan-excali-studio";function ki(){return new URL(`plugins/${Tt}/`,`${location.origin}/`).href}function Si(){const n=ki();return window.EXCALIDRAW_ASSET_PATH=n,n}function vi(...n){return n.map(e=>String(e??"").trim()).filter(e=>e!=="").join("/").replace(/\/{2,}/g,"/")}function Ei(){try{const t=window.siyuan?.config?.system?.dataDir;return typeof t=="string"?t.trim():""}catch{return""}}const q="iconExcaliStudio",_i=`<symbol id="${q}" viewBox="0 0 1024 1024"><g fill="none" stroke="currentColor" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"><rect x="128" y="168" width="768" height="588" rx="56"/><path d="M272 616c72-152 148 92 224-56 44-88 96-36 152-72"/></g></symbol>`;function Ai(n){return`<div class="b3-list-item__first"><svg class="b3-list-item__graphic"><use xlink:href="#${q}"></use></svg><span class="b3-list-item__text">${n}</span></div>`}function ft(n){let t=n.length;for(;--t>=0;)n[t]=0}const $i=3,Ii=258,Tn=29,Mi=256,Ci=Mi+1+Tn,Rn=30,Ti=512,Ri=new Array((Ci+2)*2);ft(Ri);const Di=new Array(Rn*2);ft(Di);const Li=new Array(Ti);ft(Li);const Pi=new Array(Ii-$i+1);ft(Pi);const Bi=new Array(Tn);ft(Bi);const Oi=new Array(Rn);ft(Oi);const Ni=(n,t,e,i)=>{let s=n&65535|0,a=n>>>16&65535|0,o=0;for(;e!==0;){o=e>2e3?2e3:e,e-=o;do s=s+t[i++]|0,a=a+s|0;while(--o);s%=65521,a%=65521}return s|a<<16|0};var re=Ni;const Fi=()=>{let n,t=[];for(var e=0;e<256;e++){n=e;for(var i=0;i<8;i++)n=n&1?3988292384^n>>>1:n>>>1;t[e]=n}return t},ji=new Uint32Array(Fi()),Hi=(n,t,e,i)=>{const s=ji,a=i+e;n^=-1;for(let o=i;o<a;o++)n=n>>>8^s[(n^t[o])&255];return n^-1};var z=Hi,ce={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},Dn={Z_NO_FLUSH:0,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_DEFLATED:8};const zi=(n,t)=>Object.prototype.hasOwnProperty.call(n,t);var Ui=function(n){const t=Array.prototype.slice.call(arguments,1);for(;t.length;){const e=t.shift();if(e){if(typeof e!="object")throw new TypeError(e+"must be non-object");for(const i in e)zi(e,i)&&(n[i]=e[i])}}return n},Wi=n=>{let t=0;for(let i=0,s=n.length;i<s;i++)t+=n[i].length;const e=new Uint8Array(t);for(let i=0,s=0,a=n.length;i<a;i++){let o=n[i];e.set(o,s),s+=o.length}return e},Ln={assign:Ui,flattenChunks:Wi};let Pn=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch{Pn=!1}const bt=new Uint8Array(256);for(let n=0;n<256;n++)bt[n]=n>=252?6:n>=248?5:n>=240?4:n>=224?3:n>=192?2:1;bt[254]=bt[254]=1;var Xi=n=>{let t,e,i,s,a,o=n.length,r=0;for(s=0;s<o;s++)e=n.charCodeAt(s),(e&64512)===55296&&s+1<o&&(i=n.charCodeAt(s+1),(i&64512)===56320&&(e=65536+(e-55296<<10)+(i-56320),s++)),r+=e<128?1:e<2048?2:e<65536?3:4;for(t=new Uint8Array(r),a=0,s=0;a<r;s++)e=n.charCodeAt(s),(e&64512)===55296&&s+1<o&&(i=n.charCodeAt(s+1),(i&64512)===56320&&(e=65536+(e-55296<<10)+(i-56320),s++)),e<128?t[a++]=e:e<2048?(t[a++]=192|e>>>6,t[a++]=128|e&63):e<65536?(t[a++]=224|e>>>12,t[a++]=128|e>>>6&63,t[a++]=128|e&63):(t[a++]=240|e>>>18,t[a++]=128|e>>>12&63,t[a++]=128|e>>>6&63,t[a++]=128|e&63);return t};const Gi=(n,t)=>{if(t<65534&&n.subarray&&Pn)return String.fromCharCode.apply(null,n.length===t?n:n.subarray(0,t));let e="";for(let i=0;i<t;i++)e+=String.fromCharCode(n[i]);return e};var Yi=(n,t)=>{let e,i;const s=t||n.length,a=new Array(s*2);for(i=0,e=0;e<s;){let o=n[e++];if(o<128){a[i++]=o;continue}let r=bt[o];if(r>4){a[i++]=65533,e+=r-1;continue}for(o&=r===2?31:r===3?15:7;r>1&&e<s;)o=o<<6|n[e++]&63,r--;if(r>1){a[i++]=65533;continue}o<65536?a[i++]=o:(o-=65536,a[i++]=55296|o>>10&1023,a[i++]=56320|o&1023)}return Gi(a,i)},Zi=(n,t)=>{t=t||n.length,t>n.length&&(t=n.length);let e=t-1;for(;e>=0&&(n[e]&192)===128;)e--;return e<0||e===0?t:e+bt[n[e]]>t?e:t},le={string2buf:Xi,buf2string:Yi,utf8border:Zi};function Ki(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}var qi=Ki;const Et=30,Ji=12;var Vi=function(t,e){let i,s,a,o,r,h,d,l,u,p,c,y,w,m,g,x,k,b,v,A,S,M,C,$;const I=t.state;i=t.next_in,C=t.input,s=i+(t.avail_in-5),a=t.next_out,$=t.output,o=a-(e-t.avail_out),r=a+(t.avail_out-257),h=I.dmax,d=I.wsize,l=I.whave,u=I.wnext,p=I.window,c=I.hold,y=I.bits,w=I.lencode,m=I.distcode,g=(1<<I.lenbits)-1,x=(1<<I.distbits)-1;t:do{y<15&&(c+=C[i++]<<y,y+=8,c+=C[i++]<<y,y+=8),k=w[c&g];e:for(;;){if(b=k>>>24,c>>>=b,y-=b,b=k>>>16&255,b===0)$[a++]=k&65535;else if(b&16){v=k&65535,b&=15,b&&(y<b&&(c+=C[i++]<<y,y+=8),v+=c&(1<<b)-1,c>>>=b,y-=b),y<15&&(c+=C[i++]<<y,y+=8,c+=C[i++]<<y,y+=8),k=m[c&x];n:for(;;){if(b=k>>>24,c>>>=b,y-=b,b=k>>>16&255,b&16){if(A=k&65535,b&=15,y<b&&(c+=C[i++]<<y,y+=8,y<b&&(c+=C[i++]<<y,y+=8)),A+=c&(1<<b)-1,A>h){t.msg="invalid distance too far back",I.mode=Et;break t}if(c>>>=b,y-=b,b=a-o,A>b){if(b=A-b,b>l&&I.sane){t.msg="invalid distance too far back",I.mode=Et;break t}if(S=0,M=p,u===0){if(S+=d-b,b<v){v-=b;do $[a++]=p[S++];while(--b);S=a-A,M=$}}else if(u<b){if(S+=d+u-b,b-=u,b<v){v-=b;do $[a++]=p[S++];while(--b);if(S=0,u<v){b=u,v-=b;do $[a++]=p[S++];while(--b);S=a-A,M=$}}}else if(S+=u-b,b<v){v-=b;do $[a++]=p[S++];while(--b);S=a-A,M=$}for(;v>2;)$[a++]=M[S++],$[a++]=M[S++],$[a++]=M[S++],v-=3;v&&($[a++]=M[S++],v>1&&($[a++]=M[S++]))}else{S=a-A;do $[a++]=$[S++],$[a++]=$[S++],$[a++]=$[S++],v-=3;while(v>2);v&&($[a++]=$[S++],v>1&&($[a++]=$[S++]))}}else if(b&64){t.msg="invalid distance code",I.mode=Et;break t}else{k=m[(k&65535)+(c&(1<<b)-1)];continue n}break}}else if(b&64)if(b&32){I.mode=Ji;break t}else{t.msg="invalid literal/length code",I.mode=Et;break t}else{k=w[(k&65535)+(c&(1<<b)-1)];continue e}break}}while(i<s&&a<r);v=y>>3,i-=v,y-=v<<3,c&=(1<<y)-1,t.next_in=i,t.next_out=a,t.avail_in=i<s?5+(s-i):5-(i-s),t.avail_out=a<r?257+(r-a):257-(a-r),I.hold=c,I.bits=y};const it=15,$e=852,Ie=592,Me=0,Ut=1,Ce=2,Qi=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),ts=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),es=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),ns=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]),is=(n,t,e,i,s,a,o,r)=>{const h=r.bits;let d=0,l=0,u=0,p=0,c=0,y=0,w=0,m=0,g=0,x=0,k,b,v,A,S,M=null,C=0,$;const I=new Uint16Array(it+1),Q=new Uint16Array(it+1);let kt=null,_e=0,Ae,St,vt;for(d=0;d<=it;d++)I[d]=0;for(l=0;l<i;l++)I[t[e+l]]++;for(c=h,p=it;p>=1&&I[p]===0;p--);if(c>p&&(c=p),p===0)return s[a++]=1<<24|64<<16|0,s[a++]=1<<24|64<<16|0,r.bits=1,0;for(u=1;u<p&&I[u]===0;u++);for(c<u&&(c=u),m=1,d=1;d<=it;d++)if(m<<=1,m-=I[d],m<0)return-1;if(m>0&&(n===Me||p!==1))return-1;for(Q[1]=0,d=1;d<it;d++)Q[d+1]=Q[d]+I[d];for(l=0;l<i;l++)t[e+l]!==0&&(o[Q[t[e+l]]++]=l);if(n===Me?(M=kt=o,$=19):n===Ut?(M=Qi,C-=257,kt=ts,_e-=257,$=256):(M=es,kt=ns,$=-1),x=0,l=0,d=u,S=a,y=c,w=0,v=-1,g=1<<c,A=g-1,n===Ut&&g>$e||n===Ce&&g>Ie)return 1;for(;;){Ae=d-w,o[l]<$?(St=0,vt=o[l]):o[l]>$?(St=kt[_e+o[l]],vt=M[C+o[l]]):(St=96,vt=0),k=1<<d-w,b=1<<y,u=b;do b-=k,s[S+(x>>w)+b]=Ae<<24|St<<16|vt|0;while(b!==0);for(k=1<<d-1;x&k;)k>>=1;if(k!==0?(x&=k-1,x+=k):x=0,l++,--I[d]===0){if(d===p)break;d=t[e+o[l]]}if(d>c&&(x&A)!==v){for(w===0&&(w=c),S+=u,y=d-w,m=1<<y;y+w<p&&(m-=I[y+w],!(m<=0));)y++,m<<=1;if(g+=1<<y,n===Ut&&g>$e||n===Ce&&g>Ie)return 1;v=x&A,s[v]=c<<24|y<<16|S-a|0}}return x!==0&&(s[S+x]=d-w<<24|64<<16|0),r.bits=c,0};var gt=is;const ss=0,Bn=1,On=2,{Z_FINISH:Te,Z_BLOCK:as,Z_TREES:_t,Z_OK:et,Z_STREAM_END:os,Z_NEED_DICT:rs,Z_STREAM_ERROR:H,Z_DATA_ERROR:Nn,Z_MEM_ERROR:Fn,Z_BUF_ERROR:cs,Z_DEFLATED:Re}=Dn,jn=1,De=2,Le=3,Pe=4,Be=5,Oe=6,Ne=7,Fe=8,je=9,He=10,Lt=11,W=12,Wt=13,ze=14,Xt=15,Ue=16,We=17,Xe=18,Ge=19,At=20,$t=21,Ye=22,Ze=23,Ke=24,qe=25,Je=26,Gt=27,Ve=28,Qe=29,R=30,Hn=31,ls=32,ds=852,hs=592,fs=15,ps=fs,tn=n=>(n>>>24&255)+(n>>>8&65280)+((n&65280)<<8)+((n&255)<<24);function us(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}const zn=n=>{if(!n||!n.state)return H;const t=n.state;return n.total_in=n.total_out=t.total=0,n.msg="",t.wrap&&(n.adler=t.wrap&1),t.mode=jn,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new Int32Array(ds),t.distcode=t.distdyn=new Int32Array(hs),t.sane=1,t.back=-1,et},Un=n=>{if(!n||!n.state)return H;const t=n.state;return t.wsize=0,t.whave=0,t.wnext=0,zn(n)},Wn=(n,t)=>{let e;if(!n||!n.state)return H;const i=n.state;return t<0?(e=0,t=-t):(e=(t>>4)+1,t<48&&(t&=15)),t&&(t<8||t>15)?H:(i.window!==null&&i.wbits!==t&&(i.window=null),i.wrap=e,i.wbits=t,Un(n))},Xn=(n,t)=>{if(!n)return H;const e=new us;n.state=e,e.window=null;const i=Wn(n,t);return i!==et&&(n.state=null),i},gs=n=>Xn(n,ps);let en=!0,Yt,Zt;const ms=n=>{if(en){Yt=new Int32Array(512),Zt=new Int32Array(32);let t=0;for(;t<144;)n.lens[t++]=8;for(;t<256;)n.lens[t++]=9;for(;t<280;)n.lens[t++]=7;for(;t<288;)n.lens[t++]=8;for(gt(Bn,n.lens,0,288,Yt,0,n.work,{bits:9}),t=0;t<32;)n.lens[t++]=5;gt(On,n.lens,0,32,Zt,0,n.work,{bits:5}),en=!1}n.lencode=Yt,n.lenbits=9,n.distcode=Zt,n.distbits=5},Gn=(n,t,e,i)=>{let s;const a=n.state;return a.window===null&&(a.wsize=1<<a.wbits,a.wnext=0,a.whave=0,a.window=new Uint8Array(a.wsize)),i>=a.wsize?(a.window.set(t.subarray(e-a.wsize,e),0),a.wnext=0,a.whave=a.wsize):(s=a.wsize-a.wnext,s>i&&(s=i),a.window.set(t.subarray(e-i,e-i+s),a.wnext),i-=s,i?(a.window.set(t.subarray(e-i,e),0),a.wnext=i,a.whave=a.wsize):(a.wnext+=s,a.wnext===a.wsize&&(a.wnext=0),a.whave<a.wsize&&(a.whave+=s))),0},bs=(n,t)=>{let e,i,s,a,o,r,h,d,l,u,p,c,y,w,m=0,g,x,k,b,v,A,S,M;const C=new Uint8Array(4);let $,I;const Q=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(!n||!n.state||!n.output||!n.input&&n.avail_in!==0)return H;e=n.state,e.mode===W&&(e.mode=Wt),o=n.next_out,s=n.output,h=n.avail_out,a=n.next_in,i=n.input,r=n.avail_in,d=e.hold,l=e.bits,u=r,p=h,M=et;t:for(;;)switch(e.mode){case jn:if(e.wrap===0){e.mode=Wt;break}for(;l<16;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if(e.wrap&2&&d===35615){e.check=0,C[0]=d&255,C[1]=d>>>8&255,e.check=z(e.check,C,2,0),d=0,l=0,e.mode=De;break}if(e.flags=0,e.head&&(e.head.done=!1),!(e.wrap&1)||(((d&255)<<8)+(d>>8))%31){n.msg="incorrect header check",e.mode=R;break}if((d&15)!==Re){n.msg="unknown compression method",e.mode=R;break}if(d>>>=4,l-=4,S=(d&15)+8,e.wbits===0)e.wbits=S;else if(S>e.wbits){n.msg="invalid window size",e.mode=R;break}e.dmax=1<<e.wbits,n.adler=e.check=1,e.mode=d&512?He:W,d=0,l=0;break;case De:for(;l<16;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if(e.flags=d,(e.flags&255)!==Re){n.msg="unknown compression method",e.mode=R;break}if(e.flags&57344){n.msg="unknown header flags set",e.mode=R;break}e.head&&(e.head.text=d>>8&1),e.flags&512&&(C[0]=d&255,C[1]=d>>>8&255,e.check=z(e.check,C,2,0)),d=0,l=0,e.mode=Le;case Le:for(;l<32;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}e.head&&(e.head.time=d),e.flags&512&&(C[0]=d&255,C[1]=d>>>8&255,C[2]=d>>>16&255,C[3]=d>>>24&255,e.check=z(e.check,C,4,0)),d=0,l=0,e.mode=Pe;case Pe:for(;l<16;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}e.head&&(e.head.xflags=d&255,e.head.os=d>>8),e.flags&512&&(C[0]=d&255,C[1]=d>>>8&255,e.check=z(e.check,C,2,0)),d=0,l=0,e.mode=Be;case Be:if(e.flags&1024){for(;l<16;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}e.length=d,e.head&&(e.head.extra_len=d),e.flags&512&&(C[0]=d&255,C[1]=d>>>8&255,e.check=z(e.check,C,2,0)),d=0,l=0}else e.head&&(e.head.extra=null);e.mode=Oe;case Oe:if(e.flags&1024&&(c=e.length,c>r&&(c=r),c&&(e.head&&(S=e.head.extra_len-e.length,e.head.extra||(e.head.extra=new Uint8Array(e.head.extra_len)),e.head.extra.set(i.subarray(a,a+c),S)),e.flags&512&&(e.check=z(e.check,i,c,a)),r-=c,a+=c,e.length-=c),e.length))break t;e.length=0,e.mode=Ne;case Ne:if(e.flags&2048){if(r===0)break t;c=0;do S=i[a+c++],e.head&&S&&e.length<65536&&(e.head.name+=String.fromCharCode(S));while(S&&c<r);if(e.flags&512&&(e.check=z(e.check,i,c,a)),r-=c,a+=c,S)break t}else e.head&&(e.head.name=null);e.length=0,e.mode=Fe;case Fe:if(e.flags&4096){if(r===0)break t;c=0;do S=i[a+c++],e.head&&S&&e.length<65536&&(e.head.comment+=String.fromCharCode(S));while(S&&c<r);if(e.flags&512&&(e.check=z(e.check,i,c,a)),r-=c,a+=c,S)break t}else e.head&&(e.head.comment=null);e.mode=je;case je:if(e.flags&512){for(;l<16;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if(d!==(e.check&65535)){n.msg="header crc mismatch",e.mode=R;break}d=0,l=0}e.head&&(e.head.hcrc=e.flags>>9&1,e.head.done=!0),n.adler=e.check=0,e.mode=W;break;case He:for(;l<32;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}n.adler=e.check=tn(d),d=0,l=0,e.mode=Lt;case Lt:if(e.havedict===0)return n.next_out=o,n.avail_out=h,n.next_in=a,n.avail_in=r,e.hold=d,e.bits=l,rs;n.adler=e.check=1,e.mode=W;case W:if(t===as||t===_t)break t;case Wt:if(e.last){d>>>=l&7,l-=l&7,e.mode=Gt;break}for(;l<3;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}switch(e.last=d&1,d>>>=1,l-=1,d&3){case 0:e.mode=ze;break;case 1:if(ms(e),e.mode=At,t===_t){d>>>=2,l-=2;break t}break;case 2:e.mode=We;break;case 3:n.msg="invalid block type",e.mode=R}d>>>=2,l-=2;break;case ze:for(d>>>=l&7,l-=l&7;l<32;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if((d&65535)!==(d>>>16^65535)){n.msg="invalid stored block lengths",e.mode=R;break}if(e.length=d&65535,d=0,l=0,e.mode=Xt,t===_t)break t;case Xt:e.mode=Ue;case Ue:if(c=e.length,c){if(c>r&&(c=r),c>h&&(c=h),c===0)break t;s.set(i.subarray(a,a+c),o),r-=c,a+=c,h-=c,o+=c,e.length-=c;break}e.mode=W;break;case We:for(;l<14;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if(e.nlen=(d&31)+257,d>>>=5,l-=5,e.ndist=(d&31)+1,d>>>=5,l-=5,e.ncode=(d&15)+4,d>>>=4,l-=4,e.nlen>286||e.ndist>30){n.msg="too many length or distance symbols",e.mode=R;break}e.have=0,e.mode=Xe;case Xe:for(;e.have<e.ncode;){for(;l<3;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}e.lens[Q[e.have++]]=d&7,d>>>=3,l-=3}for(;e.have<19;)e.lens[Q[e.have++]]=0;if(e.lencode=e.lendyn,e.lenbits=7,$={bits:e.lenbits},M=gt(ss,e.lens,0,19,e.lencode,0,e.work,$),e.lenbits=$.bits,M){n.msg="invalid code lengths set",e.mode=R;break}e.have=0,e.mode=Ge;case Ge:for(;e.have<e.nlen+e.ndist;){for(;m=e.lencode[d&(1<<e.lenbits)-1],g=m>>>24,x=m>>>16&255,k=m&65535,!(g<=l);){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if(k<16)d>>>=g,l-=g,e.lens[e.have++]=k;else{if(k===16){for(I=g+2;l<I;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if(d>>>=g,l-=g,e.have===0){n.msg="invalid bit length repeat",e.mode=R;break}S=e.lens[e.have-1],c=3+(d&3),d>>>=2,l-=2}else if(k===17){for(I=g+3;l<I;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}d>>>=g,l-=g,S=0,c=3+(d&7),d>>>=3,l-=3}else{for(I=g+7;l<I;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}d>>>=g,l-=g,S=0,c=11+(d&127),d>>>=7,l-=7}if(e.have+c>e.nlen+e.ndist){n.msg="invalid bit length repeat",e.mode=R;break}for(;c--;)e.lens[e.have++]=S}}if(e.mode===R)break;if(e.lens[256]===0){n.msg="invalid code -- missing end-of-block",e.mode=R;break}if(e.lenbits=9,$={bits:e.lenbits},M=gt(Bn,e.lens,0,e.nlen,e.lencode,0,e.work,$),e.lenbits=$.bits,M){n.msg="invalid literal/lengths set",e.mode=R;break}if(e.distbits=6,e.distcode=e.distdyn,$={bits:e.distbits},M=gt(On,e.lens,e.nlen,e.ndist,e.distcode,0,e.work,$),e.distbits=$.bits,M){n.msg="invalid distances set",e.mode=R;break}if(e.mode=At,t===_t)break t;case At:e.mode=$t;case $t:if(r>=6&&h>=258){n.next_out=o,n.avail_out=h,n.next_in=a,n.avail_in=r,e.hold=d,e.bits=l,Vi(n,p),o=n.next_out,s=n.output,h=n.avail_out,a=n.next_in,i=n.input,r=n.avail_in,d=e.hold,l=e.bits,e.mode===W&&(e.back=-1);break}for(e.back=0;m=e.lencode[d&(1<<e.lenbits)-1],g=m>>>24,x=m>>>16&255,k=m&65535,!(g<=l);){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if(x&&!(x&240)){for(b=g,v=x,A=k;m=e.lencode[A+((d&(1<<b+v)-1)>>b)],g=m>>>24,x=m>>>16&255,k=m&65535,!(b+g<=l);){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}d>>>=b,l-=b,e.back+=b}if(d>>>=g,l-=g,e.back+=g,e.length=k,x===0){e.mode=Je;break}if(x&32){e.back=-1,e.mode=W;break}if(x&64){n.msg="invalid literal/length code",e.mode=R;break}e.extra=x&15,e.mode=Ye;case Ye:if(e.extra){for(I=e.extra;l<I;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}e.length+=d&(1<<e.extra)-1,d>>>=e.extra,l-=e.extra,e.back+=e.extra}e.was=e.length,e.mode=Ze;case Ze:for(;m=e.distcode[d&(1<<e.distbits)-1],g=m>>>24,x=m>>>16&255,k=m&65535,!(g<=l);){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if(!(x&240)){for(b=g,v=x,A=k;m=e.distcode[A+((d&(1<<b+v)-1)>>b)],g=m>>>24,x=m>>>16&255,k=m&65535,!(b+g<=l);){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}d>>>=b,l-=b,e.back+=b}if(d>>>=g,l-=g,e.back+=g,x&64){n.msg="invalid distance code",e.mode=R;break}e.offset=k,e.extra=x&15,e.mode=Ke;case Ke:if(e.extra){for(I=e.extra;l<I;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}e.offset+=d&(1<<e.extra)-1,d>>>=e.extra,l-=e.extra,e.back+=e.extra}if(e.offset>e.dmax){n.msg="invalid distance too far back",e.mode=R;break}e.mode=qe;case qe:if(h===0)break t;if(c=p-h,e.offset>c){if(c=e.offset-c,c>e.whave&&e.sane){n.msg="invalid distance too far back",e.mode=R;break}c>e.wnext?(c-=e.wnext,y=e.wsize-c):y=e.wnext-c,c>e.length&&(c=e.length),w=e.window}else w=s,y=o-e.offset,c=e.length;c>h&&(c=h),h-=c,e.length-=c;do s[o++]=w[y++];while(--c);e.length===0&&(e.mode=$t);break;case Je:if(h===0)break t;s[o++]=e.length,h--,e.mode=$t;break;case Gt:if(e.wrap){for(;l<32;){if(r===0)break t;r--,d|=i[a++]<<l,l+=8}if(p-=h,n.total_out+=p,e.total+=p,p&&(n.adler=e.check=e.flags?z(e.check,s,p,o-p):re(e.check,s,p,o-p)),p=h,(e.flags?d:tn(d))!==e.check){n.msg="incorrect data check",e.mode=R;break}d=0,l=0}e.mode=Ve;case Ve:if(e.wrap&&e.flags){for(;l<32;){if(r===0)break t;r--,d+=i[a++]<<l,l+=8}if(d!==(e.total&4294967295)){n.msg="incorrect length check",e.mode=R;break}d=0,l=0}e.mode=Qe;case Qe:M=os;break t;case R:M=Nn;break t;case Hn:return Fn;case ls:default:return H}return n.next_out=o,n.avail_out=h,n.next_in=a,n.avail_in=r,e.hold=d,e.bits=l,(e.wsize||p!==n.avail_out&&e.mode<R&&(e.mode<Gt||t!==Te))&&Gn(n,n.output,n.next_out,p-n.avail_out),u-=n.avail_in,p-=n.avail_out,n.total_in+=u,n.total_out+=p,e.total+=p,e.wrap&&p&&(n.adler=e.check=e.flags?z(e.check,s,p,n.next_out-p):re(e.check,s,p,n.next_out-p)),n.data_type=e.bits+(e.last?64:0)+(e.mode===W?128:0)+(e.mode===At||e.mode===Xt?256:0),(u===0&&p===0||t===Te)&&M===et&&(M=cs),M},ys=n=>{if(!n||!n.state)return H;let t=n.state;return t.window&&(t.window=null),n.state=null,et},ws=(n,t)=>{if(!n||!n.state)return H;const e=n.state;return e.wrap&2?(e.head=t,t.done=!1,et):H},xs=(n,t)=>{const e=t.length;let i,s,a;return!n||!n.state||(i=n.state,i.wrap!==0&&i.mode!==Lt)?H:i.mode===Lt&&(s=1,s=re(s,t,e,0),s!==i.check)?Nn:(a=Gn(n,t,e,e),a?(i.mode=Hn,Fn):(i.havedict=1,et))};var ks=Un,Ss=Wn,vs=zn,Es=gs,_s=Xn,As=bs,$s=ys,Is=ws,Ms=xs,Cs="pako inflate (from Nodeca project)",G={inflateReset:ks,inflateReset2:Ss,inflateResetKeep:vs,inflateInit:Es,inflateInit2:_s,inflate:As,inflateEnd:$s,inflateGetHeader:Is,inflateSetDictionary:Ms,inflateInfo:Cs};function Ts(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}var Rs=Ts;const Yn=Object.prototype.toString,{Z_NO_FLUSH:Ds,Z_FINISH:Ls,Z_OK:yt,Z_STREAM_END:Kt,Z_NEED_DICT:qt,Z_STREAM_ERROR:Ps,Z_DATA_ERROR:nn,Z_MEM_ERROR:Bs}=Dn;function Nt(n){this.options=Ln.assign({chunkSize:1024*64,windowBits:15,to:""},n||{});const t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,t.windowBits===0&&(t.windowBits=-15)),t.windowBits>=0&&t.windowBits<16&&!(n&&n.windowBits)&&(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&(t.windowBits&15||(t.windowBits|=15)),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new qi,this.strm.avail_out=0;let e=G.inflateInit2(this.strm,t.windowBits);if(e!==yt)throw new Error(ce[e]);if(this.header=new Rs,G.inflateGetHeader(this.strm,this.header),t.dictionary&&(typeof t.dictionary=="string"?t.dictionary=le.string2buf(t.dictionary):Yn.call(t.dictionary)==="[object ArrayBuffer]"&&(t.dictionary=new Uint8Array(t.dictionary)),t.raw&&(e=G.inflateSetDictionary(this.strm,t.dictionary),e!==yt)))throw new Error(ce[e])}Nt.prototype.push=function(n,t){const e=this.strm,i=this.options.chunkSize,s=this.options.dictionary;let a,o,r;if(this.ended)return!1;for(t===~~t?o=t:o=t===!0?Ls:Ds,Yn.call(n)==="[object ArrayBuffer]"?e.input=new Uint8Array(n):e.input=n,e.next_in=0,e.avail_in=e.input.length;;){for(e.avail_out===0&&(e.output=new Uint8Array(i),e.next_out=0,e.avail_out=i),a=G.inflate(e,o),a===qt&&s&&(a=G.inflateSetDictionary(e,s),a===yt?a=G.inflate(e,o):a===nn&&(a=qt));e.avail_in>0&&a===Kt&&e.state.wrap>0&&n[e.next_in]!==0;)G.inflateReset(e),a=G.inflate(e,o);switch(a){case Ps:case nn:case qt:case Bs:return this.onEnd(a),this.ended=!0,!1}if(r=e.avail_out,e.next_out&&(e.avail_out===0||a===Kt))if(this.options.to==="string"){let h=le.utf8border(e.output,e.next_out),d=e.next_out-h,l=le.buf2string(e.output,h);e.next_out=d,e.avail_out=i-d,d&&e.output.set(e.output.subarray(h,h+d),0),this.onData(l)}else this.onData(e.output.length===e.next_out?e.output:e.output.subarray(0,e.next_out));if(!(a===yt&&r===0)){if(a===Kt)return a=G.inflateEnd(this.strm),this.onEnd(a),this.ended=!0,!0;if(e.avail_in===0)break}}return!0};Nt.prototype.onData=function(n){this.chunks.push(n)};Nt.prototype.onEnd=function(n){n===yt&&(this.options.to==="string"?this.result=this.chunks.join(""):this.result=Ln.flattenChunks(this.chunks)),this.chunks=[],this.err=n,this.msg=this.strm.msg};function Os(n,t){const e=new Nt(t);if(e.push(n),e.err)throw e.msg||ce[e.err];return e.result}var Ns=Os,Fs={inflate:Ns};const{inflate:js}=Fs;var Zn=js;const Hs="svg-source:excalidraw",zs="application/vnd.excalidraw+json",Kn=/<!-- payload-start -->\s*([\s\S]+?)\s*<!-- payload-end -->/,Us=/<!-- payload-version:(\d+) -->/;class F extends Error{constructor(t,e){super(`scene:${t}${e?` (${e})`:""}`),this.reason=t,this.detail=e,this.name="SceneError"}}function be(n){const t=new Uint8Array(n.length);for(let e=0;e<n.length;e++)t[e]=n.charCodeAt(e)&255;return t}function qn(n){return new TextDecoder("utf-8").decode(be(n))}function Ws(n,t){const e=atob(n);return t?Zn(be(e),{to:"string"}):qn(e)}function Xs(n){return n.includes(Hs)&&Kn.test(n)}function Jn(n){if(!Xs(n))return!1;try{return Gs(n).elements.length>0}catch{return!1}}function Gs(n){if(!n.includes(zs))throw new F("no-payload");const t=Us.exec(n),e=t?Number(t[1]):1,i=Kn.exec(n);if(!i)throw new F("no-payload","缺 payload-start/end 标记");let s;try{s=e===1?Ws(i[1],!1):atob(i[1])}catch(h){throw new F("bad-payload",h instanceof Error?h.message:String(h))}let a;try{a=JSON.parse(s)}catch{throw new F("bad-payload","载荷不是合法 JSON")}if(!a||typeof a!="object")throw new F("bad-payload","载荷不是对象");const o=Ys(a);if(o.type!=="excalidraw")throw new F("wrong-type",String(o.type));if(!Array.isArray(o.elements))throw new F("bad-payload","scene 缺 elements 数组");return{elements:o.elements,appState:o.appState&&typeof o.appState=="object"?o.appState:{},files:o.files&&typeof o.files=="object"?o.files:{}}}function Ys(n){if(!("encoded"in n)){if(n.type==="excalidraw")return n;throw new F("wrong-type",typeof n.type=="string"?n.type:"unknown")}const t=n.encoding;if(t!=="bstring")throw new F("unsupported-encoding",String(t));const e=n.encoded;if(typeof e!="string")throw new F("bad-payload","encoded 字段不是字符串");const i=n.compressed===!0;let s;try{s=i?Zn(be(e),{to:"string"}):qn(e)}catch(o){throw new F("bad-payload",o instanceof Error?o.message:String(o))}let a;try{a=JSON.parse(s)}catch{throw new F("bad-payload","scene JSON 解析失败")}if(!a||typeof a!="object")throw new F("bad-payload","scene 不是对象");return a}const Zs=".excalidrawlib",Ks=`local${Zs}`;function sn(n){let t=[];try{const e=JSON.parse(n);if(Array.isArray(e))t=e;else if(e&&typeof e=="object"){const i=e;Array.isArray(i.libraryItems)?t=i.libraryItems:Array.isArray(i.library)&&(t=i.library)}}catch{}return Vs(t)}function qs(n){if(!n||typeof n!="object")return"";const t=n;return`${typeof t.id=="string"?t.id:""}:${typeof t.versionNonce=="number"?t.versionNonce:""}`}function Jt(n){const t=n.map(qs).sort().join("|");let e=2166136261,i=2166136261;for(let s=0;s<t.length;s++){const a=t.charCodeAt(s);e=Math.imul(e^a,16777619)>>>0,i=Math.imul(i^a,2246822507)>>>0}return`lib-${e.toString(16).padStart(8,"0")}${i.toString(16).padStart(8,"0")}`}function de(n){return!!n&&typeof n=="object"&&typeof n.type=="string"}function Js(n){return Object.keys(n).filter(t=>/^\d+$/.test(t)).sort((t,e)=>Number(t)-Number(e)).map(t=>n[t]).filter(de)}function Vs(n,t="published"){const e=[];for(const i of n){if(Array.isArray(i)){const s=i.filter(de);if(s.length===0)continue;e.push({id:Jt(s),status:t,elements:s,created:Date.now()});continue}if(i&&typeof i=="object"){const s=i;if(Array.isArray(s.elements)){const o=s.elements.filter(de);if(o.length===0)continue;e.push({...s,elements:o,id:typeof s.id=="string"&&s.id!==""?s.id:Jt(o),status:typeof s.status=="string"?s.status:t,created:typeof s.created=="number"?s.created:Date.now()});continue}const a=Js(s);a.length>0&&e.push({id:Jt(a),status:t,elements:a,created:Date.now()});continue}}return e}function an(n,t="siyuan-excali-studio"){return JSON.stringify({type:"excalidrawlib",version:2,source:t,libraryItems:n},null,2)}function Rt(n){if(n&&typeof n=="object"){const t=n.id;if(typeof t=="string"&&t!=="")return t}return null}function Qs(n){const t=[],e=new Map,i=new Map,s=n[0]?.path??"";for(const a of n){i.set(a.path,a.items);const o=a.path===s;for(const r of a.items){const h=Rt(r);if(h!==null&&e.has(h)){console.warn(`[excali-studio] 模板库条目 id 重复（${h}，来自 ${a.path}），保留先到的一份`);continue}h!==null&&e.set(h,a.path),t.push(o?r:{...r,status:"published"})}}return{items:t,sourceOf:e,byPath:i}}function ta(n,t,e){const i=new Map,s=[];for(const r of t){const h=Rt(r);if(h===null){s.push(r);continue}n.sourceOf.has(h)||s.push(r),i.set(h,r)}const a=new Set;for(const r of n.items){const h=Rt(r),d=h!==null&&n.sourceOf.get(h)||e,l=h!==null?i.get(h):void 0;(!l||JSON.stringify(l)!==JSON.stringify(r))&&a.add(d)}s.length>0&&a.add(e);const o=[];for(const r of[...a].sort()){const h=n.byPath.get(r)??[],d=[];for(const l of h){const u=Rt(l);if(u!==null&&n.sourceOf.get(u)!==r){d.push(l);continue}const p=u!==null?i.get(u):void 0;p&&d.push(r===e?p:{...p,status:"published"})}if(r===e)for(const l of s)d.unshift(l);o.push({path:r,items:d})}return o}const on="exs:script-pin-changed",Vt="exs:rail-view-changed",ea="exs:highlighter-changed",na=0,Dt={color:"#ffd43b",width:4,opacity:45},ia=/^#[0-9a-fA-F]{6}$/;function rn(n,t,e,i){return Number.isFinite(n)?Math.min(e,Math.max(t,n)):i}function Pt(n){const t=n&&typeof n=="object"?n:{};return{color:typeof t.color=="string"&&ia.test(t.color.trim())?t.color.trim().toLowerCase():Dt.color,width:rn(Number(t.width),1,12,Dt.width),opacity:rn(Number(t.opacity),10,100,Dt.opacity)}}const sa="M2.5,7.5L16,7.5L16,19.5L2.5,19.5ZM5.5,11.5L12,11.5M5.5,15.5L9,15.5M17.5,12L22,7.5M18.5,7.5L22,7.5L22,11",aa="M3.5,6A2.5,2.5 0 0 1 6,3.5L12.5,3.5A2.5,2.5 0 0 1 15,6L15,17A2.5,2.5 0 0 1 12.5,19.5L6,19.5A2.5,2.5 0 0 1 3.5,17ZM19.5,9.5C19.5,9.5 21.5,12 21.5,13.5A2,2 0 0 1 17.5,13.5C17.5,12 19.5,9.5 19.5,9.5Z",oa="M3.5,5.5L13,5.5L13,19L3.5,19ZM6,16.2L8.6,13L10.6,15L11.8,13.6M15.2,17.8L20.4,12.6A1.7,1.7 0 0 0 18,10.2L12.8,15.4L12.2,18.4Z",cn="M8.4,12A3.6,3.6 0 1 0 15.6,12A3.6,3.6 0 1 0 8.4,12M12,3.5L12,6M12,18L12,20.5M3.5,12L6,12M18,12L20.5,12M5.9,5.9L7.7,7.7M16.3,16.3L18.1,18.1M18.1,5.9L16.3,7.7M7.7,16.3L5.9,18.1",ra="M4.5,19.5L4.5,16.3L12.8,8.0L16.2,11.4L8.0,19.5ZM10.2,10.6L13.6,14.0",ca="M5,6L7.5,6M10.5,6L19,6M5,12L7.5,12M10.5,12L19,12M5,18L7.5,18M10.5,18L19,18",la="M3.5,5.5L20.5,5.5L20.5,18.5L3.5,18.5ZM7,9.5L11,9.5L11,13.5L7,13.5ZM13.5,11L17,11L17,15L13.5,15Z",da={"text-numbering.md":ca,"box-selection.md":la,"highlighter.md":ra},ln="M9.5,3.5L14.5,3.5L16,7L8,7ZM10,7L10.8,14L13.2,14L14,7M12,14L12,20.5",ye="insert-board-card",Vn="outline-color",Qn="image-to-material",ti=[{id:ye,title:"插入白板卡片",desc:"从白板库挑一块，在当前画布中心插一张能点开的卡片",icon:sa},{id:Vn,title:"仅外框颜色",desc:"只改选中图形的边框色，文字颜色保持不变",icon:aa},{id:Qn,title:"图片转笔画素材",desc:"把选中的图片描成可改色的原生笔画，可替换到画布或加入素材库",icon:oa}],ei=[ye];function he(n){return typeof n=="string"&&ti.some(t=>t.id===n)}function ha(n){if(!Array.isArray(n))return[...ei];const t=[];for(const e of n)he(e)&&!t.includes(e)&&t.push(e);return t}const fa=["agent","mcp","cli","script"],ni={agent:!0,mcp:!0,cli:!0,script:!0};function pa(n){const t=n&&typeof n=="object"?n:{},e={...ni};for(const i of fa)t[i]===!1?e[i]=!1:t[i]===!0&&(e[i]=!0);return e}const at="assets/excali";function ii(n){return String(n??"").trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/^data\//i,"").replace(/\/+$/,"")}const L={saveDir:at,accentStroke:!0,showWelcome:!0,keepBackup:!0,gridModeEnabled:!1,boardDir:"/Excali 白板",autoOpenBoard:!1,autoCreateDoc:!1,stencilMigrated:!1,pinnedScripts:[],pinnedActions:[...ei],scriptRailCollapsed:!1,scriptRailTop:.09,scriptSettings:{},builtinSnapshot:{},highlighter:{...Dt},imageBaseUrl:"",imageModel:"gpt-image-1",imageApiKey:"",imageSize:"1024x1024",aiChannels:{...ni}};function st(n){const t=n&&typeof n=="object"?n:{},e=typeof t.saveDir=="string"?ii(t.saveDir):"",i=e!==""?e:L.saveDir,s=typeof t.boardDir=="string"&&t.boardDir.trim()!==""?t.boardDir.trim():L.boardDir,a={};if(t.scriptSettings&&typeof t.scriptSettings=="object")for(const[r,h]of Object.entries(t.scriptSettings).slice(0,50)){if(!h||typeof h!="object")continue;const d={};for(const[l,u]of Object.entries(h).slice(0,20))(typeof u=="string"||typeof u=="number"||typeof u=="boolean")&&(d[l]=u);a[r]=d}const o={};if(t.builtinSnapshot&&typeof t.builtinSnapshot=="object")for(const[r,h]of Object.entries(t.builtinSnapshot).slice(0,100))r!==""&&typeof h=="number"&&Number.isFinite(h)&&(o[r]=h);return{saveDir:i,accentStroke:typeof t.accentStroke=="boolean"?t.accentStroke:L.accentStroke,showWelcome:typeof t.showWelcome=="boolean"?t.showWelcome:L.showWelcome,keepBackup:typeof t.keepBackup=="boolean"?t.keepBackup:L.keepBackup,gridModeEnabled:typeof t.gridModeEnabled=="boolean"?t.gridModeEnabled:L.gridModeEnabled,boardDir:s,autoOpenBoard:typeof t.autoOpenBoard=="boolean"?t.autoOpenBoard:L.autoOpenBoard,autoCreateDoc:typeof t.autoCreateDoc=="boolean"?t.autoCreateDoc:L.autoCreateDoc,stencilMigrated:typeof t.stencilMigrated=="boolean"?t.stencilMigrated:L.stencilMigrated,pinnedScripts:Array.isArray(t.pinnedScripts)?t.pinnedScripts.filter(r=>typeof r=="string"&&r!==""):L.pinnedScripts,pinnedActions:ha(t.pinnedActions),scriptRailCollapsed:typeof t.scriptRailCollapsed=="boolean"?t.scriptRailCollapsed:L.scriptRailCollapsed,scriptRailTop:typeof t.scriptRailTop=="number"&&Number.isFinite(t.scriptRailTop)&&t.scriptRailTop>=0&&t.scriptRailTop<=.85?t.scriptRailTop:L.scriptRailTop,scriptSettings:a,builtinSnapshot:o,highlighter:Pt(t.highlighter),imageBaseUrl:typeof t.imageBaseUrl=="string"?t.imageBaseUrl.trim().replace(/\/+$/,"").slice(0,500):L.imageBaseUrl,imageModel:typeof t.imageModel=="string"&&t.imageModel.trim()!==""?t.imageModel.trim().slice(0,100):L.imageModel,imageApiKey:typeof t.imageApiKey=="string"?t.imageApiKey.trim().slice(0,500):L.imageApiKey,imageSize:typeof t.imageSize=="string"&&t.imageSize.trim()!==""?t.imageSize.trim().slice(0,32):L.imageSize,aiChannels:pa(t.aiChannels)}}const dn="board";function _(n){const t=n.replace(/^\/+/,"");return t==="data"||t.startsWith("data/")?`/${t}`:`/data/${t}`}function P(n){return n.replace(/^\/+/,"").replace(/^data\//,"")}function ua(n){return _(n)}function ga(n){return`/${P(n)}`}function T(n){return P(n).split("/").pop()||n}function J(n,t){const e=n.trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+$/,"");return`${e===""?"assets":e}/${t}`}function Qt(n,t="excali-board.svg"){return`${(String(n??"").replace(/[\\/:*?"<>|\u0000-\u001f]/g,"").replace(/^\.+/,"").trim().replace(/\.svg$/i,"")||t.replace(/\.svg$/i,"")).slice(0,80)}.svg`}const we=3;function V(n,t=1){const e=n.replace(/\.svg$/i,"");return t<=1?`${e}.svg.bak.svg`:`${e}.svg.bak${t}.svg`}function si(n){const t=_(n);return Array.from({length:we},(e,i)=>V(t,i+1))}function xe(n){return/\.bak\d*\.svg$/i.test(n)}async function te(n,t,e){const i=t.replace(/\.svg$/i,"");for(let s=0;s<50;s++){const a=_(J(n,s===0?t:`${i}_${s-1}.svg`));if(e&&a===e||!await X(a))return a}return _(J(n,t))}async function tt(n,t){const e=_(n),i=new FormData;i.append("path",e),i.append("isDir","false"),i.append("file",new Blob([t],{type:"image/svg+xml;charset=utf-8"}),e.split("/").pop()||"x.svg");const s=await fetch("/api/file/putFile",{method:"POST",body:i}),a=await s.json().catch(()=>null);if(!s.ok||!a||a.code!==0)throw new Error(a?.msg||`putFile HTTP ${s.status}`);return e}async function B(n){const t=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:_(n)})});if(!t.ok)throw new Error(`getFile HTTP ${t.status}`);const e=await t.text();if((t.headers.get("content-type")||"").includes("application/json")){let i=null;try{i=JSON.parse(e)}catch{return e}if(i&&typeof i=="object"&&"code"in i&&i.code!==0){const s=i.msg;throw new Error(s||`getFile code ${i.code}`)}}return e}async function X(n){try{const t=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:_(n)})});if(!t.ok)return!1;if((t.headers.get("content-type")||"").includes("application/json")){const e=await t.json().catch(()=>null);return!e||e.code===0}return!0}catch{return!1}}async function ke(n,t){const e=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),i=await e.json().catch(()=>null);if(!e.ok||!i||i.code!==0)throw new Error(i?.msg||`${n} HTTP ${e.status}`);return i.data}async function ot(n){const t=n.trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+$/,""),e=t===""?"assets":t,i=await ke("/api/file/readDir",{path:_(e)});return(Array.isArray(i)?i.filter(a=>a&&a.isDir!==!0&&typeof a.name=="string"&&/\.svg$/i.test(a.name)&&!xe(a.name)):[]).map(a=>({path:`${e}/${a.name}`,updated:typeof a.updated=="number"?a.updated:0})).sort((a,o)=>o.updated-a.updated)}async function ma(n){return(await ot(n)).map(t=>t.path)}async function hn(n,t){const e=n.trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+$/,""),i=e===""?"assets":e,s=await ke("/api/file/readDir",{path:_(i)});return Array.isArray(s)?s.filter(a=>a&&a.isDir!==!0&&typeof a.name=="string"&&t.test(a.name)).map(a=>`${i}/${a.name}`):[]}async function rt(n){await ke("/api/file/removeFile",{path:_(n)})}async function fn(n,t){const e=_(n),i=_(t),s=await B(e),a=await tt(i,s);if(a!==e){await rt(e);for(let o=1;o<=we;o++)try{const r=await B(V(e,o));await tt(V(a,o),r),await rt(V(e,o))}catch{}}return a}async function ba(n,t){try{const e=_(n),i=t??await B(e);if(!Jn(i))return;try{if(await B(V(e,1))===i)return}catch{}for(let s=we-1;s>=1;s--)try{const a=await B(V(e,s));await tt(V(e,s+1),a)}catch{}await tt(V(e,1),i)}catch(e){console.warn("[excali-studio] 写 .bak 失败（忽略）",e)}}async function ct(n,t){const e=_(n),i=new FormData;i.append("path",e),i.append("isDir","false"),i.append("file",new Blob([t],{type:"application/json;charset=utf-8"}),e.split("/").pop()||"x.json");const s=await fetch("/api/file/putFile",{method:"POST",body:i}),a=await s.json().catch(()=>null);if(!s.ok||!a||a.code!==0)throw new Error(a?.msg||`putFile HTTP ${s.status}`);return e}async function ya(n,t,e){const i=_(n),s=new FormData;s.append("path",i),s.append("isDir","false"),s.append("file",new Blob([t],{type:e}),i.split("/").pop()||"x.bin");const a=await fetch("/api/file/putFile",{method:"POST",body:s}),o=await a.json().catch(()=>null);if(!a.ok||!o||o.code!==0)throw new Error(o?.msg||`putFile HTTP ${a.status}`);return i}async function wa(n){const t=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:_(n)})});if(!t.ok)throw new Error(`getFile HTTP ${t.status}`);if((t.headers.get("content-type")||"").includes("application/json")){const e=await t.json().catch(()=>null);throw new Error(e?.msg||`getFile code ${e?.code??"?"}`)}return new Uint8Array(await t.arrayBuffer())}const xa="assets/excali-media";function ka(n){const t=/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]+)$/.exec(n.trim());if(!t)return null;const e=atob(t[2]),i=new Uint8Array(e.length);for(let s=0;s<e.length;s++)i[s]=e.charCodeAt(s)&255;return{mime:t[1]||"application/octet-stream",bytes:i}}function Sa(n){return{"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/svg+xml":"svg","image/bmp":"bmp","image/avif":"avif"}[n]||"bin"}async function va(n,t){const e=await crypto.subtle.digest("SHA-1",n);return`${Array.from(new Uint8Array(e.slice(0,8))).map(s=>s.toString(16).padStart(2,"0")).join("")}.${Sa(t)}`}function Ea(n,t){let e="";for(let s=0;s<n.length;s+=32768)e+=String.fromCharCode(...n.subarray(s,s+32768));return`data:${t};base64,${btoa(e)}`}function _a(){let n="";try{n=getComputedStyle(document.documentElement).getPropertyValue("--b3-theme-primary").trim()}catch{return null}return n&&/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(n)?n:null}function Aa(n){const t=String(n??"");if(!/^\d{8}(\d{6})?$/.test(t))return 0;const e=Number(t.slice(0,4)),i=Number(t.slice(4,6)),s=Number(t.slice(6,8)),a=t.length>=12?Number(t.slice(8,10)):0,o=t.length>=12?Number(t.slice(10,12)):0,r=t.length>=14?Number(t.slice(12,14)):0,h=new Date(e,i-1,s,a,o,r).getTime();return Number.isFinite(h)?h:0}function $a(n){if(typeof n!="string"||n==="")return 0;let t;try{t=JSON.parse(n)}catch{return 0}const e=t?.blocks;if(!e||typeof e!="object")return 0;const i=new Set;for(const s of Object.values(e)){const a=s?.root_id;typeof a=="string"&&a&&i.add(a)}return i.size}function Ia(n){return{docId:n.id,title:n.content||f("无标题"),hpath:n.hpath||"",svg:n.svg||"",updated:Aa(n.updated),refs:$a(n.refs)}}function Ma(n,t){const e=new Map(t.map(i=>[_(i.svg),i]));return n.map(i=>{const s=_(i.path),a=e.get(s);return{dataPath:s,name:T(i.path),docId:a?.docId??"",docTitle:a?.title??"",updated:i.updated}})}function fe(n){return n.docTitle||n.name.replace(/\.svg$/i,"")}function Ca(n,t){return n.map(e=>`${e.dataPath}\0${e.name}\0${e.docId}\0${e.docTitle}\0${e.updated}\0${t.has(e.dataPath)?1:0}`).join("")}function Ta(n,t){let e=String(n??"").trim().replace(/\\/g,"/").replace(/\/+$/,"");e!==""&&!e.startsWith("/")&&(e=`/${e}`);const i=String(t??"").trim()||f("未命名白板");return`${e}/${i}`}function pn(n){return`![[${n}]]`}function Ra(n){return String(n??"").replace(/["\r\n]/g," ").replace(/\s+/g," ").trim()}function Da(n,t){return`((${n} "${Ra(t)}"))`}function La(n){return{svgPath:n.dataPath,bakPaths:si(n.dataPath),doc:n.docId?{id:n.docId,title:n.docTitle}:null}}function Pa(n){if(typeof n!="string")return null;const t=/^siyuan:(?:\/\/)?doc\/([A-Za-z0-9-]{10,})$/.exec(n.trim());return t?t[1]??null:null}const Ba="application/x-siyuan-excali-board";function Oa(n){return n.split("/").map(t=>{try{return decodeURIComponent(t)}catch{return t}}).join("/")}function Na(n){const t=String(n??"").trim().replace(/\\/g,"/");if(t==="")return null;const e=P(_(t));return!/\.svg$/i.test(e)||xe(e)||e.split("/").some(i=>i===".."||i==="")?null:e}function Fa(n){if(typeof n!="string")return null;const t=n.trim(),e=/^siyuan:(?:\/\/)?excali\/(.+)$/.exec(t);return e?Na(Oa(e[1]??"")):null}function ja(n){const t=Fa(n);return t?_(t):null}const ut="assets";function Ha(n){return/^excali-\d{8}-\d{6}\.svg$/i.test(n)}function za(n){const t=_(n).replace(/^\/data\//,""),e=t.lastIndexOf("/");return e<0?"":t.slice(0,e)}function Ua(n,t){return za(n)===t.replace(/^\/+|\/+$/g,"")}function Wa(n,t=ut){const e=t.replace(/^\/+|\/+$/g,""),i=[],s=new Set;for(const a of[...n.recent,...n.registry,...n.docSvgs,...n.autoNamed]){if(typeof a!="string"||!/\.svg$/i.test(a)||xe(a))continue;const o=_(a);!Ua(o,e)||s.has(o)||(s.add(o),i.push(o))}return i}function Xa(n,t){const e=[],i=new Set;for(const s of n){const a=_(s),o=t.get(a)??a;i.has(o)||(i.add(o),e.push(o))}return e}let Bt=null;function Ga(n){n.eventBus.on("switch-protyle",({detail:t})=>{Bt=t.protyle}),n.eventBus.on("click-editorcontent",({detail:t})=>{Bt=t.protyle})}function ai(){if(Bt?.wysiwyg?.element?.isConnected)return Bt;const n=E.getAllEditor();for(let t=n.length-1;t>=0;t--){const e=n[t].protyle;if(e?.wysiwyg?.element?.isConnected)return e}return null}function oi(n){return n.replace(/'/g,"''")}async function Z(n,t){const e=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),i=await e.json().catch(()=>null);if(!e.ok||!i||i.code!==0)throw new Error(i?.msg||`${n} HTTP ${e.status}`);return i}async function Ya(n,t,e){const s=(await Z("/api/filetree/createDocWithMd",{notebook:n,path:t,markdown:e})).data;if(!s?.blockID)throw new Error("createDocWithMd 未返回 blockID");return s.blockID}async function Se(n){const t=await Z("/api/query/sql",{stmt:n});return Array.isArray(t.data)?t.data:[]}async function Za(n,t,e){const i=`![${e}](${t})`;return(await Z("/api/block/appendBlock",{dataType:"markdown",data:i,parentID:n})).data?.[0]?.doOperations?.find(o=>o.action==="insert")?.id??""}async function ee(n,t){await Z("/api/attr/setBlockAttrs",{id:n,attrs:t})}async function un(n,t){if(!n||!t||n===t)return 0;const e=`%${n.replace(/[\\%_]/g,"\\$&")}%`,i=await Se(`SELECT id FROM blocks WHERE content LIKE '${oi(e)}' ESCAPE '\\'`);let s=0;for(const a of i)try{const r=(await Z("/api/block/getBlockKramdown",{id:a.id})).data?.kramdown;if(typeof r!="string"||!r.includes(n))continue;await Z("/api/block/updateBlock",{id:a.id,dataType:"markdown",data:r.split(n).join(t)}),s++}catch(o){console.warn("[excali-studio] 更新资源引用失败（忽略）",a.id,o)}return s}async function Ka(n){await Z("/api/filetree/removeDoc",{id:n})}async function qa(){const t=ai()?.block?.rootID;return t&&(await Se(`SELECT box FROM blocks WHERE id = '${oi(t)}' LIMIT 1`))[0]?.box||null}async function gn(){return(await Se(`SELECT b.id, b.content, b.hpath, b.updated, a.value AS svg
     FROM blocks b
     INNER JOIN attributes a ON a.block_id = b.id AND a.name = 'custom-excali-svg'
     WHERE b.type = 'd'
     ORDER BY b.updated DESC`)).map(t=>({id:t.id,content:t.content||"",hpath:t.hpath||"",updated:Number(t.updated)||0,refs:"",svg:typeof t.svg=="string"?t.svg:""}))}async function Ja(n){const e=(await Z("/api/attr/getBlockAttrs",{id:n})).data?.attrs;return e&&typeof e=="object"?e:{}}async function Va(){const t=(await Z("/api/notebook?listNotebooks",{})).data,e=Array.isArray(t)?t.find(i=>typeof i?.id=="string"&&i.id!==""):void 0;return typeof e?.id=="string"?e.id:null}function ne(n){const t=ga(n);let e=0;return document.querySelectorAll("img").forEach(i=>{let s;try{s=new URL(i.src,location.href)}catch{return}decodeURIComponent(s.pathname)===t&&(s.searchParams.set("t",String(Date.now())),i.src=s.href,e++)}),e}function Qa(n){let t;try{t=new URL(n,location.href)}catch{return null}const e=decodeURIComponent(t.pathname);return e.startsWith("/assets/")?ua(e.replace(/^\/+/,"")):null}function to(n){for(const t of n){const e=t.tagName==="IMG"?t:t.querySelector("img");if(!e)continue;const i=Qa(e.getAttribute("src")||e.dataset.src||"");if(i&&/\.svg$/i.test(i))return i}return null}function ri(n,t=new Date){if(!n)return"";const e=new Date(n),i=h=>String(h).padStart(2,"0"),s=`${i(e.getHours())}:${i(e.getMinutes())}`,a=h=>`${h.getFullYear()}-${h.getMonth()}-${h.getDate()}`;if(a(e)===a(t))return`${f("今天")} ${s}`;const o=new Date(t);if(o.setDate(t.getDate()-1),a(e)===a(o))return`${f("昨天")} ${s}`;const r=`${i(e.getMonth()+1)}-${i(e.getDate())}`;return e.getFullYear()===t.getFullYear()?`${r} ${s}`:`${e.getFullYear()}-${r}`}function eo(n,t){const e=t.trim().toLowerCase();return e===""?n:n.filter(i=>T(i.path).toLowerCase().includes(e))}const no={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function ie(n){return n.replace(/[&<>"']/g,t=>no[t])}function io(n,t){return new Promise(e=>{let i=!1,s=!1,a,o=n,r=-1;const h=m=>{i||(i=!0,a!==void 0&&window.clearTimeout(a),d.destroy(),e(m))},d=new E.Dialog({title:f("打开白板…"),width:"520px",content:`<div class="exs-picker">
  <input class="b3-text-field fn__block exs-picker__search" placeholder="${f("搜索文件名…")}" />
  <div class="exs-picker__list b3-list b3-list--background"></div>
</div>`,destroyCallback:()=>h(null)}),l=d.element.querySelector(".exs-picker__search"),u=d.element.querySelector(".exs-picker__list"),p=()=>{if(o.length===0){u.innerHTML=`<div class="exs-picker__empty">${f("没有匹配的白板")}</div>`;return}u.innerHTML=o.map((m,g)=>{const x=`b3-list-item exs-picker__item${g===r?" b3-list-item--focus":""}`,k=t.has(_(m.path))?`<span class="exs-picker__badge">${f("已打开")}</span>`:"",b=ri(m.updated),v=k||b?`<span class="b3-list-item__meta">${k}${ie(b)}</span>`:"";return`<div class="${x}" data-idx="${g}" title="${ie(m.path)}"><span class="b3-list-item__text">${ie(T(m.path))}</span>${v}</div>`}).join("")},c=m=>{const g=o[m];g&&h(g.path)},y=m=>{o.length!==0&&(r=r<0?m>0?0:o.length-1:(r+m+o.length)%o.length,p(),u.querySelector(".b3-list-item--focus")?.scrollIntoView({block:"nearest"}))},w=()=>{a!==void 0&&window.clearTimeout(a),a=window.setTimeout(()=>{a=void 0,o=eo(n,l.value),r=-1,p()},120)};l.addEventListener("compositionstart",()=>{s=!0}),l.addEventListener("compositionend",()=>{s=!1,w()}),l.addEventListener("input",()=>{s||w()}),l.addEventListener("keydown",m=>{m.isComposing||m.keyCode===229||(m.key==="ArrowDown"?(m.preventDefault(),y(1)):m.key==="ArrowUp"?(m.preventDefault(),y(-1)):m.key==="Enter"?(m.preventDefault(),c(r>=0?r:0)):m.key==="Escape"&&(m.preventDefault(),h(null)))}),u.addEventListener("click",m=>{const g=m.target?.closest(".exs-picker__item");g&&c(Number(g.dataset.idx))}),l.focus(),p()})}const so={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},It=n=>n.replace(/[&<>"']/g,t=>so[t]);function ao(n){const t=document.createElement("div");t.className="exs-dock",t.innerHTML=`
  <div class="block__icons exs-dock__head">
    <div class="block__logo fn__flex-1"><span class="fn__ellipsis">${f("白板库")}</span><span class="exs-dock__count" data-role="libcount"></span></div>
    <span class="fn__space"></span>
    <button class="block__icon block__icon--show ariaLabel" data-act="new" aria-label="${f("新建白板")}" data-position="north" title="${f("新建白板")}" type="button"><svg aria-hidden="true" focusable="false"><use xlink:href="#iconAdd"></use></svg></button>
    <button class="block__icon block__icon--show ariaLabel" data-act="delete-active" data-role="del-active" aria-label="${f("删除当前白板")}" data-position="north" title="${f("删除当前白板")}" type="button" disabled><svg aria-hidden="true" focusable="false"><use xlink:href="#iconTrashcan"></use></svg></button>
    <button class="block__icon block__icon--show ariaLabel" data-act="lib-refresh" aria-label="${f("刷新")}" data-position="north" title="${f("刷新")}" type="button"><svg aria-hidden="true" focusable="false"><use xlink:href="#iconRefresh"></use></svg></button>
  </div>
  <ul class="b3-list b3-list--background exs-dock__liblist" data-role="liblist"></ul>`;const e=t.querySelector('[data-role="libcount"]'),i=t.querySelector('[data-role="liblist"]'),s=t.querySelector('[data-role="del-active"]');let a="",o=[];const r=()=>{const l=n.getBoardFiles(),u=Ca(l.files,l.opened);if(u!==a){if(a=u,o=l.files,e.textContent=l.files.length>0?String(l.files.length):"",l.files.length===0){i.innerHTML=`<li class="exs-lib__hint">${f("还没有白板")}</li>`;return}i.innerHTML=l.files.map(p=>{const c=l.opened.has(p.dataPath),y=p.docId!=="",w=ri(p.updated),m=(c?`<span class="exs-lib__badge">${f("已打开")}</span>`:"")+(y?`<span class="exs-lib__badge exs-lib__badge--doc">${f("已建档")}</span>`:"");return`<li class="b3-list-item b3-list-item--narrow b3-list-item--hide-action exs-lib__item${c?" is-open":""}" data-file="${It(p.dataPath)}" title="${It(p.dataPath)}" draggable="true">
          <button class="b3-list-item__text exs-lib__text" type="button">${It(fe(p))}</button>${m}
          <span class="fn__space"></span>
          <span class="exs-lib__meta">${It(w)}</span>
          <button class="b3-list-item__action b3-tooltips b3-tooltips__w" data-act="row-rename" title="${f("重命名")}" type="button"><svg aria-hidden="true"><use xlink:href="#iconEdit"></use></svg></button>
          <button class="b3-list-item__action b3-tooltips b3-tooltips__w exs-lib__act--danger" data-act="row-delete" title="${f("删除…")}" type="button"><svg aria-hidden="true"><use xlink:href="#iconTrashcan"></use></svg></button>
        </li>`}).join("")}},h=()=>{r(),s.disabled=!n.hasActiveBoard()},d=l=>{const u=l.closest(".exs-lib__item");return u?o.find(c=>c.dataPath===u.dataset.file):void 0};return t.addEventListener("click",l=>{const u=l.target,p=u.closest("[data-act]");if(p&&!p.disabled)switch(p.dataset.act){case"new":n.openNew();return;case"delete-active":n.deleteActiveBoard();return;case"lib-refresh":n.refreshBoardLib();return;case"row-rename":{const y=d(p);y&&n.renameBoardFile(y);return}case"row-delete":{const y=d(p);y&&n.deleteBoardFile(y);return}}const c=u.closest(".exs-lib__item");if(c){const y=o.find(w=>w.dataPath===c.dataset.file);y&&n.openBoardFile(y)}}),t.addEventListener("dblclick",l=>{const u=l.target.closest(".exs-lib__item");if(!u)return;const p=o.find(c=>c.dataPath===u.dataset.file)?.docId;p&&n.openDocOf(p)}),t.addEventListener("dragstart",l=>{const u=l.target.closest(".exs-lib__item");if(!u)return;const p=o.find(w=>w.dataPath===u.dataset.file),c=l.dataTransfer;if(!p||!c)return;const y=P(p.dataPath);c.effectAllowed="copy",c.setData("text/plain",y),c.setData(Ba,JSON.stringify({ref:y,title:fe(p)}))}),t.addEventListener("contextmenu",l=>{const u=l.target.closest(".exs-lib__item");if(!u)return;const p=o.find(c=>c.dataPath===u.dataset.file);p&&(l.preventDefault(),n.openFileMenu(p,l.clientX,l.clientY))}),n.onRefresh(h),h(),{element:t,refresh:h}}function oo(n){const t=[];let e=!1;for(const i of(n||"").split(/\r?\n/)){if(/^\s*```/.test(i)){e=!e;continue}if(e)continue;const s=i.match(/^(#{1,6})\s+(.+?)\s*$/);s&&t.push({level:s[1].length,text:s[2]})}return t}function ro(n){const t=(n||"").split(/\r?\n/);let e=-1;for(let s=0;s<t.length;s++)if(/^\s*\|.*\|\s*$/.test(t[s])){e=s;break}if(e<0)return null;const i=[];for(let s=e;s<t.length;s++){const a=t[s];if(!/^\s*\|.*\|\s*$/.test(a))break;const o=a.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(r=>r.trim());o.every(r=>/^:?-{2,}:?$/.test(r))||i.push(o)}return i.length===0?null:{headers:i[0],rows:i.slice(1)}}function co(n){const t=(n||"").split(/\r?\n/),e=[],i=[];for(const s of t){const a=s.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+?)\s*$/);if(!a){if(s.trim()===""||i.length===0)continue;continue}const o=Math.floor(a[1].replace(/\t/g,"  ").length/2),r={text:a[2],depth:o,children:[]};for(;i.length>o+1;)i.pop();if(o===0||i.length===0){if(o>0&&e.length===0){e.push(r),i.length=0,i.push(r);continue}e.push(r),i.length=0,i.push(r)}else(i[o-1]??i[i.length-1]).children.push(r),i[o]=r}return e}function lo(n){const t=(n||"").match(/```[a-zA-Z0-9]*\r?\n([\s\S]*?)```/);return t?t[1]:null}function ho(n){const t=(n||"").match(/^#\s+(.+?)\s*$/m)?.[1]??"",e=/@excalidraw-onload/.test(n||""),i=(lo(n)??(n||"").replace(/^#.*$/gm,"").replace(/@excalidraw-onload/g,"")).trim(),a=((n||"").split(/```/)[0]??"").split(`
`).filter(o=>!/^#\s/.test(o)&&!o.includes("@excalidraw-onload")).join(" ").replace(/\s+/g," ").trim();return{title:t,onload:e,code:i,description:a}}const j="assets/excali-scripts",fo=50,pt={"text-numbering.md":[{key:"format",label:f("默认编号格式"),type:"select",default:"1",options:[{value:"1",label:f("数字（1. 2. 3.）")},{value:"2",label:f("罗马大写（I. II. III.）")},{value:"3",label:f("罗马小写（i. ii. iii.）")},{value:"4",label:f("字母大写（A. B. C.）")},{value:"5",label:f("字母小写（a. b. c.）")}]}],"box-selection.md":[{key:"padding",label:f("外框边距（像素）"),type:"number",default:20,min:0,max:200}]};async function ci(n){const t=await fetch("/api/file/readDir",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:_(n)})}),e=await t.json().catch(()=>null);return!t.ok||!e||e.code!==0?[]:Array.isArray(e.data)?e.data.filter(i=>i&&i.isDir!==!0&&typeof i.name=="string").map(i=>i.name):[]}async function pe(n){const t=await B(_(n));return ho(t)}async function Mt(){let n=[];try{n=await ci(j)}catch{return[]}const t=[];for(const e of n.filter(i=>/\.md$/i.test(i)).sort().slice(0,fo)){const i=`${j}/${e}`;try{const s=await pe(i);t.push({path:i,name:e,title:s.title||e.replace(/\.md$/i,""),description:s.description,onload:s.onload,builtin:Do.has(e)})}catch{}}return t}async function li(n){const t=new FormData;t.append("path",_(n)),t.append("isDir","true"),await fetch("/api/file/putFile",{method:"POST",body:t}).catch(()=>{})}async function po(){let n=[];try{n=await ci(j)}catch{n=[]}const t=xt.filter(i=>!n.includes(i.file));if(t.length===0)return 0;await li(j);let e=0;for(const i of t)try{await ct(_(`${j}/${i.file}`),i.content),e++}catch(s){console.warn("[excali-studio] 内置脚本写入失败",i.file,s)}return e}async function di(){const n=[];for(const t of xt)try{(await B(_(`${j}/${t.file}`))).trim()!==t.content.trim()&&n.push(t.file)}catch{}return n}async function uo(){const n=new Set(await di());if(n.size===0)return 0;await li(j);let t=0;for(const e of xt)if(n.has(e.file))try{await ct(_(`${j}/${e.file}`),e.content),t++}catch(i){console.warn("[excali-studio] 内置脚本重置失败",e.file,i)}return t}function se(n){let t=5381;for(let e=0;e<n.length;e++)t=t*33^n.charCodeAt(e);return t>>>0}async function go(n){const t={...n},e=[],i=[];for(const s of xt){let a;try{a=await B(_(`${j}/${s.file}`))}catch{continue}if(a.trim()===s.content.trim()){t[s.file]=se(a);continue}const o=t[s.file];if(o===void 0||o===se(a))try{await ct(_(`${j}/${s.file}`),s.content),t[s.file]=se(s.content),e.push(s.file)}catch(r){console.warn("[excali-studio] 内置脚本自动更新失败",s.file,r),i.push(s.file)}else i.push(s.file)}return{updated:e,drifted:i,snapshot:t}}const mo=`# 笔记标题 → 思维导图

把当前文档的标题（1~3 级）画成右侧树：根在左，逐级向右。连线用图形绑定
（拖动节点时箭头自动跟随），布局按子树叶子数自动摊开。
只读文档、不修改；生成后可用「缩放适应」看全貌。

\`\`\`js
const md = await ea.getDocMarkdown();
const headings = ea.utils.parseHeadings(md).filter((h) => h.level <= 3);
if (headings.length === 0) {
  ea.notify("当前文档没有 1~3 级标题");
} else {
  const root = { text: headings[0].text, level: 1, children: [] };
  const stack = [root];
  for (const h of headings.slice(1)) {
    const node = { text: h.text, level: h.level, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  const BOX_W = 150, BOX_H = 34, GAP_X = 230, GAP_Y = 54;
  let slot = 0;
  const walk = (node, depth) => {
    const mySlot = node.children.length === 0 ? slot++ : null;
    node.children.forEach((c) => walk(c, depth + 1));
    node.slot = mySlot !== null ? mySlot : (node.children[0].slot + node.children[node.children.length - 1].slot) / 2;
    node.id = ea.addRect({
      x: 40 + depth * GAP_X,
      y: node.slot * GAP_Y,
      width: BOX_W,
      height: BOX_H,
      backgroundColor: depth === 0 ? "#dbeafe" : "transparent",
      text: node.text,
    });
    node.children.forEach((c) => {
      ea.connectObjects(node.id, "right", c.id, "left", 8);
    });
  };
  walk(root, 0);
  ea.zoomToFit();
  ea.notify("思维导图已生成");
}
\`\`\`
`,bo=`# Markdown 表格 → 渲染表格

把 Markdown 表格直接画成画布上的渲染表格（表头浅蓝底、单元格白底、
列宽按内容自适应、长释义自动撑高行）。两种来源二选一：

① 画布上选中含竖线的文本元素（粘贴的 Markdown 表格草稿）→ 跑本脚本，
   原地生成表格并**替换掉原文本**（误删可 Ctrl+Z 撤回）；
② 不选中任何东西 → 读当前打开文档的第一个 Markdown 表格。

\`\`\`js
// 来源①：画布选中的文本元素（含竖线才算 Markdown 表格草稿）
const sourceIds = ea.getSelectedElements();
const selTexts = sourceIds
  .map((id) => ea.getElement(id))
  .filter((el) => el && el.type === "text" && typeof el.text === "string" && el.text.includes("|"))
  .map((el) => el.text);
const fromCanvas = selTexts.length > 0;

const table = fromCanvas
  ? ea.utils.parseTable(selTexts.join("\\n"))
  : ea.utils.parseTable(await ea.getDocMarkdown());

if (!table) {
  ea.notify(
    fromCanvas
      ? "选中文本里没有 Markdown 表格（需要 | 分隔 + --- 分隔行）"
      : "当前文档没有 Markdown 表格",
  );
} else {
  // 去掉单元格里的行内 Markdown（**加粗**、*斜体*、\`代码\`），画出来更干净
  const plain = (s) =>
    s.replace(/\\*\\*([^*]*)\\*\\*/g, "$1").replace(/\\*([^*]*)\\*/g, "$1").replace(/\\\`([^\\\`]*)\\\`/g, "$1");
  const headers = table.headers.map(plain);
  const rows = table.rows.map((r) => r.map(plain));

  const FONT = 14;
  const colW = headers.map(
    (_, i) =>
      Math.min(280, Math.max(90, ...rows.map((r) => (r[i] || "").length), headers[i].length) * 12 + 24),
  );
  // 行高按换行后的行数自适应（长释义自动撑高，不再一排固定高度挤成一坨）
  const rowH = (cells) => {
    let n = 1;
    cells.forEach((cell, i) => {
      n = Math.max(n, ea.wrapText(cell, (colW[i] || 90) - 24, FONT).length);
    });
    return n * Math.ceil(FONT * 1.35) + 10;
  };

  // 来源①：表格画在原文本元素的位置（原地替换）；来源②：从 (40, 40) 起画
  const originEl = fromCanvas
    ? sourceIds.map((id) => ea.getElement(id)).find((e) => e && e.type === "text")
    : null;
  const ox = originEl ? originEl.x : 40;
  const oy = originEl ? originEl.y : 40;

  const ids = [];
  let y = oy;
  const drawRow = (cells, isHead) => {
    let x = ox;
    const h = rowH(cells);
    cells.forEach((cell, i) => {
      ids.push(
        ea.addRect({
          x, y, width: colW[i], height: h,
          backgroundColor: isHead ? "#dbeafe" : "#ffffff",
          text: cell, fontSize: FONT,
        }),
      );
      x += colW[i];
    });
    y += h;
  };
  drawRow(headers, true);
  rows.forEach((r) => drawRow(r, false));

  if (fromCanvas) {
    ea.deleteElements(sourceIds); // 原文本已被表格取代
    ea.notify("表格已生成（原文本已删，误删可 Ctrl+Z 撤回）");
  } else {
    ea.notify("表格已生成");
  }
  ea.selectElements(ids);
  ea.zoomToFit();
}
\`\`\`
`,yo=`# 缩进列表 → 流程图

把当前文档第一个缩进列表（- 或 1.）画成纵向流程图：节点按子树叶子数摊开，
父节点在子节点上方居中，折线箭头向下。复杂流程建议生成后再手动调。

\`\`\`js
const md = await ea.getDocMarkdown();
const tree = ea.utils.parseList(md);
if (tree.length === 0) {
  ea.notify("当前文档没有列表");
} else {
  const BOX_W = 170, BOX_H = 34, GAP_Y = 60;
  let slot = 0;
  const walk = (node, depth) => {
    node.children.forEach((c) => walk(c, depth + 1));
    node.slot = node.children.length === 0 ? slot++ : (node.children[0].slot + node.children[node.children.length - 1].slot) / 2;
    node.x = 40 + depth * 240;
    node.y = node.slot * GAP_Y;
    ea.addRect({ x: node.x, y: node.y, width: BOX_W, height: BOX_H, text: node.text });
    node.children.forEach((c) => {
      ea.addArrow({
        x: node.x + BOX_W / 2, y: node.y + BOX_H,
        points: [
          [0, 0],
          [0, (c.slot - node.slot) * GAP_Y / 2],
          [c.x + BOX_W / 2 - (node.x + BOX_W / 2), (c.slot - node.slot) * GAP_Y / 2],
          [c.x + BOX_W / 2 - (node.x + BOX_W / 2), (c.slot - node.slot) * GAP_Y - BOX_H / 2],
        ],
      });
    });
  };
  tree.forEach((n) => walk(n, 0));
  ea.zoomToFit();
  ea.notify("流程图已生成");
}
\`\`\`
`,wo=`# 批量导入图片

把保存目录（默认 assets）里的图片全部插入画布，4 列网格排布。
目录可在插件设置里改；只会导入图片格式，其它文件跳过。

\`\`\`js
const dir = ea.settings.saveDir || "assets";
const files = await ea.listFiles(dir);
let n = 0;
for (const f of files) {
  if (!/\\.(png|jpe?g|webp|gif|bmp)$/i.test(f)) continue;
  try {
    await ea.addImageFromFile(f, { x: (n % 4) * 260, y: Math.floor(n / 4) * 210 });
    n++;
  } catch (e) {
    console.warn("跳过", f, e);
  }
}
ea.notify(\`已插入 \${n} 张图片\`);
\`\`\`
`,xo=`# 对齐与分布

对选中的元素（≥2 个）自动判断布局意图：
全部元素几乎在同一水平带 → 垂直居中对齐（y 对齐公共中心线）；
几乎在同一垂直带 → 水平居中对齐；否则 → 按 x 排序做等水平间距分布。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length < 2) {
  ea.notify("请先选中至少 2 个元素");
} else {
  const els = ids.map((id) => ea.getElement(id)).filter(Boolean);
  const box = ea.getBoundingBox(ids);
  const avgH = els.reduce((s, e) => s + e.height, 0) / els.length;
  const avgW = els.reduce((s, e) => s + e.width, 0) / els.length;
  const sameBand = Math.max(...els.map((e) => e.y + e.height / 2)) - Math.min(...els.map((e) => e.y + e.height / 2));
  const sameColumn = Math.max(...els.map((e) => e.x + e.width / 2)) - Math.min(...els.map((e) => e.x + e.width / 2));
  if (sameBand < avgH * 0.5) {
    els.forEach((e) => ea.setPosition(e.id, e.x, box.cy - e.height / 2));
    ea.notify("已做垂直居中对齐");
  } else if (sameColumn < avgW * 0.5) {
    els.forEach((e) => ea.setPosition(e.id, box.cx - e.width / 2, e.y));
    ea.notify("已做水平居中对齐");
  } else {
    const sorted = els.slice().sort((a, b) => a.x - b.x);
    const totalW = sorted.reduce((s, e) => s + e.width, 0);
    const gap = (box.width - totalW) / (sorted.length - 1);
    let x = box.minX;
    sorted.forEach((e) => {
      ea.setPosition(e.id, x, e.y);
      x += e.width + gap;
    });
    ea.notify("已做等水平间距分布");
  }
}
\`\`\`
`,ko=`# 序号标注

给选中的每个元素外加红色虚线框 + 红底白字序号徽标（①②③…按选择顺序），
适合演示、批注、走查图。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length === 0) {
  ea.notify("请先选中要标注的元素");
} else {
  ids.forEach((id, i) => {
    const b = ea.getBoundingBox([id]);
    const pad = 8;
    ea.addRect({
      x: b.minX - pad, y: b.minY - pad,
      width: b.width + pad * 2, height: b.height + pad * 2,
      strokeColor: "#e03131", backgroundColor: "transparent",
      strokeStyle: "dashed", strokeWidth: 1.5,
    });
    ea.addEllipse({
      x: b.minX - pad - 22, y: b.minY - pad - 6,
      width: 22, height: 22,
      strokeColor: "#e03131", backgroundColor: "#e03131", roughness: 0,
    });
    ea.addText({
      x: b.minX - pad - 22, y: b.minY - pad - 6,
      width: 22, height: 22,
      text: String(i + 1), fontSize: 14,
      strokeColor: "#ffffff", textAlign: "center",
    });
  });
  ea.zoomToFit();
  ea.notify("已加 " + ids.length + " 个序号标注");
}
\`\`\`
`,So=`# 智能连线

选中恰好 2 个图形，自动按几何方位在最近的两条边之间画绑定箭头
（之后拖动图形，箭头自动跟随）。替代手工拉线，怎么摆都不脱节。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length !== 2) {
  ea.notify("请选中恰好 2 个图形");
} else {
  const arrowId = ea.connectObjects(ids[0], "auto", ids[1], "auto", 6);
  ea.notify(arrowId ? "已连线（绑定：拖动图形箭头跟随）" : "连线失败：元素不可绑定");
}
\`\`\`
`,vo=`# 任务清单 → 三列看板

把当前文档的任务列表画成「待办 / 进行中 / 完成」三列看板：
- [ ] 开头 → 待办；- [x] 开头 → 完成；其余列表项 → 进行中。
只读文档、不修改。

\`\`\`js
const md = await ea.getDocMarkdown();
const tree = ea.utils.parseList(md);
const flat = [];
const walk = (nodes) => nodes.forEach((n) => { flat.push(n.text); walk(n.children); });
walk(tree);
if (flat.length === 0) {
  ea.notify("当前文档没有列表");
} else {
  const todo = flat.filter((t) => /\\[\\s?\\]/.test(t)).map((t) => t.replace(/\\[\\s?\\]\\s*/, ""));
  const done = flat.filter((t) => /\\[[xX]\\]/.test(t)).map((t) => t.replace(/\\[[xX]\\]\\s*/, ""));
  const doing = flat.filter((t) => !/\\[[xX\\s?]\\]/.test(t));
  const columns = [
    { title: "待办", color: "#dbeafe", items: todo },
    { title: "进行中", color: "#fff3bf", items: doing },
    { title: "完成", color: "#d3f9d8", items: done },
  ];
  const COL_W = 220, HEAD_H = 40, CARD_H = 40, GAP = 10;
  columns.forEach((col, ci) => {
    const x = 40 + ci * (COL_W + GAP);
    ea.addRect({ x, y: 40, width: COL_W, height: HEAD_H, backgroundColor: col.color, text: col.title + "（" + col.items.length + "）" });
    col.items.forEach((t, i) => {
      ea.addRect({ x, y: 40 + HEAD_H + GAP + i * (CARD_H + GAP), width: COL_W, height: CARD_H, text: t, fontSize: 14 });
    });
  });
  ea.zoomToFit();
  ea.notify("看板已生成");
}
\`\`\`
`,Eo=`# 导出分步图

把选中的元素按出现顺序逐步显现，导出成 step-1.png、step-2.png…（N 张，
浏览器逐张下载）——演示时一张图讲完一个过程。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length < 2) {
  ea.notify("请选中 2 个以上元素（将按它们在画布中的出现顺序逐步显现）");
} else {
  const sceneIds = ea.getElements().map((e) => e.id);
  const ordered = sceneIds.filter((id) => ids.includes(id));
  for (let k = 1; k <= ordered.length; k++) {
    const blob = await ea.exportPNG(2, ordered.slice(0, k));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "step-" + k + ".png";
    a.click();
    URL.revokeObjectURL(url);
  }
  ea.notify("已导出 " + ordered.length + " 张分步图");
}
\`\`\`
`,_o=`# 重复补间（选中 2 个）

在两个**同类型**元素之间线性插值出 N 个中间元素：位置、尺寸、角度渐变，
背景与描边颜色还会做 HSL 色相渐变——做色阶图、渐变进度条、明暗过渡一气呵成。
对标 Obsidian Excalidraw 的 Repeat Elements。

\`\`\`js
const picked = ea.getSelectedElements().map((id) => ea.getElement(id));
if (picked.length !== 2 || !picked[0] || !picked[1]) {
  ea.notify("请选中恰好 2 个元素");
  return;
}
const a = picked[0].x <= picked[1].x ? picked[0] : picked[1];
const b = a === picked[0] ? picked[1] : picked[0];
if (a.type !== b.type) {
  ea.notify("两个元素必须同类型（同是矩形/椭圆/箭头…）");
  return;
}
if (a.type === "image" || a.type === "frame") {
  ea.notify("暂不支持图像与画框，请选形状、箭头或文本");
  return;
}
const n = parseInt(await ea.utils.inputPrompt("补间数量（在两者之间插入几个）", "number", "5"), 10);
if (!n || n < 1) {
  ea.notify("请输入正整数（取消则中断）");
  return;
}

// hex(#rgb/#rrggbb/#rrggbbaa) <-> HSL；透明色不参与渐变（保持原色）
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const parseHex = (c) => {
  if (typeof c !== "string") return null;
  const m = c.replace("#", "");
  if (m.length === 3) return [parseInt(m[0] + m[0], 16), parseInt(m[1] + m[1], 16), parseInt(m[2] + m[2], 16), 1];
  if (m.length === 6) return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16), 1];
  if (m.length === 8) return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16), parseInt(m.slice(6, 8), 16) / 255];
  return null;
};
const rgbToHsl = (r, g, bl) => {
  r /= 255; g /= 255; bl /= 255;
  const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - bl) / d + (g < bl ? 6 : 0)) / 6;
    else if (max === g) h = ((bl - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
};
const hslToHex = (h, s, l) => {
  h = (((h % 360) + 360) % 360) / 360;
  const f = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, bl;
  if (s === 0) { r = l; g = l; bl = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = f(p, q, h + 1 / 3); g = f(p, q, h); bl = f(p, q, h - 1 / 3);
  }
  const to = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0");
  return "#" + to(r) + to(g) + to(bl);
};
const lerpColor = (c1, c2, t) => {
  const p1 = parseHex(c1), p2 = parseHex(c2);
  if (!p1 || !p2) return c1 ?? c2 ?? "#000000";
  const h1 = rgbToHsl(p1[0], p1[1], p1[2]);
  const h2 = rgbToHsl(p2[0], p2[1], p2[2]);
  let dh = h2[0] - h1[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const alpha = p1[3] + (p2[3] - p1[3]) * t;
  const hex = hslToHex(h1[0] + dh * t, h1[1] + (h2[1] - h1[1]) * t, h1[2] + (h2[2] - h1[2]) * t);
  return alpha >= 1 ? hex : hex + Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, "0");
};

const specs = [];
for (let i = 1; i <= n; i++) {
  const t = i / (n + 1);
  const spec = {
    type: a.type,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    width: (a.width ?? 0) + ((b.width ?? 0) - (a.width ?? 0)) * t,
    height: (a.height ?? 0) + ((b.height ?? 0) - (a.height ?? 0)) * t,
    angle: (a.angle ?? 0) + ((b.angle ?? 0) - (a.angle ?? 0)) * t,
    strokeColor: lerpColor(a.strokeColor, b.strokeColor, t),
    backgroundColor: lerpColor(a.backgroundColor, b.backgroundColor, t),
    fillStyle: a.fillStyle,
    strokeWidth: (a.strokeWidth ?? 2) + ((b.strokeWidth ?? 2) - (a.strokeWidth ?? 2)) * t,
    strokeStyle: a.strokeStyle,
    roughness: a.roughness,
    opacity: a.opacity,
  };
  if (a.type === "text") {
    spec.text = a.text;
    spec.fontSize = a.fontSize;
    spec.fontFamily = a.fontFamily;
    spec.textAlign = a.textAlign;
  }
  if ((a.type === "arrow" || a.type === "line") && a.points && b.points && a.points.length === b.points.length) {
    spec.points = a.points.map((p, j) => [
      p[0] + (b.points[j][0] - p[0]) * t,
      p[1] + (b.points[j][1] - p[1]) * t,
    ]);
    spec.startArrowhead = a.startArrowhead;
    spec.endArrowhead = a.endArrowhead;
  }
  specs.push(spec);
}
const newIds = ea.addElements(specs);
ea.selectElements(newIds);
ea.notify("已生成 " + n + " 个补间元素");
\`\`\`
`,Ao=`# 选区加外框

给选中的整组元素套一个大外框（虚线矩形、透明底、自动垫到最底层）——圈重点、
做分组卡片、给示意图框版都靠它；对标 Obsidian Excalidraw 的 Box Selected Elements。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length === 0) {
  ea.notify("请先选中要加外框的元素");
  return;
}
const box = ea.getBoundingBox(ids);
if (!box) {
  ea.notify("选区没有可框的内容");
  return;
}
const parsed = parseInt(await ea.utils.inputPrompt("外框边距（像素）", "number", String(ea.getScriptSetting("padding", 20))), 10);
if (isNaN(parsed)) return; // 取消/无效输入 = 什么都不做
const pad = Math.max(0, parsed);
const rectId = ea.addRect({
  x: box.minX - pad,
  y: box.minY - pad,
  width: box.maxX - box.minX + pad * 2,
  height: box.maxY - box.minY + pad * 2,
  backgroundColor: "transparent",
  strokeStyle: "dashed",
  strokeWidth: 1,
});
ea.toBack([rectId]);
ea.notify("已加外框（边距 " + pad + "px）");
\`\`\`
`,$o=`# 统一尺寸（选中 2 个以上）

把选中的形状统一到选区里最大的宽高（中心保持不动）——流程图节点大小不一的救星；
对标 Obsidian Excalidraw 的 Uniform size。文本与箭头不参与（尺寸由内容/端点决定）。

\`\`\`js
const ids = ea.getSelectedElements();
const shapes = ids
  .map((id) => ea.getElement(id))
  .filter((e) => e && (e.type === "rectangle" || e.type === "diamond" || e.type === "ellipse" || e.type === "image"));
if (shapes.length < 2) {
  ea.notify("请选中 2 个以上可调尺寸的形状（矩形/菱形/椭圆/图片）");
  return;
}
const maxW = Math.max(...shapes.map((e) => e.width ?? 0));
const maxH = Math.max(...shapes.map((e) => e.height ?? 0));
let changed = 0;
for (const e of shapes) {
  const dw = maxW - (e.width ?? 0);
  const dh = maxH - (e.height ?? 0);
  if (dw === 0 && dh === 0) continue;
  ea.setStyle([e.id], { width: maxW, height: maxH });
  ea.moveBy([e.id], -dw / 2, -dh / 2); // 中心保持不动
  changed++;
}
ea.notify("已把 " + changed + " 个形状统一到 " + Math.round(maxW) + "×" + Math.round(maxH));
\`\`\`
`,Io=`# 反转箭头

把选中箭头的头尾对调（起端箭头帽与末端互换，几何不动）——画完流程图想改方向
不用重画；对标 Obsidian Excalidraw 的 Reverse arrows。

\`\`\`js
const ids = ea.getSelectedElements();
const arrows = ids.map((id) => ea.getElement(id)).filter((e) => e && e.type === "arrow");
if (arrows.length === 0) {
  ea.notify("请选中要反转的箭头");
  return;
}
for (const el of arrows) {
  ea.setStyle([el.id], {
    startArrowhead: el.endArrowhead ?? null,
    endArrowhead: el.startArrowhead ?? null,
  });
}
ea.notify("已反转 " + arrows.length + " 支箭头");
\`\`\`
`,Mo=`# 形状互转

把选中的矩形/椭圆/菱形一键换成目标形状（位置、尺寸、样式全保留）——
画流程图常改主意；对标 Obsidian Excalidraw 的 Change shape。
绑定了文字的形状暂不换形（文字会掉，先解绑或删除文字再跑）。

\`\`\`js
const target = (await ea.utils.inputPrompt("目标形状：rectangle / ellipse / diamond", "text", "ellipse")).trim().toLowerCase();
if (target === "") return; // 取消 = 什么都不做
if (!["rectangle", "ellipse", "diamond"].includes(target)) {
  ea.notify("只支持 rectangle / ellipse / diamond");
  return;
}
const ids = ea.getSelectedElements();
const convertible = ids
  .map((id) => ea.getElement(id))
  .filter((e) => e && ["rectangle", "ellipse", "diamond"].includes(e.type) && e.type !== target);
const skippable = new Set(convertible.filter((e) => (e.boundElements ?? []).some((x) => x.type === "text")).map((e) => e.id));
const doable = convertible.filter((e) => !skippable.has(e.id));
if (doable.length === 0) {
  ea.notify("选区里没有可换形的形状（矩形/椭圆/菱形；绑文字的已跳过）");
  return;
}
const createdIds = [];
for (const e of doable) {
  const newId = ea.addElements([
    {
      type: target,
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      angle: e.angle,
      strokeColor: e.strokeColor,
      backgroundColor: e.backgroundColor,
      fillStyle: e.fillStyle,
      strokeWidth: e.strokeWidth,
      strokeStyle: e.strokeStyle,
      roughness: e.roughness,
      opacity: e.opacity,
    },
  ])[0];
  createdIds.push(newId);
}
ea.deleteElements(doable.map((e) => e.id));
if (createdIds.length) ea.selectElements(createdIds);
ea.notify("已换形 " + createdIds.length + " 个" + (skippable.size ? "（跳过绑文字的 " + skippable.size + " 个）" : ""));
\`\`\`
`,Co=`# 文字编号（按选择顺序）

给选中的文字前面加序号——1. 2. 3. / I. II. III. / A. B. C. 都行。
**直接点按钮** = 按脚本库 ⚙ 设置里的格式编号（默认数字）；选中的文字全都带编号时再点一次 = 全部去掉编号；
**按住 Shift 点按钮** = 弹出格式菜单自选（预勾选当前默认格式，点空白 = 不动）；
用 Shift 逐个点选文字，点选顺序就是编号顺序（拖框选择不保证顺序）。

\`\`\`js
const PREFIX_RE = /^\\s*(\\d{1,3}|[IVXLCDM]+|[ivxlcdm]+|[A-Za-z])[.、)．:：]\\s*/;
const ids = ea.getSelectedElements();
const texts = ids
  .map((id) => ea.getElement(id))
  .filter((e) => e && e.type === "text" && !e.containerId);
if (texts.length === 0) {
  ea.notify("请先用 Shift 逐个点选要编号的文字（绑在图形上的说明文字不参与）");
  return;
}
const allNumbered = texts.every((t) => PREFIX_RE.test(String(t.text ?? "")));
let fmt;
if (ea.getModifiers().shift) {
  // Shift+点按钮 = 显式重编号：菜单选格式（预勾选脚本库默认格式）；
  // 点空白 / Esc / 点菜单外 = 什么都不做
  const picked = await ea.utils.selectOption({
    options: [
      { value: "1", label: "数字", hint: "1. 2. 3." },
      { value: "2", label: "罗马大写", hint: "I. II. III." },
      { value: "3", label: "罗马小写", hint: "i. ii. iii." },
      { value: "4", label: "字母大写", hint: "A. B. C." },
      { value: "5", label: "字母小写", hint: "a. b. c." },
    ],
    current: String(ea.getScriptSetting("format", "1")),
  });
  if (picked === null) return;
  fmt = parseInt(picked, 10);
} else if (allNumbered) {
  // 不按 Shift 且全都带编号 = toggle off：去掉编号
  for (const t of texts) ea.setText(t.id, String(t.text ?? "").replace(PREFIX_RE, ""));
  ea.notify("已去掉 " + texts.length + " 条文字的编号");
  return;
} else {
  // 不按 Shift 且存在无编号文字 = 按脚本库设置直跑（getScriptSetting 已校验，脏值回落默认 "1"）
  const parsed = parseInt(String(ea.getScriptSetting("format", "1")), 10);
  fmt = [1, 2, 3, 4, 5].includes(parsed) ? parsed : 1;
}
const toRoman = (n) => {
  const tab = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let s = "";
  for (const [v, r] of tab) { while (n >= v) { s += r; n -= v; } }
  return s;
};
const toAlpha = (n) => {
  let s = "";
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
};
const prefixOf = (n) =>
  fmt === 2 ? toRoman(n) + "." :
  fmt === 3 ? toRoman(n).toLowerCase() + "." :
  fmt === 4 ? toAlpha(n) + "." :
  fmt === 5 ? toAlpha(n).toLowerCase() + "." :
  n + ".";
for (let i = 0; i < texts.length; i++) {
  const body = String(texts[i].text ?? "").replace(PREFIX_RE, "");
  ea.setText(texts[i].id, prefixOf(i + 1) + " " + body);
}
const skipped = ids.length - texts.length;
ea.notify(
  "已给 " + texts.length + " 条文字编号" +
  (skipped > 0 ? "（跳过 " + skipped + " 个非文字/绑定文字元素）" : ""),
);
\`\`\`
`,To=`# 荧光笔

把笔刷切到荧光笔并进入手绘工具，之后直接在画布上拖拽就行——对标 Obsidian Excalidraw
的 Highlighter tool。

颜色 / 粗细 / 透明度读的是插件设置里那一份，和右缘竖条色板**同一个配置**（在色板改完
这里立刻跟着变）。脚本侧刻意不带参数：两处各存一套迟早打架，竖向色板是唯一的调色入口。

\`\`\`js
ea.highlighter();
const p = ea.getPen();
ea.notify("荧光笔：" + p.color + " · 约 " + Math.round(p.width * 4.25) + "px · " + p.opacity + "%");
\`\`\`
`,Ro=`# 素材配方（改色 / 重新生成）

把「图片转轮廓」生成的素材按配方重做一遍：换墨色、整体透明度、缩放，或调每一层的浓淡与
简化程度。选中一个素材元素组即可——配方会从元素上读回来（不必先入库）。

前提：素材必须由「右缘竖条 → 图片转素材 → 轮廓（高保真）」生成，也只有那种素材才带
配方。普通的矩形/椭圆/手绘元素没有配方，脚本会直接提示。

- 墨色填\`#1e1e1e\` 这类 16 进制值；留空表示不改。
- 缩放填倍数（\`1.5\` = 放大五成）；留空表示不改。
- 整体透明度填 0-100；留空表示不改。
- 分层浓淡留空 = 用原配方；填 \`浓,淡,很浓 这样按层给（逗号分隔，从最淡到最浓）。

改完按「替换选中」直接改画布，或按「另存为新素材」写进素材库（可反复复用）。

\`\`\`js
const RECIPE_KEY = "excaliRecipe";

const ids = ea.getSelectedElements();
if (ids.length === 0) {
  ea.notify("请先选中一个「图片转轮廓」生成的素材");
  return;
}

const els = ids.map((id) => ea.getElement(id)).filter(Boolean);
const recipe = els.map((e) => e[RECIPE_KEY]).find(Boolean);
if (!recipe || typeof recipe !== "object" || !Array.isArray(recipe.layers)) {
  ea.notify("选区里没有配方：请用「图片转素材 → 轮廓（高保真）」生成后再选中它");
  return;
}

const box = ea.getBoundingBox(ids);
if (!box) {
  ea.notify("选区没有可处理的内容");
  return;
}

// 逐层读回原来的浓度；新的整体透明度与颜色留空 = 不改
const baseOpacity = els.length ? els[0].opacity : 100;
const baseColor = els.length ? els[0].backgroundColor : "#1e1e1e";

const color = (await ea.utils.inputPrompt("墨色（16 进制，如 #1e1e1e；留空不改）", "text", "")).trim();
const scaleRaw = (await ea.utils.inputPrompt("缩放倍数（留空不改）", "text", "")).trim();
const opacityRaw = (await ea.utils.inputPrompt("整体透明度 0-100（留空不改）", "text", "")).trim();
const layersRaw = (await ea.utils.inputPrompt("分层浓淡（逗号分隔，从最淡到最浓；留空沿用原配方）", "text", "")).trim();

const opacity = opacityRaw === "" ? baseOpacity : Math.max(1, Math.min(100, parseFloat(opacityRaw) || baseOpacity));
const scale = scaleRaw === "" ? 1 : Math.max(0.05, parseFloat(scaleRaw) || 1);

let layers = recipe.layers.slice();
if (layersRaw !== "") {
  const parts = layersRaw.split(/[,，]/).map((s) => parseFloat(s)).filter((n) => !isNaN(n));
  if (parts.length > 0) {
    layers = layers.map((l, i) => (i < parts.length ? Object.assign({}, l, { opacity: Math.max(1, Math.min(100, parts[i])) }) : l));
  }
}

const fill = color !== "" && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : baseColor;
const changes = [];
if (fill !== baseColor) changes.push("颜色 " + baseColor + " → " + fill);
if (opacity !== baseOpacity) changes.push("透明度 " + baseOpacity + "% → " + opacity + "%");
if (scale !== 1) changes.push("缩放 ×" + scale);
if (layersRaw !== "") changes.push("分层 " + layersRaw);
if (changes.length === 0) {
  ea.notify("没有改动任何参数，什么都没做");
  return;
}

const patch = { backgroundColor: fill, opacity: opacity };
ea.setStyle(ids, patch);
if (scale !== 1) {
  // 等比缩放：先按倍数挪左上角，再按倍数改宽高（points 由引擎按新尺寸重算）
  const w = Math.max(1, Math.round(box.width * scale));
  const h = Math.max(1, Math.round(box.height * scale));
  ea.setPosition(ids[0], box.minX, box.minY);
  ea.setStyle(ids, { width: w, height: h });
}

// 配方随元素一起带走：setStyle 走 updateScene，未知字段引擎会原样保留
const nextRecipe = Object.assign({}, recipe, {
  strokeColor: fill,
  layers: layers,
  v: 1,
});
ea.setStyle(ids, { excaliRecipe: nextRecipe });

const where = await ea.utils.selectOption({
  options: [
    { value: "canvas", label: "替换选中（改画布上这一份）" },
    { value: "library", label: "另存为新素材（写进素材库）" },
  ],
});

if (where === "library") {
  const now = Date.now();
  await ea.addLibraryItem({
    id: "lib-recipe-" + now.toString(36),
    name: "配方素材 " + new Date(now).toLocaleTimeString(),
    elements: ea.getElements().filter((e) => ids.indexOf(e.id) >= 0),
    excaliRecipe: nextRecipe,
  });
  ea.notify("已写入素材库：" + changes.join("，"));
  return;
}

ea.notify("已按配方重做：" + changes.join("，"));
\`\`\`
`,xt=[{file:"mindmap-from-headings.md",content:mo},{file:"table-from-markdown.md",content:bo},{file:"flowchart-from-list.md",content:yo},{file:"batch-import-images.md",content:wo},{file:"align-and-distribute.md",content:xo},{file:"number-badges.md",content:ko},{file:"smart-connect.md",content:So},{file:"kanban-from-list.md",content:vo},{file:"export-steps.md",content:Eo},{file:"repeat-tween.md",content:_o},{file:"box-selection.md",content:Ao},{file:"uniform-size.md",content:$o},{file:"reverse-arrows.md",content:Io},{file:"change-shape.md",content:Mo},{file:"text-numbering.md",content:Co},{file:"highlighter.md",content:To},{file:"material-recipe.md",content:Ro}],Do=new Set(xt.map(n=>n.file));async function mn(n,t,e){const i=[],s=r=>(...h)=>{try{i.push(`[${r}] ${h.map(d=>typeof d=="string"?d:JSON.stringify(d)).join(" ")}`)}catch{i.push(`[${r}] <无法序列化的输出>`)}},a={log:s("log"),warn:s("warn"),error:s("error"),info:s("log"),debug:s("log")},o=Date.now();try{return await new Function("ea","utils","console",`"use strict";
return (async () => {
${n}
})();`)(t,e,a),{ok:!0,logs:i,durationMs:Date.now()-o}}catch(r){const h=r instanceof Error?`${r.message}
${r.stack??""}`:String(r);return{ok:!1,logs:i,error:h,durationMs:Date.now()-o}}}let bn=0;function ue(n="ea"){return bn+=1,`${n}-${Date.now().toString(36)}-${bn.toString(36)}`}function lt(n,t){let e=0;for(const i of n)e+=/[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(i)?1:.56;return Math.ceil(e*t)}function Lo(n){let t=n.x,e=n.y,i=n.x+n.width,s=n.y+n.height;if(n.points&&n.points.length>0){t=e=1/0,i=s=-1/0;for(const[o,r]of n.points)t=Math.min(t,n.x+o),e=Math.min(e,n.y+r),i=Math.max(i,n.x+o),s=Math.max(s,n.y+r)}const a=n.angle??0;if(a!==0){const o=(t+i)/2,r=(e+s)/2,h=Math.cos(a),d=Math.sin(a),l=[[t,e],[i,e],[t,s],[i,s]];let u=1/0,p=1/0,c=-1/0,y=-1/0;for(const[w,m]of l){const g=w-o,x=m-r,k=o+g*h-x*d,b=r+g*d+x*h;u=Math.min(u,k),p=Math.min(p,b),c=Math.max(c,k),y=Math.max(y,b)}t=u,e=p,i=c,s=y}return{minX:t,minY:e,maxX:i,maxY:s,width:i-t,height:s-e,cx:(t+i)/2,cy:(e+s)/2}}function Ft(n){if(n.length===0)return null;const t=n.map(Lo),e=Math.min(...t.map(o=>o.minX)),i=Math.min(...t.map(o=>o.minY)),s=Math.max(...t.map(o=>o.maxX)),a=Math.max(...t.map(o=>o.maxY));return{minX:e,minY:i,maxX:s,maxY:a,width:s-e,height:a-i,cx:(e+s)/2,cy:(i+a)/2}}function yn(n,t){if((n.angle??0)!==0)return{x:n.x+n.width/2,y:n.y+n.height/2};switch(t){case"top":return{x:n.x+n.width/2,y:n.y};case"bottom":return{x:n.x+n.width/2,y:n.y+n.height};case"left":return{x:n.x,y:n.y+n.height/2};case"right":return{x:n.x+n.width,y:n.y+n.height/2}}}function wn(n,t){const e=t.x+t.width/2-(n.x+n.width/2),i=t.y+t.height/2-(n.y+n.height/2);return Math.abs(e)>=Math.abs(i)?e>=0?"right":"left":i>=0?"bottom":"top"}function hi(n,t,e){const i=[];for(const s of n.split(`
`)){let a="",o=0;for(const r of s){const h=/[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(r)?1:.56;a!==""&&o+h>t/e?(i.push(a),a=r,o=h):(a+=r,o+=h)}i.push(a)}return i}function xn(n,t,e="",i={}){const s=o=>n.addElements([o])[0]??"";return{addRect:o=>s({...o,type:"rectangle"}),addDiamond:o=>s({...o,type:"diamond"}),addEllipse:o=>s({...o,type:"ellipse"}),addArrow:o=>s({...o,type:"arrow"}),addLine:o=>s({...o,type:"line"}),addText:o=>s({...o,type:"text"}),addFrame:o=>s({...o,type:"frame"}),addImage:(o,r)=>n.addImage(o,r),getElements:()=>n.getElements(),getElement:o=>n.getElements().find(r=>r.id===o),addElements:o=>n.addElements(o.map(r=>({...r,type:r.type??"rectangle"}))),deleteElements:o=>n.deleteElements(o),clear:()=>n.clear(),selectElements:o=>n.selectElements(o),setStyle:(o,r)=>{const h=o==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):o;h.length!==0&&n.patchElements(h,r)},setText:(o,r)=>{const h=n.getElements().find(p=>p.id===o);if(!h||h.type!=="text")return;const d=h.fontSize??20,l=h.lineHeight??1.25,u=String(r).split(`
`);n.patchElements([o],{text:r,originalText:r,width:Math.max(1,...u.map(p=>lt(p,d))),height:Math.ceil(d*l*u.length)})},zoomToFit:()=>n.scrollToContent(),scrollToElement:o=>n.scrollToElement(o),getViewMode:()=>!!n.getAppState().viewModeEnabled,setViewMode:o=>n.setViewMode(o),getBackground:()=>n.getAppState().viewBackgroundColor??"",setBackground:o=>n.updateScene({viewBackgroundColor:o}),setLink:(o,r)=>{const h=o==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):o;h.length!==0&&n.patchElements(h,{link:r})},getLink:o=>{const r=n.getElements().find(h=>h.id===o);return r&&typeof r.link=="string"?r.link:null},exportSVG:o=>n.exportImage("svg",o),exportPNG:o=>n.exportImage("png",o),save:()=>t.save(),notify:o=>t.notify(o),getDocMarkdown:()=>t.getDocMarkdown(),getSelectedText:()=>t.getSelectedText(),listFiles:o=>t.listFiles(o),addImageFromFile:async(o,r)=>{const h=await t.readFileAsDataURL(o);return n.addImage(h,r)},settings:t.getSettings(),targetView:{getTitle:()=>"board"},getSelectedElements:()=>Object.keys(n.getAppState().selectedElementIds??{}),getBoundingBox:o=>{const r=o==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):o;if(r.length===0)return null;const h=new Set(r),d=n.getElements().filter(l=>h.has(l.id));return Ft(d)},connectObjects:(o,r,h,d,l)=>n.connectObjects(o,r,h,d,l),group:o=>{if(o.length<2)return null;const r=ue("group");return n.patchElements(o,{groupIds:[r]}),r},unGroup:o=>{n.patchElements(o,{groupIds:[]})},toFront:o=>kn(n,o,"front"),toBack:o=>kn(n,o,"back"),setPosition:(o,r,h)=>n.patchElements([o],{x:r,y:h}),moveBy:(o,r,h)=>{const d=o==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):o;for(const l of d){const u=n.getElements().find(p=>p.id===l);u&&n.patchElements([l],{x:u.x+r,y:u.y+h})}},measureText:(o,r=20)=>({width:lt(o,r),height:Math.ceil(r*1.25)}),wrapText:(o,r,h=20)=>hi(o,r,h),addEmbeddable:(o,r)=>n.addEmbeddable(o,r),addLibraryItem:o=>n.addLibraryItem(o),getTheme:()=>n.getTheme(),setTheme:o=>n.setTheme(o),getPen:()=>n.getPen(),setPen:o=>{const r=n.getPen(),h={color:o.color??r.color,width:o.width??r.width,opacity:o.opacity??r.opacity,roughness:o.roughness??r.roughness};n.applyPen({...Pt(h),roughness:h.roughness},o.tool)},highlighter:()=>n.applyPen({...t.getHighlighter(),roughness:na},"freedraw"),siyuan:{call:(o,r)=>t.siyuanCall(o,r??{})},getModifiers:()=>({shift:!!i.shift}),getScriptSetting:(o,r)=>{const h=t.getScriptSetting(e,o);return h===void 0?r:h},setScriptSetting:(o,r)=>t.setScriptSetting(e,o,r),utils:{uuid:()=>ue("uuid"),now:()=>Date.now(),parseHeadings:oo,parseList:co,parseTable:ro,inputPrompt:async(o,r="text",h="")=>await t.inputPrompt(o,r,h)??"",selectOption:o=>t.selectOption({...o,at:o.at??i.at})}}}function kn(n,t,e){const i=[...n.getElements()].sort((h,d)=>String(h.index??"").localeCompare(String(d.index??"")));if(i.length===0)return;const s=new Set(t),a=i.filter(h=>s.has(h.id)),o=i.filter(h=>!s.has(h.id));if(a.length===0||o.length===0)return;(e==="front"?[...o,...a]:[...a,...o]).forEach((h,d)=>{const l=String(i[d].index??"");String(h.index??"")!==l&&n.patchElements([h.id],{index:l})})}const jt={pencil:{background:"#fffdf7",ink:"#1e1e1e",fill:"#ffffff",edge:"#495057",muted:"#868e96",strokeWidth:2,roughness:1,fillStyle:"solid",strokeStyle:"solid",fontFamily:5,fontSizes:{title:28,node:16,edge:14,caption:14},nodeRoundness:{type:3}},marker:{background:"#ffffff",ink:"#1e1e1e",fill:"#ffec99",fillPalette:["#ffec99","#b2f2bb","#a5d8ff","#ffc9c9","#d0bfff","#ffd8a8","#c3fae8","#e9fac8"],edge:"#e03131",muted:"#868e96",strokeWidth:2,roughness:1,fillStyle:"solid",strokeStyle:"solid",fontFamily:5,fontSizes:{title:28,node:16,edge:14,caption:14},nodeRoundness:{type:3}},blueprint:{background:"#f8fbff",ink:"#1971c2",fill:"#e7f5ff",edge:"#1971c2",muted:"#4dabf7",strokeWidth:1,roughness:0,fillStyle:"solid",strokeStyle:"solid",fontFamily:3,fontSizes:{title:26,node:15,edge:13,caption:12},nodeRoundness:{type:3}}},Po=Object.keys(jt),nt=new Map,Ot=new Map,Bo=8,Oo={hand:"pencil",handdrawn:"pencil","hand-drawn":"pencil",sketch:"pencil",ink:"pencil",color:"marker",colour:"marker",crayon:"marker",vivid:"marker",highlight:"marker",technical:"blueprint",line:"blueprint",wireframe:"blueprint",mono:"blueprint"};function dt(n){return n.trim().toLowerCase().replace(/[\s_]+/g,"-").replace(/[^a-z0-9._-]/g,"").replace(/^-+|-+$/g,"")}function No(n){if(typeof n!="string")return null;const t=dt(n);if(t in jt)return t;const e=Oo[t];return e||(nt.has(t)?t:null)}function Fo(n){return dt(n)in jt||nt.has(dt(n))}function jo(n,t){nt.set(n,t),Ot.clear()}function Ho(){nt.clear(),Ot.clear()}function zo(n){return nt.get(n)?.extendsFrom??null}function fi(){return[...Po,...[...nt.keys()].sort()]}function pi(n,t){const e=Ot.get(n);if(e)return e;const i=jt[n];if(i)return i;const s=nt.get(n);if(!s)throw new Error(`style:unknown-style (${n})`);if(t.includes(n)||t.length>=Bo)throw new Error(`style:circular-extends (${[...t,n].join(" <- ")})`);const a=pi(s.extendsFrom,[...t,n]),o=s.diff.fontSizes,r={...a,...s.diff,fontSizes:{title:o?.title??a.fontSizes.title,node:o?.node??a.fontSizes.node,edge:o?.edge??a.fontSizes.edge,caption:o?.caption??a.fontSizes.caption},...s.diff.space?{space:{...a.space,...s.diff.space}}:{},...s.diff.fillPalette?{fillPalette:s.diff.fillPalette.slice()}:{}};return Ot.set(n,r),r}function Ht(n){return pi(n,[])}function Uo(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}function Wo(n,t,e){const i=n.groupColor?.roles;if(n.groupColor?.mode==="roles"&&e&&i){const o=i[e]??i[e.toLowerCase()];if(o)return o}const s=n.fillPalette;if(!s||s.length===0)return n.fill;const a=e&&e!==""?`g:${e}`:`i:${t}`;return s[Uo(a)%s.length]}const Xo={minW:160,minH:90,padX:64,padY:40,gapX:110,gapY:64,gridGapX:90,gridGapY:72,radialMinRadius:240,radialGap:120,maxGridCols:4,textWrap:200};function Go(n){return{...Xo,...n.space}}function Yo(n,t,e,i){const s=t.fontSizes.node,a=hi(n.label,i.textWrap,s),o=Math.max(1,...a.map(l=>lt(l,s))),r=Math.ceil(a.length*s*1.25);let h,d;return n.shape==="text"?(h=Math.max(o,24),d=Math.max(r,s)):(h=Math.max(i.minW,o+i.padX),d=Math.max(i.minH,r+i.padY)),n.shape==="ellipse"?(h=Math.ceil(h*1.1),d=Math.ceil(d*1.12)):n.shape==="diamond"&&(h=Math.ceil(h*1.24),d=Math.ceil(d*1.32)),{id:n.id,label:n.label,shape:n.shape,...n.group?{group:n.group}:{},index:e,fill:n.shape==="text"?"transparent":Wo(t,e,n.group),lines:a,x:0,y:0,width:h,height:d}}function Zo(n,t){const e=new Map(n.map(h=>[h.id,h.index])),i=new Map(n.map(h=>[h.id,0])),s=new Map(n.map(h=>[h.id,[]]));for(const h of t)s.get(h.from)?.push(h.to),i.set(h.to,(i.get(h.to)??0)+1);const a=new Map(n.map(h=>[h.id,0])),o=new Set,r=n.filter(h=>(i.get(h.id)??0)===0).map(h=>h.id);for(;o.size<n.length;){if(r.length===0){const l=n.filter(p=>!o.has(p.id)).sort((p,c)=>(e.get(p.id)??0)-(e.get(c.id)??0))[0];let u=0;for(const p of t)p.to===l.id&&o.has(p.from)&&(u=Math.max(u,(a.get(p.from)??0)+1));a.set(l.id,u),r.push(l.id)}const h=r.shift();if(!(!h||o.has(h))){o.add(h);for(const d of s.get(h)??[]){if(o.has(d))continue;a.set(d,Math.max(a.get(d)??0,(a.get(h)??0)+1));const l=(i.get(d)??1)-1;i.set(d,l),l<=0&&r.push(d)}}}return a}function ui(n,t){const e=Zo(n,t),i=new Map;for(const s of n){const a=e.get(s.id)??0,o=i.get(a)??[];o.push(s),i.set(a,o)}return i}function Ko(n,t,e){const i=ui(n,t),s=[...i.keys()].sort((d,l)=>d-l),a=s.map(d=>Math.max(...(i.get(d)??[]).map(l=>l.width))),o=s.map(d=>{const l=i.get(d)??[];return l.reduce((u,p)=>u+p.height,0)+e.gapY*Math.max(0,l.length-1)}),r=Math.max(0,...o);let h=0;s.forEach((d,l)=>{const u=i.get(d)??[];let p=Math.max(0,(r-o[l])/2);for(const c of u)c.x=h+(a[l]-c.width)/2,c.y=p,p+=c.height+e.gapY;h+=a[l]+e.gapX})}function qo(n,t,e){const i=ui(n,t),s=[...i.keys()].sort((d,l)=>d-l),a=s.map(d=>Math.max(...(i.get(d)??[]).map(l=>l.height))),o=s.map(d=>{const l=i.get(d)??[];return l.reduce((u,p)=>u+p.width,0)+e.gapX*Math.max(0,l.length-1)}),r=Math.max(0,...o);let h=0;s.forEach((d,l)=>{const u=i.get(d)??[];let p=Math.max(0,(r-o[l])/2);for(const c of u)c.x=p,c.y=h+(a[l]-c.height)/2,p+=c.width+e.gapX;h+=a[l]+e.gapY})}function Jo(n,t){const e=Math.max(1,Math.min(t.maxGridCols,Math.ceil(Math.sqrt(n.length)))),i=Math.ceil(n.length/e),s=Array.from({length:e},(l,u)=>Math.max(0,...n.filter((p,c)=>c%e===u).map(p=>p.width))),a=Array.from({length:i},(l,u)=>Math.max(0,...n.slice(u*e,u*e+e).map(p=>p.height))),o=[];let r=0;for(let l=0;l<e;l++)o.push(r),r+=s[l]+t.gridGapX;const h=[];let d=0;for(let l=0;l<i;l++)h.push(d),d+=a[l]+t.gridGapY;n.forEach((l,u)=>{const p=u%e,c=Math.floor(u/e);l.x=o[p]+(s[p]-l.width)/2,l.y=h[c]+(a[c]-l.height)/2})}function Vo(n,t,e){if(n.length===1){n[0].x=0,n[0].y=0;return}const i=new Map(n.map(c=>[c.id,0]));for(const c of t)i.set(c.from,(i.get(c.from)??0)+1),i.set(c.to,(i.get(c.to)??0)+1);const s=[...n].sort((c,y)=>(i.get(y.id)??0)-(i.get(c.id)??0)||c.index-y.index)[0],a=n.filter(c=>c.id!==s.id),o=Math.max(...a.map(c=>c.width)),r=Math.max(...a.map(c=>c.height)),h=Math.max(e.radialMinRadius,s.width/2+o/2+e.radialGap,s.height/2+r/2+e.radialGap);s.x=-s.width/2,s.y=-s.height/2;const d=a.length<=2?0:-Math.PI/2,l=Math.PI*2/a.length;a.forEach((c,y)=>{const w=d+l*y;c.x=Math.cos(w)*h-c.width/2,c.y=Math.sin(w)*h-c.height/2});const u=Math.min(...n.map(c=>c.x)),p=Math.min(...n.map(c=>c.y));n.forEach(c=>{c.x-=u,c.y-=p})}function Qo(n){const t=[];for(const e of n){const i=t[t.length-1];(!i||Math.abs(i[0]-e[0])>.01||Math.abs(i[1]-e[1])>.01)&&t.push(e)}return t.length>=2?t:[[0,0],[0,0]]}function tr(n,t,e){const i=new Map(n.map(a=>[a.id,a])),s=[];for(const a of t){const o=i.get(a.from),r=i.get(a.to);if(!o||!r)continue;const h=wn(o,r),d=wn(r,o),l=yn(o,h),u=yn(r,d),p=u.x-l.x,c=u.y-l.y,w=h==="left"||h==="right"?[[0,0],[p/2,0],[p/2,c],[p,c]]:[[0,0],[0,c/2],[p,c/2],[p,c]],m=Qo(w);let g;if(a.label){const x=e.fontSizes.edge,k=lt(a.label,x),b=Math.ceil(x*1.25),v=(l.x+u.x)/2,A=(l.y+u.y)/2;g=Math.abs(p)>=Math.abs(c)?{x:v-k/2,y:A-b-8}:{x:v+10,y:A-b/2}}s.push({from:a.from,to:a.to,...a.label?{label:a.label}:{},side1:h,side2:d,p1:l,p2:u,points:m,...g?{labelAt:g}:{}})}return s}function er(n,t){const e=n.split(`
`),i=Math.max(1,...e.map(a=>lt(a,t))),s=Math.max(1,Math.ceil(e.length*t*1.25));return{minX:0,minY:0,maxX:i,maxY:s,width:i,height:s,cx:i/2,cy:s/2}}function nr(n){const t=Ht(n.preset),e=Go(t),i=n.nodes.map((o,r)=>Yo(o,t,r,e));switch(n.layout){case"tb":qo(i,n.edges,e);break;case"grid":Jo(i,e);break;case"radial":Vo(i,n.edges,e);break;case"lr":default:Ko(i,n.edges,e);break}const s=tr(i,n.edges,t),a=Ft(i)??{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,cx:0,cy:0};return{nodes:i,routes:s,titleBox:n.title?er(n.title,t.fontSizes.title):null,contentBox:a,preset:t}}class U extends Error{constructor(t,e){super(`plan:${t}${e?` (${e})`:""}`),this.reason=t,this.detail=e,this.name="PlanError"}}const Y={maxNodes:40,maxEdges:80,maxLabel:200,maxNote:120,maxTitle:120,maxCaption:300,maxEdgeLabel:60},ir={lr:"lr",horizontal:"lr","left-right":"lr",tb:"tb",vertical:"tb","top-down":"tb",grid:"grid",matrix:"grid",radial:"radial",mindmap:"radial",circle:"radial"},sr={rounded:"rounded",round:"rounded",card:"rounded",rectangle:"rectangle",rect:"rectangle",square:"rectangle",box:"rectangle",ellipse:"ellipse",oval:"ellipse",circle:"ellipse",diamond:"diamond",decision:"diamond",rhombus:"diamond",text:"text",plain:"text"};function ve(n){return typeof n=="object"&&n!==null&&!Array.isArray(n)}function O(n){return typeof n=="string"?n:typeof n=="number"&&Number.isFinite(n)?String(n):""}function wt(n,t){const e=n.trim().replace(/\r\n?/g,`
`);return e.length>t?`${e.slice(0,t-1)}…`:e}function ar(n){if(typeof n!="string")return null;const t=n.trim().toLowerCase();return ir[t]??null}function or(n){return n===""?"rounded":sr[n.trim().toLowerCase()]??null}function gi(n){return n.trim().replace(/[^\w.-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,48)}function rr(n,t){const e=[],i=new Set;for(let s=0;s<n.length;s++){const a=n[s];let o="",r="",h="",d="";if(typeof a=="string")r=a;else if(ve(a)){o=O(a.id),r=O(a.label??a.text??a.title),h=O(a.shape),d=O(a.group);const u=O(a.note??a.description);u&&(r=r?`${r}
${u}`:u)}else{t.push(`nodes[${s}] 不是字符串或对象，已忽略`);continue}if(r=wt(r,Y.maxLabel+Y.maxNote+1),!r.trim()){t.push(`nodes[${s}] 没有 label，已忽略`);continue}const l=or(h);if(!l)throw new U("bad-shape",`nodes[${s}].shape=${h}`);if(o=gi(o)||`n${s+1}`,i.has(o))throw new U("duplicate-node-id",o);i.add(o),e.push({id:o,label:r,shape:l,...d.trim()?{group:wt(d,40)}:{}})}return e}function Sn(n,t){const e=n.trim();if(!e)return null;const i=t.find(o=>o.id===e||o.id===gi(e));if(i)return i.id;const s=e.toLowerCase(),a=t.filter(o=>o.label.toLowerCase()===s);return a.length===1?a[0].id:null}function cr(n,t,e){const i=[],s=new Set;for(let a=0;a<n.length;a++){const o=n[a];let r="",h="",d="";if(typeof o=="string"){const c=o.split(/\s*->\s*/);if(c.length!==2){e.push(`edges[${a}] 不是 "a->b" 形式，已忽略`);continue}[r,h]=c}else if(Array.isArray(o))r=O(o[0]),h=O(o[1]),d=O(o[2]);else if(ve(o))r=O(o.from??o.source??o.start),h=O(o.to??o.target??o.end),d=O(o.label??o.text);else{e.push(`edges[${a}] 不是字符串/数组/对象，已忽略`);continue}const l=Sn(r,t),u=Sn(h,t);if(!l||!u){e.push(`edges[${a}] 端点不存在（${r||"?"} -> ${h||"?"}），已忽略`);continue}if(l===u){e.push(`edges[${a}] 是自环（${l}），已忽略`);continue}d=wt(d,Y.maxEdgeLabel);const p=`${l}\0${u}\0${d}`;if(s.has(p)){e.push(`edges[${a}] 与前面的边重复，已忽略`);continue}s.add(p),i.push({from:l,to:u,...d?{label:d}:{}})}return i}function lr(n,t={}){if(!ve(n))throw new U("bad-plan","计划必须是 JSON 对象");const e=[],i=n.nodes;if(!Array.isArray(i))throw new U("bad-plan","缺少 nodes 数组");if(i.length>Y.maxNodes)throw new U("too-many-nodes",`${i.length} > ${Y.maxNodes}，请拆成多张白板`);const s=rr(i,e);if(s.length===0)throw new U("empty-plan","没有可用节点");const a=n.edges??[];if(!Array.isArray(a))throw new U("bad-plan","edges 必须是数组");if(a.length>Y.maxEdges)throw new U("too-many-edges",`${a.length} > ${Y.maxEdges}`);const o=cr(a,s,e),r=t.preset!==void 0&&t.preset!==""?t.preset:n.preset;let h="pencil";if(r!=null&&r!==""){const y=No(r);if(!y)throw new U("bad-preset",`${O(r)}（可选 ${fi().join("/")}）`);h=y}const d=t.layout!==void 0&&t.layout!==""?t.layout:n.layout;let l=o.length>0?"lr":"grid";if(d!=null&&d!==""){const y=ar(d);if(!y)throw new U("bad-layout",`${O(d)}（可选 lr/tb/grid/radial）`);l=y}const u=t.title!==void 0&&t.title!==""?t.title:n.title,p=wt(O(u),Y.maxTitle)||void 0,c=wt(O(n.caption),Y.maxCaption)||void 0;return{...p?{title:p}:{},...c?{caption:c}:{},preset:h,layout:l,nodes:s,edges:o,warnings:e}}function dr(n){return(n??"ai").trim().replace(/[^\w.-]+/g,"_").replace(/^_+|_+$/g,"")||"ai"}function ae(n,t,e,i,s,a,o,r){const h=t.split(`
`);return{type:"text",id:n,x:e,y:i,width:Math.max(1,...h.map(d=>lt(d,s))),height:Math.max(1,Math.ceil(h.length*s*1.25)),text:t,fontSize:s,fontFamily:a,strokeColor:o,textAlign:r}}function hr(n,t,e,i,s,a){const r={type:n.shape==="ellipse"?"ellipse":n.shape==="diamond"?"diamond":n.shape==="text"?"text":"rectangle",id:t,x:s+n.x,y:a+n.y,width:n.width,height:n.height,text:n.label,fontSize:i.fontSizes.node,fontFamily:i.fontFamily,strokeColor:i.ink,textAlign:n.shape==="text"?"left":"center"};return n.shape!=="text"&&(r.backgroundColor=n.fill,r.fillStyle=i.fillStyle,r.strokeWidth=i.strokeWidth,r.strokeStyle=i.strokeStyle,r.roughness=i.roughness,n.shape==="rectangle"?r.roundness=null:i.nodeRoundness&&(r.roundness=i.nodeRoundness)),n.group&&(r.groupIds=[`${e}-group-${n.group.replace(/[^\w.-]+/g,"_")}`]),r}function fr(n,t={}){const e=lr(n,t),i=Ht(e.preset),s=nr(e),a=dr(t.idPrefix),o={x:t.origin?.x??0,y:t.origin?.y??0},r=o.x+40,h=o.y+(e.title?96:40),d=[],l=s.nodes.map(g=>{const x=`${a}-${g.id}`;return d.push(hr(g,x,a,i,r,h)),{...g,elementId:x}}),u=s.routes.map(g=>({...g,fromElementId:`${a}-${g.from}`,toElementId:`${a}-${g.to}`,p1:{x:r+g.p1.x,y:h+g.p1.y},p2:{x:r+g.p2.x,y:h+g.p2.y},...g.labelAt?{labelAt:{x:r+g.labelAt.x,y:h+g.labelAt.y}}:{}})),p=e.title?[ae(`${a}-title`,e.title,o.x+40,o.y+24,i.fontSizes.title,i.fontFamily,i.ink,"left")]:[],c=[];u.forEach((g,x)=>{!g.label||!g.labelAt||c.push(ae(`${a}-edge-${x+1}`,g.label,g.labelAt.x,g.labelAt.y,i.fontSizes.edge,i.fontFamily,i.muted,"center"))});const y=e.caption?[ae(`${a}-caption`,e.caption,r,h+s.contentBox.maxY+44,i.fontSizes.caption,i.fontFamily,i.muted,"left")]:[],w=[...p,...d,...c,...y],m=Ft(w.map(g=>({x:g.x,y:g.y,width:g.width??0,height:g.height??0})))??{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,cx:0,cy:0};return{plan:e,preset:i,specs:w,nodes:l,routes:u,bbox:m,background:i.background,idPrefix:a}}const ge="assets/excali-styles",pr=/^[a-z0-9][a-z0-9._-]{0,31}$/,ur=/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,gr=["solid","hachure","cross-hatch"],mr=["solid","dashed","dotted"],mi=["minW","minH","padX","padY","gapX","gapY","gridGapX","gridGapY","radialMinRadius","radialGap","maxGridCols","textWrap"],br=new Set(mi),yr=4e3,wr=8,xr=96,kr=20,Sr=[0,1,2],vr=20,vn=32,En=64,Er=40;class bi extends Error{constructor(t,e,i){super(`style:${t} (${i}) ${e}`),this.reason=t,this.source=i,this.name="StylePackError"}}function ht(n){return typeof n=="object"&&n!==null&&!Array.isArray(n)}function yi(n){return(n.replace(/\\/g,"/").split("/").pop()??"").replace(/\.json$/i,"")}function D(n,t,e){throw new bi(n,t,e)}function Ee(n,t,e){return(typeof n!="string"||!ur.test(n.trim()))&&D("bad-field",`${t} 需要 #rgb/#rrggbb 形式的颜色`,e),n.trim()}function mt(n,t,e,i,s){const a=typeof n=="number"?n:Number(n);return(!Number.isFinite(a)||!Number.isInteger(a)||a<e||a>i)&&D("bad-field",`${t} 需要 ${e}..${i} 的整数（收到 ${String(n)}）`,s),a}function me(n,t,e,i){return(typeof n!="string"||!e.includes(n))&&D("bad-field",`${t} 只能是 ${e.join("/")}（收到 ${String(n)}）`,i),n}function _r(n,t){ht(n)||D("bad-field","fontSizes 需要对象 {title,node,edge,caption}",t);const e={};for(const s of["title","node","edge","caption"]){const a=n[s];a!==void 0&&(e[s]=mt(a,`fontSizes.${s}`,wr,xr,t))}const i=Object.keys(n).filter(s=>!["title","node","edge","caption"].includes(s));return i.length&&D("bad-field",`fontSizes 有未知字段 ${i.join(",")}`,t),Object.keys(e).length===0&&D("bad-field","fontSizes 是空对象",t),e}function Ar(n,t){return(!Array.isArray(n)||n.length===0)&&D("bad-field","palette 需要非空数组",t),n.length>vn&&D("bad-field",`palette 最多 ${vn} 色`,t),n.map((e,i)=>Ee(e,`palette[${i}]`,t))}function $r(n,t){ht(n)||D("bad-field","space 需要对象（gapX/gapY/padX/padY…）",t);const e={};for(const s of mi){const a=n[s];a!==void 0&&(e[s]=mt(a,`space.${s}`,0,yr,t))}const i=Object.keys(n).filter(s=>!br.has(s));return i.length&&D("bad-field",`space 有未知字段 ${i.join(",")}`,t),Object.keys(e).length===0&&D("bad-field","space 是空对象",t),e}function Ir(n,t){ht(n)||D("bad-field","groupColor 需要对象 {mode,roles}",t);const e=me(n.mode,"groupColor.mode",["hash","roles"],t);if(e!=="roles")return{mode:e};const i=n.roles;ht(i)||D("bad-field","groupColor.roles 需要 {分组名:颜色}",t);const s=Object.entries(i);s.length===0&&D("bad-field","groupColor.roles 是空对象",t),s.length>En&&D("bad-field",`groupColor.roles 最多 ${En} 组`,t);const a={};for(const[o,r]of s){const h=o.trim().slice(0,Er);h||D("bad-field","groupColor.roles 有空的分组名",t),a[h]=Ee(r,`groupColor.roles.${h}`,t)}return{mode:e,roles:a}}function Mr(n,t){return n===null?null:typeof n=="number"?{type:n}:ht(n)&&typeof n.type=="number"?{type:n.type}:D("bad-field","nodeRoundness 需要 null / {type:number}",t)}function Cr(n,t="inline",e=new Set){let i;try{i=JSON.parse(n)}catch(l){return D("bad-json",`不是合法 JSON：${l instanceof Error?l.message:String(l)}`,t)}if(!ht(i))return D("bad-pack","风格包必须是 JSON 对象",t);const s=typeof i.name=="string"&&i.name.trim()?i.name:yi(t),a=dt(s);pr.test(a)||D("bad-name",`${s} → ${a||"(空)"}（要求小写字母/数字/._-，首字符字母数字，≤32）`,t);const o=i.extends===void 0||i.extends===null||i.extends===""?"pencil":dt(String(i.extends));!Fo(o)&&!e.has(o)&&D("bad-extends",`${o} 不存在（内置之外可用 ${[...e].join("/")||"无"}）`,t),o===a&&D("bad-extends","不能 extends 自己",t);const r={},h=["background","ink","fill","edge","muted"];for(const l of h)i[l]!==void 0&&(r[l]=Ee(i[l],l,t));if(i.palette!==void 0&&(r.fillPalette=Ar(i.palette,t)),i.strokeWidth!==void 0&&(r.strokeWidth=mt(i.strokeWidth,"strokeWidth",0,kr,t)),i.roughness!==void 0){const l=mt(i.roughness,"roughness",0,2,t);Sr.includes(l)||D("bad-field","roughness 只能是 0/1/2",t),r.roughness=l}i.fillStyle!==void 0&&(r.fillStyle=me(i.fillStyle,"fillStyle",gr,t)),i.strokeStyle!==void 0&&(r.strokeStyle=me(i.strokeStyle,"strokeStyle",mr,t)),i.fontFamily!==void 0&&(r.fontFamily=mt(i.fontFamily,"fontFamily",1,vr,t)),i.fontSizes!==void 0&&(r.fontSizes=_r(i.fontSizes,t)),i.nodeRoundness!==void 0&&(r.nodeRoundness=Mr(i.nodeRoundness,t)),i.space!==void 0&&(r.space=$r(i.space,t)),i.groupColor!==void 0&&(r.groupColor=Ir(i.groupColor,t));const d=typeof i.label=="string"&&i.label.trim()?i.label.trim().slice(0,40):a;return{name:a,extendsFrom:o,label:d,diff:r}}function Tr(n,t="inline",e){const i=Cr(n,t,e);return jo(i.name,{extendsFrom:i.extendsFrom,diff:{...i.diff,label:i.label}}),{name:i.name,extends:i.extendsFrom,label:i.label}}async function Rr(n,t=ge){Ho();const e=[];let i=[];try{i=(await n.list()).filter(o=>/\.json$/i.test(o)).sort()}catch(o){return e.push(`${t} 目录读不了，只用内置风格：${o instanceof Error?o.message:String(o)}`),{loaded:[],warnings:e}}const s=new Set(i.map(o=>dt(yi(o)))),a=[];for(const o of i){const r=`${t}/${o}`;let h;try{h=await n.read(o)}catch(d){e.push(`${r} 读不到，已跳过：${d instanceof Error?d.message:String(d)}`);continue}try{a.push(Tr(h,r,s))}catch(d){d instanceof bi?e.push(d.message):e.push(`${r} 加载失败：${d instanceof Error?d.message:String(d)}`)}}for(const o of a)try{Ht(o.name)}catch(r){e.push(`style:${o.name} 解析失败，绘图时不可用：${r instanceof Error?r.message:String(r)}`)}return{loaded:a,warnings:e}}function Dr(){const n=[];for(const t of fi())try{n.push({name:t,extends:zo(t)??"-",label:Ht(t).label??t})}catch{}return n}const Lr=12*1024*1024,Pr="1024x1024",Br="gpt-image-1";function Or(n,t){const e=t.toLowerCase();for(const[i,s]of Object.entries(n??{}))if(i.toLowerCase()===e)return Array.isArray(s)?String(s[0]??""):typeof s=="string"?s:String(s??"");return""}function Nr(n){const t=String(n??"").trim().replace(/\/+$/,"");if(!t)throw new Error("未配置图像 API 地址");if(!/^https?:\/\//i.test(t))throw new Error("图像 API 地址必须以 http:// 或 https:// 开头");return/\/images\/generations$/i.test(t)?t:`${t}/images/generations`}function Fr(n,t,e={}){const i=String(t??"").trim();if(!i)throw new Error("prompt 不能为空");if(i.length>4e3)throw new Error("prompt 过长（上限 4000 字符）");const s=String(n.apiKey??"").trim();if(!s)throw new Error("未配置图像 API Key");const a=String(n.model??"").trim()||Br,o=String(e.size??n.size??"").trim()||Pr;return{url:Nr(n.baseUrl),headers:{Authorization:`Bearer ${s}`,"Content-Type":"application/json"},payload:JSON.stringify({model:a,prompt:i,n:1,size:o}),size:o}}function zt(n){const t=n.replace(/\s+/g,"").replace(/-/g,"+").replace(/_/g,"/"),e=t.length%4;return e===0?t:t+"=".repeat(4-e)}function jr(n){const t=/^data:([^;,]+);base64,([\s\S]+)$/i.exec(n.trim());return t?{mime:t[1]||"image/png",base64:zt(t[2])}:null}function Hr(n){if(!n||typeof n!="object")throw new Error("图像 API 返回的不是 JSON 对象");const t=n;if(t.error){const r=t.error,h=r&&typeof r=="object"&&typeof r.message=="string"?r.message:typeof r=="string"?r:"图像 API 返回错误";throw new Error(`图像 API：${h}`)}const e=Array.isArray(t.data)?t.data[0]:t.data,i=e&&typeof e=="object"?e:t,s=typeof i.revised_prompt=="string"?i.revised_prompt:typeof t.revised_prompt=="string"?t.revised_prompt:void 0,a=typeof i.b64_json=="string"?i.b64_json:typeof t.b64_json=="string"?t.b64_json:"";if(a){const r=jr(a);return{kind:"inline",base64:r?r.base64:zt(a),...s?{revisedPrompt:s}:{}}}const o=typeof i.url=="string"?i.url:typeof t.url=="string"?t.url:"";if(o)return{kind:"url",url:o,...s?{revisedPrompt:s}:{}};throw new Error("图像 API 没有返回图片（b64_json / url 都为空）")}function wi(n){const t=atob(zt(n)),e=new Uint8Array(t.length);for(let i=0;i<t.length;i++)e[i]=t.charCodeAt(i)&255;return e}function oe(n,t){return n[t]<<8|n[t+1]}function _n(n,t){return(n[t]<<24|n[t+1]<<16|n[t+2]<<8|n[t+3])>>>0}function Ct(n,t){return n[t]|n[t+1]<<8}function An(n,t){return n[t]|n[t+1]<<8|n[t+2]<<16}function $n(n,t){return(n[t]|n[t+1]<<8|n[t+2]<<16|n[t+3]<<24)>>>0}function In(n){let t;try{t=wi(n.slice(0,64))}catch{return"image/png"}return t.length>=8&&t[0]===137&&t[1]===80&&t[2]===78&&t[3]===71?"image/png":t.length>=3&&t[0]===255&&t[1]===216&&t[2]===255?"image/jpeg":t.length>=4&&t[0]===71&&t[1]===73&&t[2]===70?"image/gif":t.length>=12&&t[0]===82&&t[1]===73&&t[2]===70&&t[3]===70&&t[8]===87&&t[9]===69&&t[10]===66&&t[11]===80?"image/webp":t.length>=2&&t[0]===66&&t[1]===77?"image/bmp":"image/png"}function zr(n){let t;try{t=wi(n)}catch{return null}if(t.length>=24&&t[0]===137&&t[1]===80&&t[2]===78&&t[3]===71)return{width:_n(t,16),height:_n(t,20)};if(t.length>=10&&t[0]===71&&t[1]===73&&t[2]===70)return{width:Ct(t,6),height:Ct(t,8)};if(t.length>=26&&t[0]===66&&t[1]===77){const e=$n(t,22);return{width:$n(t,18),height:e>2147483647?4294967296-e:e}}if(t.length>=30&&t[0]===82&&t[1]===73&&t[2]===70&&t[3]===70&&t[8]===87&&t[9]===69&&t[10]===66&&t[11]===80){const e=String.fromCharCode(t[12],t[13],t[14],t[15]);if(e==="VP8X"&&t.length>=30)return{width:An(t,24)+1,height:An(t,27)+1};if(e==="VP8 "&&t.length>=30)return{width:Ct(t,26)&16383,height:Ct(t,28)&16383};if(e==="VP8L"&&t.length>=25){const i=t[21]|t[22]<<8|t[23]<<16|t[24]<<24;return{width:(i&16383)+1,height:(i>>>14&16383)+1}}return null}if(t.length>=4&&t[0]===255&&t[1]===216){let e=2;for(;e+3<t.length;){if(t[e]!==255){e+=1;continue}const i=t[e+1];if(i===216||i===217||i===1||i>=208&&i<=215){e+=2;continue}const s=oe(t,e+2);if(s<2)break;if((i>=192&&i<=195||i>=197&&i<=199||i>=201&&i<=203||i>=205&&i<=207)&&e+8<t.length)return{width:oe(t,e+7),height:oe(t,e+5)};e+=2+s}}return null}async function Ur(n,t,e,i={}){const s=Fr(n,t,i),a=await e({url:s.url,method:"POST",headers:s.headers,payload:s.payload,contentType:"application/json",timeout:18e4});if(a.code!==0)throw new Error(`思源转发失败：${a.msg||`code ${a.code}`}`);if(a.status<200||a.status>=300)throw new Error(`图像 API HTTP ${a.status}：${String(a.body??"").slice(0,300)}`);let o;try{o=JSON.parse(a.body)}catch{throw new Error("图像 API 返回的不是 JSON")}const r=Hr(o);let h,d;if(r.kind==="inline")h=r.base64,d=In(h);else{if(!/^https?:\/\//i.test(r.url))throw new Error("图像 API 返回的图片 URL 不是 http(s)");const p=await e({url:r.url,method:"GET",headers:{},payload:"",contentType:"application/octet-stream",timeout:12e4,responseEncoding:"base64"});if(p.code!==0)throw new Error(`图片下载失败：${p.msg||`code ${p.code}`}`);if(p.status<200||p.status>=300)throw new Error(`图片下载 HTTP ${p.status}`);if(h=zt(p.body||""),!h)throw new Error("图片下载返回空内容");const c=Or(p.headers,"content-type").split(";")[0].trim().toLowerCase();d=/^image\//.test(c)?c:In(h)}const l=Math.floor(h.length*3/4);if(l>Lr)throw new Error(`生成的图片过大（约 ${(l/1024/1024).toFixed(1)} MiB，上限 12 MiB）`);const u=zr(h);return{dataURL:`data:${d};base64,${h}`,mime:d,base64:h,width:u?.width&&u.width>0?u.width:1024,height:u?.height&&u.height>0?u.height:1024,...r.revisedPrompt?{revisedPrompt:r.revisedPrompt}:{}}}function Wr(){return async n=>{const t={url:n.url,method:n.method||"POST",timeout:n.timeout??12e4,contentType:n.contentType||"application/json",headers:Object.entries(n.headers??{}).map(([o,r])=>({[o]:r})),payload:n.payload??""};n.responseEncoding&&(t.responseEncoding=n.responseEncoding);const e=await fetch("/api/network/forwardProxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),i=await e.json().catch(()=>null);if(!i||typeof i!="object")throw new Error(`forwardProxy 返回异常（HTTP ${e.status}）`);const s=i.data&&typeof i.data=="object"?i.data:{},a=s.body;return{code:typeof i.code=="number"?i.code:-1,msg:typeof i.msg=="string"?i.msg:"",status:typeof s.status=="number"?s.status:0,headers:s.headers&&typeof s.headers=="object"?s.headers:{},body:typeof a=="string"?a:a!=null?JSON.stringify(a):""}}}const Mn="excali-studio",Xr=8,Gr=5,Yr={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function N(n){return n.replace(/[&<>"']/g,t=>Yr[t])}function K(n){return N(n)}class Zr extends E.Plugin{constructor(){super(...arguments),this.tabs=new Map,this.settings={...L},this.recent=[],this.boardActions=new Map,this.activeCustom=null,this.dockRefresh=null,this.onloadRan=new Set,this.boardDocs=[],this.boardFiles=[],this.dirMigrated=!1,this.legacyBoards=[],this.ready=Promise.resolve(),this.boardSvgByDocId=new Map,this.libLoading=!1,this.autoOpenedDocs=new Set,this.checkupRunning=!1,this.embedClickHandler=null,this.lazyEngine=null,this.scriptPickerDialog=null,this.inputPromptChain=Promise.resolve(),this.selectOptionChain=Promise.resolve(),this.libCache=null}lazyMod(){return this.lazyEngine??=this.loadEngineModule(),this.lazyEngine}async loadEngineModule(){const t=new URL(`plugins/${Tt}/engine.js`,`${location.origin}/`).href,e=await fetch(t);if(!e.ok)throw new Error(`HTTP ${e.status} ${t}`);const i=await e.text(),s={exports:{}};return window.eval(`(function anonymous(require, module, exports){
${i}
})
//# sourceURL=plugins/${Tt}/engine.js
`)(require,s,s.exports),s.exports}async onload(){xi(this.i18n),this.ready=this.bootstrapState(),this.addIcons(_i),this.registerStudioTab(),this.registerDock(),this.addTopBar({id:"excali-studio-open",icon:q,title:f("打开白板"),callback:()=>void this.openNew(),contextMenu:t=>this.buildTopMenu(t)}),this.protyleSlash.push({id:"excaliStudio",filter:["白板","画板","excali","excalidraw","whiteboard","bb","hb"],html:Ai(f("白板")),callback:t=>{this.clearSlashHint(t),this.openNew()}}),this.addCommand({langKey:"openExcaliStudio",langText:f("打开白板"),hotkey:"⌘⌥E",customHotkey:"",callback:()=>void this.openNew()}),Si(),Ga(this),this.registerBlockIconMenu(),this.registerEmbedClick(),this.setupSetting(),this.registerAgentCapabilities(),await this.ready,this.registerBoardDocEvents(),this.refreshBoardLib(),po().then(async t=>{t>0&&E.showMessage(f("已安装 {n} 个内置脚本到 {dir}",{n:t,dir:j}),5e3);try{const e=await go(this.settings.builtinSnapshot),i=this.settings.builtinSnapshot;Object.keys(i).length===Object.keys(e.snapshot).length&&Object.keys(e.snapshot).every(o=>i[o]===e.snapshot[o])||(this.settings.builtinSnapshot=e.snapshot,this.persist()),e.updated.length>0&&E.showMessage(f("内置脚本已更新到最新版（{n} 个），你自建的脚本不受影响",{n:e.updated.length}),5e3)}catch(e){console.warn("[excali-studio] 内置脚本同步失败",e)}}).catch(t=>console.warn("[excali-studio] 内置脚本安装失败",t))}onunload(){const t=[...this.tabs.values()];t.forEach(e=>e.tab.close()),this.tabs.clear(),this.embedClickHandler&&(document.removeEventListener("click",this.embedClickHandler,!0),this.embedClickHandler=null),t.length>0&&E.showMessage(f("插件已卸载，画板未保存的改动会丢失"),3e3)}registerEmbedClick(){this.embedClickHandler=t=>{const e=t.target;if(!e||e.tagName!=="IMG")return;const i=e.getAttribute("src")||"";let s=i;try{s=new URL(i,location.origin).pathname}catch{}const a=/^\/(assets\/.+\.svg)$/i.exec(s);if(!a)return;const o=a[1];this.boardFiles.some(h=>P(h.dataPath)===o)&&(t.preventDefault(),t.stopPropagation(),this.openStudioTab(_(o)))},document.addEventListener("click",this.embedClickHandler,!0)}async bootstrapState(){try{await this.loadState()}catch(t){console.error("[excali-studio] 读取设置失败，用默认值继续",t)}try{await this.migrateLegacyBoards()}catch(t){console.error("[excali-studio] 旧白板迁移失败（下次启动重试）",t)}}async migrateLegacyBoards(){if(this.dirMigrated)return;const t=ii(this.settings.saveDir);if(t!==ut&&t!==at){this.dirMigrated=!0,this.persist();return}let e=[];try{e=(await ot(ut)).map(r=>r.path).filter(r=>Ha(T(r)))}catch(r){console.warn("[excali-studio] 迁移：读取旧保存目录失败（按近期/绑定继续）",r)}let i=[];try{i=await gn()}catch(r){console.warn("[excali-studio] 迁移：查询白板文档失败（按近期/命名继续）",r)}const s=Wa({recent:this.recent,registry:this.legacyBoards,docSvgs:i.map(r=>r.svg),autoNamed:e}),a=new Map,o=[];for(const r of s)try{const h=await fn(r,await te(at,T(r)));a.set(r,_(h));try{await un(P(r),P(h))}catch(d){console.warn("[excali-studio] 迁移后更新正文资源引用失败",r,d)}}catch(h){console.warn("[excali-studio] 迁移白板失败",r,h),o.push(r)}if(t===ut&&await this.migrateLibraryFile(),a.size>0){this.recent=Xa(this.recent,a);for(const r of i){const h=a.get(_(r.svg));if(h)try{await ee(r.id,{"custom-excali-svg":P(h)})}catch(d){console.warn("[excali-studio] 迁移后更新文档绑定失败",r.id,d)}}for(const r of this.tabs.values()){const h=a.get(_(r.data.dataPath??""));h&&(r.data.dataPath=h,r.tab.updateTitle(T(h)))}}this.settings={...this.settings,saveDir:at},this.dirMigrated=o.length===0,this.persist(),o.length>0?E.showMessage(f("白板迁移未完成：{fail} 块失败，下次启动会重试",{fail:o.length}),1e4,"error"):a.size>0&&E.showMessage(f("已把 {n} 块白板迁入 {dir}",{n:a.size,dir:at}),6e3)}async migrateLibraryFile(){const t=_(J(ut,"excali-library.json")),e=_(J(at,"excali-library.json"));try{await X(t)&&!await X(e)&&(await ct(e,await B(t)),await rt(t))}catch(i){console.warn("[excali-studio] 迁移图库文件失败（忽略）",i)}}async remapBoardPath(t){const e=_(t),i=_(J(this.settings.saveDir,T(e)));return i===e?null:await X(i)?i:null}registerStudioTab(){const t=this,e={load:i=>this.loadScene(i),remapPath:i=>this.remapBoardPath(i),restoreFromBackup:i=>this.restoreFromBackup(i),get accent(){return t.settings.accentStroke?_a():null},onSave:(i,s)=>this.saveSvg(i,s),saveMedia:(i,s)=>this.saveBoardMedia(i,s),openDocLink:i=>this.openBoardDocLink(i),promptFileName:(i,s)=>this.promptFileName(i,s),onRename:(i,s)=>this.renameBoard(i,s),loadLibraryItems:()=>this.loadLibraryItems(),saveLibraryItems:i=>this.saveLibraryItems(i),get showWelcome(){return t.settings.showWelcome},get gridModeEnabled(){return t.settings.gridModeEnabled},onGridChange:i=>this.rememberGrid(i),onOpenExisting:()=>this.promptOpenPath(),onNewBoard:()=>void this.openNew(),onBoardActions:(i,s)=>{s?(this.boardActions.set(i,s),this.onloadRan.has(i)||(this.onloadRan.add(i),this.runOnloadScripts(i))):(this.boardActions.delete(i),this.onloadRan.delete(i)),!s&&this.activeCustom===i&&(this.activeCustom=null),this.dockRefresh?.()},onBoardActive:i=>{this.activeCustom=i},copyBoardRef:i=>t.copyBoardRefFor(i),onRunScript:()=>void this.openScriptPicker(),listPinnedScripts:()=>this.listPinnedScripts(),onRunScriptFile:(i,s)=>void this.runScriptFile(i,s),onPinScript:(i,s)=>this.rememberScriptPin(i,s),listPinnedActions:()=>this.settings.pinnedActions,onPinAction:(i,s)=>this.rememberActionPin(i,s),getAiChannels:()=>this.settings.aiChannels,onAiChannel:(i,s)=>this.setAiChannel(i,s),get scriptRailCollapsed(){return t.settings.scriptRailCollapsed},get scriptRailTop(){return t.settings.scriptRailTop},onScriptRailCollapsedChange:i=>this.rememberScriptRail("scriptRailCollapsed",i),onScriptRailTopChange:i=>this.rememberScriptRail("scriptRailTop",i),get highlighter(){return t.settings.highlighter},onHighlighterChange:i=>this.rememberHighlighter(i),onHelp:()=>this.openHelp(),getLibraryImportUrl:()=>t.libraryImportUrl(),get libDirAbs(){return vi(Ei(),t.libDirRel())},get boardDir(){return t.settings.saveDir},pickBoardPath:()=>this.pickBoardRef()};this.addTab({type:dn,init:i=>{const s=i.element;s.classList.add("exs-panel"),s.innerHTML=`<div class="exs-loading">${f("正在打开白板…")}</div>`,this.lazyMod().then(a=>{s.innerHTML="",this.tabs.set(i,a.attachStudioTab(i,e))}).catch(a=>{console.error("[excali-studio] 画板引擎加载失败",a),s.innerHTML=`<div class="exs-loaderror"><div>${f("画板引擎加载失败：{msg}",{msg:a instanceof Error?a.message:String(a)})}</div></div>`})},destroy:function(){t.tabs.get(this)?.dispose(),t.tabs.delete(this),t.boardActions.delete(this),t.activeCustom===this&&(t.activeCustom=null),t.dockRefresh?.()}})}eaHost(){const t=this;return{getDocMarkdown:async()=>{const e=ai()?.block?.rootID;if(!e)return"";const a=(await(await fetch("/api/block/getBlockKramdown",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e})})).json().catch(()=>null))?.data;return typeof a=="string"?a:a&&typeof a=="object"&&typeof a.kramdown=="string"?a.kramdown:""},getSelectedText:()=>{const e=window.getSelection();return e?String(e.toString()??""):""},listFiles:async e=>{try{return await ma(e||t.settings.saveDir)}catch{return[]}},readFileAsDataURL:async e=>{const i=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:_(e)})});if(!i.ok)throw new Error(`getFile HTTP ${i.status}`);const s=await i.blob();return new Promise((a,o)=>{const r=new FileReader;r.onload=()=>a(String(r.result||"")),r.onerror=()=>o(r.error||new Error("读取失败")),r.readAsDataURL(s)})},save:()=>void t.activeActions()?.flush(),notify:e=>E.showMessage(e),getSettings:()=>({saveDir:t.settings.saveDir}),getScriptSetting:(e,i)=>{const s=(pt[e]??[]).find(o=>o.key===i);if(!s)return;const a=t.settings.scriptSettings?.[e]?.[i];return a===void 0||typeof a!=typeof s.default||s.type==="number"&&typeof a=="number"&&(!Number.isFinite(a)||s.min!==void 0&&a<s.min||s.max!==void 0&&a>s.max)||s.type==="select"&&typeof a=="string"&&s.options&&!s.options.some(o=>o.value===a)?s.default:a},setScriptSetting:(e,i,s)=>{if(!(pt[e]??[]).find(r=>r.key===i))return;const o=t.settings.scriptSettings??{};t.settings={...t.settings,scriptSettings:{...o,[e]:{...o[e]??{},[i]:s}}},t.persist()},getHighlighter:()=>Pt(t.settings.highlighter),siyuanCall:async(e,i)=>{if(!/^(block\/(getBlockKramdown|getBlockDOM|getBlockInfo|getBlockAttrs|getBlockBreadcrumb|getChildBlocks)|export\/exportMdContent|filetree\/(getDoc|getHPathByID|getHPathByPath)|query\/sql|file\/getFile)$/.test(e))throw new Error(`只读白名单外的接口不可调用：${e}`);const a=await fetch(`/api/${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i??{})}),o=await a.json().catch(()=>null);if(!a.ok||!o||o.code!==0)throw new Error(`内核 API 失败：${e} ${o?.msg||`HTTP ${a.status}`}`);return o.data},inputPrompt:(e,i,s)=>{const a=()=>new Promise(r=>{let h=!1;const d=c=>{h||(h=!0,l.destroy(),r(c))},l=new E.Dialog({title:e,width:"340px",content:`<div class="exs-picker">
  <input class="b3-text-field fn__block exs-name-input" type="${i==="number"?"number":i==="password"?"password":"text"}" value="${K(s)}" />
  <div class="fn__flex" style="gap:8px;margin-top:12px;justify-content:flex-end">
    <button class="b3-button b3-button--outline exs-name-cancel" type="button">${f("取消")}</button>
    <button class="b3-button b3-button--text exs-name-ok" type="button">${f("确定")}</button>
  </div>
</div>`,destroyCallback:()=>d(null)}),u=l.element.querySelector(".exs-name-input");l.element.querySelector(".exs-name-cancel").addEventListener("click",()=>d(null));const p=()=>d(u.value);l.element.querySelector(".exs-name-ok").addEventListener("click",p),u.addEventListener("keydown",c=>{c.key==="Enter"?(c.preventDefault(),p()):c.key==="Escape"&&(c.preventDefault(),d(null)),c.stopPropagation()}),setTimeout(()=>{u.focus(),u.select()},50)}),o=this.inputPromptChain.then(a,a);return this.inputPromptChain=o.catch(()=>null),o},selectOption:e=>{const i=()=>new Promise(a=>{if(e.options.length===0){a(null);return}let o=!1;const r=new E.Menu("excali-select-option",()=>{o||a(null)});for(const d of e.options)r.addItem({label:d.hint?`${d.label}（${d.hint}）`:d.label,current:d.value===e.current,click:()=>{o=!0,a(d.value)}});const h=e.at??{x:window.innerWidth/2,y:window.innerHeight/3};r.open({x:h.x,y:h.y})}),s=this.selectOptionChain.then(i,i);return this.selectOptionChain=s.catch(()=>null),s}}}async agentRun(t){try{return await t()}catch(e){return console.warn("[excali-studio] 智能体能力失败",e),{error:e instanceof Error?e.message:String(e)}}}agentBoardDir(){return P(_(this.settings.saveDir)).replace(/\/+$/,"")}async resolveAgentBoard(t){const e=typeof t.board=="string"?t.board.trim():"",i=typeof t.path=="string"&&t.path.trim()?t.path.trim():/\.svg$/i.test(e)?e:"",s=typeof t.title=="string"&&t.title.trim()?t.title.trim():/\.svg$/i.test(e)?"":e;await this.ready;const a=this.agentBoardDir();if(i){const u=P(_(i));return!/\.svg$/i.test(u)||a!==""&&!u.startsWith(`${a}/`)||!await X(u)?null:{path:_(u),title:T(u).replace(/\.svg$/i,"")}}if(!s)return null;const o=await ot(this.settings.saveDir),r=s.replace(/\.svg$/i,"").toLowerCase(),h=o.filter(u=>T(u.path).replace(/\.svg$/i,"").toLowerCase()===r);if(h.length===0)return null;const l=h.find(u=>T(u.path).replace(/\.svg$/i,"")===s.replace(/\.svg$/i,""))??h[0];return{path:_(l.path),title:T(l.path).replace(/\.svg$/i,"")}}async waitForAgentActions(t,e=2e4){const i=_(t),s=Date.now()+e;for(;Date.now()<s;){for(const[a,o]of this.tabs){if(o.data.dataPath!==i)continue;const r=this.boardActions.get(a);if(r?.getEaHandle())return r}await new Promise(a=>setTimeout(a,120))}return null}agentDrawOrigin(t){const e=t.getElements().filter(s=>!s.isDeleted);if(e.length===0)return{x:0,y:0};const i=Ft(e);return i?{x:i.minX,y:i.maxY+80}:{x:0,y:0}}loadAgentStyles(){return Rr({list:async()=>(await hn(ge,/\.json$/i)).map(t=>t.slice(t.lastIndexOf("/")+1)),read:t=>B(`${ge}/${t}`)})}async agentListBoards(t){await this.ready;const e=typeof t.query=="string"?t.query.trim().toLowerCase():"",i=Number(t.limit),s=Number.isFinite(i)?Math.max(1,Math.min(100,Math.floor(i))):50,a=await ot(this.settings.saveDir),o=e?a.filter(l=>l.path.toLowerCase().includes(e)||T(l.path).toLowerCase().includes(e)):a,r=o.slice(0,s).map(l=>({title:T(l.path).replace(/\.svg$/i,""),path:l.path,updated:l.updated,updatedAt:l.updated?new Date(l.updated).toISOString():""})),h=await this.loadAgentStyles(),d=Dr();return{result:`白板库 ${this.agentBoardDir()}：${o.length} 块${e?`（匹配「${e}」）`:""}。可用风格：${d.map(l=>l.name).join("/")}。`,structuredContent:{dir:this.agentBoardDir(),total:o.length,boards:r,styles:d,styleWarnings:h.warnings}}}async agentOpenBoard(t){const e=await this.resolveAgentBoard(t);if(!e)return{error:`找不到白板：${String(t.board??t.path??"")}（只认 ${this.agentBoardDir()} 下的 .svg）`};await this.openStudioTab(e.path);const i=await this.waitForAgentActions(e.path,15e3);return{result:`已打开「${e.title}」${i?"":"（画布引擎仍在加载）"}。`,structuredContent:{ok:!0,path:P(e.path),title:e.title,ready:!!i}}}async agentDrawBoard(t){await this.ready;let e=t.plan;if(typeof e=="string")try{e=JSON.parse(e)}catch{return{error:"plan 是字符串但不是合法 JSON"}}if(!e||typeof e!="object"||Array.isArray(e))return{error:"缺少 plan 对象（nodes/edges/title/preset/layout）"};const i=t.append!==!1,s=[t.board,t.path].some(x=>typeof x=="string"&&x.trim()!==""),a=i?await this.resolveAgentBoard(t):null;if(i&&s&&!a)return{error:`找不到白板：${String(t.board??t.path)}（不自动改新建，避免画错板）`};let o,r,h=!1;if(a)o=a;else{const x=e.title,k=typeof t.title=="string"&&t.title.trim()||typeof x=="string"&&x.trim()||f("AI 白板"),b=await this.createBoardFile(k);r=b.docId,o={path:b.path,title:T(b.path).replace(/\.svg$/i,"")},h=!0}await this.openStudioTab(o.path,r);const d=await this.waitForAgentActions(o.path),l=d?.getEaHandle();if(!d||!l)return{error:`白板「${o.title}」已打开，但画布引擎未在 20 秒内就绪。请手动打开后重试。`};const u=h?{x:0,y:0}:this.agentDrawOrigin(l),p=await this.loadAgentStyles(),c=[t.style,t.preset].find(x=>typeof x=="string"&&x.trim()!==""),y=fr(e,{origin:u,idPrefix:ue("ai"),preset:c,layout:t.layout});l.addElements(y.specs);let w=0;for(const x of y.routes){const k=l.connectObjects(x.fromElementId,x.side1,x.toElementId,x.side2,4);k&&(w+=1,l.patchElements([k],{x:x.p1.x,y:x.p1.y,points:x.points,strokeColor:y.preset.edge,strokeWidth:y.preset.strokeWidth,strokeStyle:y.preset.strokeStyle,roughness:y.preset.roughness}))}l.selectElements(y.nodes.map(x=>x.elementId)),l.scrollToContent();let m=!1;try{m=await d.flush()}catch{m=!1}const g={ok:!0,created:h,path:P(o.path),title:o.title,nodes:y.nodes.length,edges:w,preset:y.plan.preset,layout:y.plan.layout,styleWarnings:p.warnings,saved:m,origin:u,warnings:y.plan.warnings};return{result:`${h?"已新建":"已绘制到"}「${o.title}」：${g.nodes} 个节点、${g.edges} 条连线（${g.path}）${m?"。":"；落盘失败，稍后自动保存会重试。"}`+(g.warnings.length?` 忽略 ${g.warnings.length} 条计划警告。`:""),structuredContent:g}}async agentGenerateImage(t){await this.ready;const e=typeof t.prompt=="string"?t.prompt.trim():"";if(!e)return{error:"prompt 不能为空"};const i=t.append!==!1,s=[t.board,t.path].some(k=>typeof k=="string"&&k.trim()!==""),a=i?await this.resolveAgentBoard(t):null;if(i&&s&&!a)return{error:`找不到白板：${String(t.board??t.path)}（不自动改新建，避免插错板）`};let o;try{o=await Ur({baseUrl:this.settings.imageBaseUrl,model:this.settings.imageModel,apiKey:this.settings.imageApiKey,size:this.settings.imageSize},e,Wr(),{size:typeof t.size=="string"&&t.size.trim()?t.size.trim():void 0})}catch(k){return{error:k instanceof Error?k.message:String(k)}}let r,h,d=!1;if(a)r=a;else{const k=typeof t.title=="string"&&t.title.trim()||f("AI 图片"),b=await this.createBoardFile(k);h=b.docId,r={path:b.path,title:T(b.path).replace(/\.svg$/i,"")},d=!0}await this.openStudioTab(r.path,h);const l=await this.waitForAgentActions(r.path),u=l?.getEaHandle();if(!l||!u)return{error:`图片已生成，但白板「${r.title}」的画布未在 20 秒内就绪，未插入。请手动打开后重试（会重新生成一张图）。`};const p=d?{x:0,y:0}:this.agentDrawOrigin(u),c=this.agentImageDimension(t.width)??o.width,y=this.agentImageDimension(t.height)??o.height;let w="";try{w=await u.addImage(o.dataURL,{...p,width:c,height:y})}catch(k){return{error:`图片已生成，但插入画布失败：${k instanceof Error?k.message:String(k)}`}}u.selectElements([w]),u.scrollToElement(w);let m=!1;try{m=await l.flush()}catch{m=!1}const g=Math.floor(o.base64.length*3/4),x={ok:!0,created:d,path:P(r.path),title:r.title,imageId:w,width:c,height:y,mime:o.mime,bytes:g,revisedPrompt:o.revisedPrompt??"",saved:m,origin:p};return{result:`${d?"已新建并插入":"已插入"}图片到「${r.title}」：${c}×${y}（${x.path}）${m?"。":"；落盘失败，稍后自动保存会重试。"}`+(o.revisedPrompt?` 模型改写：${o.revisedPrompt}`:""),structuredContent:x}}agentImageDimension(t){if(t==null||t==="")return;const e=Number(t);if(Number.isFinite(e))return Math.max(64,Math.min(4096,Math.round(e)))}registerAgentCapabilities(){if(typeof this.addAgentCapability=="function"&&this.settings.aiChannels.agent)try{this.addAgentCapability({name:"excali_list_boards",title:f("列出 Excali 白板"),description:f("列出白板库里的白板（标题、路径、更新时间），可按 query 过滤。只读。"),inputSchema:{type:"object",properties:{query:{type:"string",description:f("按标题/路径过滤（不区分大小写）")},limit:{type:"number",minimum:1,maximum:100,description:f("最多返回条数，默认 50")}}},effects:{localRead:!0},handler:t=>this.agentRun(()=>this.agentListBoards(t))}),this.addAgentCapability({name:"excali_open_board",title:f("打开 Excali 白板"),description:f("打开指定白板并等待画布就绪；board 传标题，path 传保存目录下的路径。"),inputSchema:{type:"object",properties:{board:{type:"string",description:f("白板标题（不含 .svg）")},path:{type:"string",description:f("白板路径，如 assets/excali/foo.svg")}}},effects:{localRead:!0},handler:t=>this.agentRun(()=>this.agentOpenBoard(t))}),this.addAgentCapability({name:"excali_draw_board",title:f("用 AI 计划绘制 Excali 白板"),description:f("把结构化计划（nodes/edges）画成白板：board 为空则新建，有值则追加到已有白板；自动布局、配色并保存。"),inputSchema:{type:"object",properties:{plan:{type:"object",description:f("绘图计划：{ title, caption, preset, layout, nodes: [{id,label,shape,group}], edges: [{from,to,label}] }"),properties:{title:{type:"string"},caption:{type:"string"},preset:{type:"string",description:f("pencil/marker/blueprint 或 data/assets/excali-styles 里的风格包名")},layout:{type:"string",enum:["lr","tb","grid","radial"]},nodes:{type:"array",items:{type:["string","object"]}},edges:{type:"array",items:{type:["string","object","array"]}}},required:["nodes"]},board:{type:"string",description:f("追加到已有白板的标题或路径；省略则新建")},title:{type:"string",description:f("新建白板的文件名；省略用计划标题或「AI 白板」")},append:{type:"boolean",description:f("board 指向已有白板时是否追加，默认 true")},style:{type:"string",description:f("风格包名：内置预设，或 assets/excali-styles 目录里的 json 包；与 preset 同义，优先 style")},preset:{type:"string",description:f("覆盖计划内的风格")},layout:{type:"string",enum:["lr","tb","grid","radial"],description:f("覆盖计划内的布局")}},required:["plan"]},effects:{localRead:!0,localWrite:!0},handler:t=>this.agentRun(()=>this.agentDrawBoard(t))}),this.addAgentCapability({name:"excali_generate_image",title:f("生成图片并插入 Excali 白板"),description:f("调用设置里的 OpenAI 兼容图像 API 生成一张位图，插入已有白板或新建白板；图片不可编辑。需要先在插件设置里填 API 地址和 Key。"),inputSchema:{type:"object",properties:{prompt:{type:"string",description:f("画面描述（主体、风格、构图；上限 4000 字符）")},board:{type:"string",description:f("插入到已有白板的标题或路径；省略则新建")},title:{type:"string",description:f("新白板文件名；省略用「AI 图片」")},append:{type:"boolean",description:f("board 指向已有白板时是否插入到该板，默认 true")},width:{type:"number",minimum:64,maximum:4096,description:f("图像显示宽度；省略按原图尺寸")},height:{type:"number",minimum:64,maximum:4096,description:f("图像显示高度；省略按原图尺寸")},size:{type:"string",description:f("尺寸覆盖（如 1024x1024）；省略用设置里的值")}},required:["prompt"]},effects:{localRead:!0,localWrite:!0},handler:t=>this.agentRun(()=>this.agentGenerateImage(t))})}catch(t){console.warn("[excali-studio] 注册智能体能力失败（思源版本可能不支持）",t)}}openScriptPicker(){if(!this.settings.aiChannels.script){E.showMessage(f("脚本通道已在「AI 通道」面板里关闭"));return}this.scriptPickerDialog||(async()=>{const t=await Mt();if(t.length===0){E.showMessage(f("还没有脚本：首次启用会自动安装内置脚本到 {dir}",{dir:j}),7e3);return}const e=new Set(this.settings.pinnedScripts),i=w=>da[w]??cn,s=w=>`<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${w}"/></svg>`,a=w=>{const m=pt[w.name];return!m||m.length===0?"":`<div class="exs-script-settings" data-settings hidden>${m.map(x=>{const k=this.eaHost().getScriptSetting(w.name,x.key),b=k===void 0?x.default:k,v=K(x.key),A=x.type==="select"?`<select class="b3-select" data-key="${v}">${(x.options??[]).map(S=>`<option value="${K(S.value)}"${String(S.value)===String(b)?" selected":""}>${N(S.label)}</option>`).join("")}</select>`:x.type==="toggle"?`<input class="b3-switch" type="checkbox" data-key="${v}"${b?" checked":""} />`:`<input class="b3-text-field" type="number" data-key="${v}" value="${K(String(b))}"${x.min!==void 0?` min="${x.min}"`:""}${x.max!==void 0?` max="${x.max}"`:""} />`;return`<div class="exs-script-settings__field"><label>${N(x.label)}</label>${A}</div>`}).join("")}<div class="exs-script-settings__tip">${f("保存即生效；脚本运行时弹窗会用它预填，仍可临时改一次。")}</div></div>`},o=`<div class="exs-picker__hint"><b>${f("脚本使用说明")}</b>${f("点一条立即对当前画布执行；先框选画布元素再跑 = 对选中操作（对齐、连线、标注类）；先打开文档页签再跑 = 读文档内容（思维导图、表格类）。行尾按钮可固定到画布右缘侧边栏 / 改脚本设置（也可右键一条固定）。脚本就是 {dir} 下的 Markdown，可直接编辑，文件头加 @excalidraw-onload 则画布打开时自动运行。",{dir:j})}</div>`,r=new Set(this.settings.pinnedActions),h=w=>{const m=r.has(w.id);return`<div class="b3-list-item exs-script-item${m?" exs-script-item--pinned":""}" data-rail-action="${K(w.id)}" title="${K(w.id)}"><div class="exs-script-item__head"><span class="b3-list-item__text"><span class="exs-script-item__icon">${s(w.icon)}</span>${N(f(w.title))}${m?` <span class="exs-script-pin" title="${f("已固定到侧边栏")}"></span>`:""}</span><span class="exs-script-item__actions"><button type="button" class="b3-button b3-button--text${m?" exs-script-item__btn--on":""}" data-act="pin" title="${f(m?"已固定到侧边栏":"固定到侧边栏")}">${s(ln)}</button></span></div><span class="exs-script-desc">${N(f(w.desc))}</span></div>`},d=`<div class="exs-picker__group">${f("画布动作")}</div>${ti.map(h).join("")}`,l=t.map((w,m)=>{const g=pt[w.name]??[],x=e.has(w.name);return`<div class="b3-list-item exs-script-item${x?" exs-script-item--pinned":""}" data-idx="${m}" title="${N(w.name)}"><div class="exs-script-item__head"><span class="b3-list-item__text"><span class="exs-script-item__icon">${s(i(w.name))}</span>${N(w.title)}${w.onload?` <span class="exs-script-badge">${f("打开时自动运行")}</span>`:""}${x?` <span class="exs-script-pin" title="${f("已固定到侧边栏")}"></span>`:""}</span><span class="exs-script-item__actions">${g.length>0?`<button type="button" class="b3-button b3-button--text" data-act="gear" title="${f("脚本设置")}">${s(cn)}</button>`:""}<button type="button" class="b3-button b3-button--text${x?" exs-script-item__btn--on":""}" data-act="pin" title="${f(x?"已固定到侧边栏":"固定到侧边栏")}">${s(ln)}</button></span></div>${w.description?`<span class="exs-script-desc">${N(w.description)}</span>`:`<span class="b3-list-item__meta">${N(w.name)}</span>`}${a(w)}</div>`}).join(""),u=await di(),p=u.length>0?`<div class="exs-picker__outdated"><span>${f("{n} 个内置脚本有新版本",{n:u.length})}${f("旧版内置脚本行为可能和插件不一致，重置会覆盖你在这些脚本里的修改（自建脚本不受影响）。")}</span><button type="button" class="b3-button b3-button--text" data-act="reset">${f("重置为最新版")}</button></div>`:"",c=new E.Dialog({title:f("脚本库"),width:"520px",content:`<div class="exs-picker">${p}${d}${o}<div class="b3-list b3-list--background exs-board-list">${l}</div></div>`,destroyCallback:()=>{this.scriptPickerDialog===c&&(this.scriptPickerDialog=null),window.dispatchEvent(new CustomEvent(Vt,{detail:{pickerOpen:!1}}))}});this.scriptPickerDialog=c,window.dispatchEvent(new CustomEvent(Vt,{detail:{pickerOpen:!0}}));const y=(w,m)=>{w.classList.toggle("exs-script-item--pinned",m);const g=w.querySelector('[data-act="pin"]');g&&(g.classList.toggle("exs-script-item__btn--on",m),g.title=f(m?"已固定到侧边栏":"固定到侧边栏"));const x=w.querySelector(".exs-script-pin");if(m&&!x){const k=document.createElement("span");k.className="exs-script-pin",k.title=f("已固定到侧边栏"),w.querySelector(".b3-list-item__text")?.appendChild(k)}else!m&&x&&x.remove()};c.element.addEventListener("click",w=>{if(w.target?.closest?.('[data-act="reset"]')){(async()=>{const v=await uo();E.showMessage(f("已重置 {n} 个内置脚本",{n:v}),3e3),c.destroy(),this.openScriptPicker()})();return}const m=w.target?.closest?.("[data-rail-action]");if(m){const v=m.dataset.railAction??"";if(!he(v))return;if(w.target?.closest?.('[data-act="pin"]')){const A=this.settings.pinnedActions.includes(v);this.rememberActionPin(v,!A),y(m,!A);return}c.destroy(),this.runRailAction(v);return}const g=w.target?.closest?.(".exs-script-item"),x=g?.dataset?.idx;if(!g||x===void 0)return;const k=t[Number(x)];if(!k)return;const b=w.target?.closest?.("[data-act]");if(b){if(b.dataset.act==="pin"){const v=this.settings.pinnedScripts.includes(k.name);this.rememberScriptPin(k.name,!v),y(g,!v)}else if(b.dataset.act==="gear"){const v=g.querySelector(".exs-script-settings");if(v){const A=v.hasAttribute("hidden");c.element.querySelectorAll(".exs-script-settings").forEach(S=>{S!==v&&S.setAttribute("hidden","")}),c.element.querySelectorAll('[data-act="gear"]').forEach(S=>{S!==b&&S.classList.remove("exs-script-item__btn--on")}),A?v.removeAttribute("hidden"):v.setAttribute("hidden",""),b.classList.toggle("exs-script-item__btn--on",A)}}return}w.target?.closest?.(".exs-script-settings")||(c.destroy(),this.runScriptOnActiveBoard(k,{shift:w.shiftKey,at:{x:w.clientX,y:w.clientY}}))}),c.element.addEventListener("change",w=>{const m=w.target,g=m?.closest?.(".exs-script-settings");if(!g||!m?.dataset?.key)return;const k=g.closest(".exs-script-item")?.dataset?.idx;if(k===void 0)return;const b=t[Number(k)];if(!b)return;const v=m.dataset.key,A=(pt[b.name]??[]).find(M=>M.key===v);if(!A)return;const S=A.type==="number"?Math.max(A.min??0,Math.min(A.max??Number.MAX_SAFE_INTEGER,Number(m.value)||0)):A.type==="toggle"?m.checked:m.value;this.eaHost().setScriptSetting(b.name,v,S),E.showMessage(f("已保存：{name} › {label}",{name:b.title,label:A.label}),3e3)}),c.element.addEventListener("contextmenu",w=>{const m=w.target?.closest?.("[data-rail-action]");if(m){const A=m.dataset.railAction??"";if(!he(A))return;w.preventDefault();const S=this.settings.pinnedActions.includes(A),M=new E.Menu;M.addItem({label:f(S?"从侧边栏取消固定":"固定到侧边栏"),click:()=>{this.rememberActionPin(A,!S),y(m,!S)}}),M.open({x:w.clientX,y:w.clientY});return}const g=w.target?.closest?.(".exs-script-item"),x=g?.dataset?.idx;if(!g||x===void 0)return;const k=t[Number(x)];if(!k)return;w.preventDefault();const b=this.settings.pinnedScripts.includes(k.name),v=new E.Menu;v.addItem({label:f(b?"从侧边栏取消固定":"固定到侧边栏"),click:()=>{this.rememberScriptPin(k.name,!b),y(g,!b)}}),v.open({x:w.clientX,y:w.clientY})})})()}async listPinnedScripts(){if(this.settings.pinnedScripts.length===0)return[];let t=[];try{t=await Mt()}catch{return[]}return this.settings.pinnedScripts.map(e=>t.find(i=>i.name===e)).filter(e=>!!e).map(e=>({name:e.name,title:e.title}))}async runScriptFile(t,e){let i=[];try{i=await Mt()}catch{i=[]}const s=i.find(a=>a.name===t);if(!s){E.showMessage(f("找不到脚本：{name}",{name:t}),7e3,"error");return}await this.runScriptOnActiveBoard(s,e)}rememberScriptPin(t,e){const i=this.settings.pinnedScripts,s=e?i.includes(t)?i:[...i,t]:i.filter(a=>a!==t);s.length===i.length&&s.every((a,o)=>a===i[o])||(this.settings={...this.settings,pinnedScripts:s},this.persist(),window.dispatchEvent(new CustomEvent(on)))}rememberActionPin(t,e){const i=this.settings.pinnedActions,s=e?i.includes(t)?i:[...i,t]:i.filter(a=>a!==t);s.length===i.length&&s.every((a,o)=>a===i[o])||(this.settings={...this.settings,pinnedActions:s},this.persist(),window.dispatchEvent(new CustomEvent(on)))}setAiChannel(t,e){this.settings.aiChannels[t]!==e&&(this.settings={...this.settings,aiChannels:{...this.settings.aiChannels,[t]:e}},this.persist(),t==="agent"&&E.showMessage(f(e?"内置智能体通道已开启：重载思源后注册生效":"内置智能体通道已关闭：重载思源后彻底摘除"),6e3))}async runRailAction(t){if(t===Vn){const s=this.activeActions();if(!s){E.showMessage(f("先打开一块白板，再改外框颜色"));return}s.openOutlinePalette();return}if(t===Qn){const s=this.activeActions();if(!s){E.showMessage(f("先打开一块白板，再转换图片"));return}s.openImageToMaterial();return}if(t!==ye)return;const e=this.activeActions();if(!e){E.showMessage(f("先打开一块白板，再往里插卡片"));return}const i=await this.pickBoardRef();i&&e.insertBoardCard(i,T(i).replace(/\.svg$/i,""))}rememberScriptRail(t,e){this.settings[t]!==e&&(this.settings={...this.settings,[t]:e},this.persist(),window.dispatchEvent(new CustomEvent(Vt,{detail:{[t]:e}})))}rememberHighlighter(t){const e=Pt(t),i=this.settings.highlighter;i.color===e.color&&i.width===e.width&&i.opacity===e.opacity||(this.settings={...this.settings,highlighter:e},this.persist(),window.dispatchEvent(new CustomEvent(ea,{detail:e})))}async runScriptOnActiveBoard(t,e){if(!this.settings.aiChannels.script){E.showMessage(f("脚本通道已在「AI 通道」面板里关闭"));return}const s=this.activeActions()?.getEaHandle()??null;if(!s){E.showMessage(f("没有可运行脚本的白板：请先打开一张"));return}let a;try{a=await pe(t.path)}catch(h){E.showMessage(f("读取脚本失败：{msg}",{msg:h instanceof Error?h.message:String(h)}),7e3,"error");return}const o=xn(s,this.eaHost(),t.name,e),r=await mn(a.code,o,o.utils);r.logs.length>0&&console.log(`[excali-studio][脚本] ${t.title}
${r.logs.join(`
`)}`),r.ok?E.showMessage(f("脚本「{title}」运行成功（{ms}ms）",{title:t.title,ms:r.durationMs})):E.showMessage(f("脚本「{title}」运行失败：{msg}",{title:t.title,msg:(r.error||"").split(`
`)[0]}),1e4,"error")}async runOnloadScripts(t){let e=[];try{e=(await Mt()).filter(i=>i.onload)}catch{return}for(const i of e){const a=this.boardActions.get(t)?.getEaHandle()??null;if(a)try{const o=await pe(i.path),r=xn(a,this.eaHost(),i.name),h=await mn(o.code,r,r.utils);h.logs.length>0&&console.log(`[excali-studio][onload 脚本] ${i.title}
${h.logs.join(`
`)}`),h.ok||console.warn(`[excali-studio][onload 脚本失败] ${i.title}: ${(h.error||"").split(`
`)[0]}`)}catch(o){console.warn("[excali-studio][onload 脚本异常]",i.title,o)}}}activeActions(){return this.activeCustom?this.boardActions.get(this.activeCustom)??null:null}registerDock(){const t=this,e={openNew:()=>void this.openNew(),deleteActiveBoard:()=>t.deleteActiveBoard(),getBoardFiles:()=>{const i=new Set;for(const s of t.tabs.values())typeof s.data.dataPath=="string"&&i.add(s.data.dataPath);return{files:t.boardFiles,opened:i}},refreshBoardLib:()=>void t.refreshBoardLib(),openBoardFile:i=>void t.openStudioTab(i.dataPath,i.docId||void 0),openDocOf:i=>{E.openTab({app:t.app,doc:{id:i}}).catch(s=>{E.showMessage(f("打开文档失败：{msg}",{msg:s instanceof Error?s.message:String(s)}),7e3)})},renameBoardFile:i=>void t.renameFromDock(i),deleteBoardFile:i=>void t.deleteBoardFile(i),openFileMenu:(i,s,a)=>t.openFileMenu(i,s,a),hasActiveBoard:()=>t.activeCustom!==null&&t.tabs.has(t.activeCustom),onRefresh:i=>{this.dockRefresh=i}};this.addDock({id:this.name+"-dock",type:"excali_studio_dock",config:{position:"LeftBottom",size:{width:300,height:0},icon:q,title:f("Excali 白板")},data:{name:this.name},init:i=>{const s=ao(e),a=i.element;a.innerHTML="",a.appendChild(s.element),this.dockRefresh=s.refresh,s.refresh()},destroy:()=>{this.dockRefresh=null}})}openHelp(){const e=[["⌘⌥E",f("新建白板")],["⌘S",f("保存（已有文件静默覆盖）")],["⌘⇧E",f("导出图片…")],[f("空格 + 拖动"),f("平移画布")],[f("滚轮"),f("缩放画布")],[f("画布右键菜单"),f("只读 / 禅模式 / 网格 / 统计")]].map(([i,s])=>`<div class="exs-help__row"><span class="exs-help__key">${N(i)}</span><span>${N(s)}</span></div>`).join("");new E.Dialog({title:f("帮助"),width:"420px",content:`<div class="exs-help">${e}</div>`,destroyCallback:()=>{}})}async openStudioTab(t,e){const i=t?_(t):null;if(i){const o=[...this.tabs.values()].find(r=>r.data.dataPath===i);if(o){o.tab.parent.switchTab(o.tab.headElement);return}}const s=new Set(this.tabs.values());await E.openTab({app:this.app,openNewTab:!0,custom:{id:this.name+dn,icon:q,title:i?T(i):f("未命名白板"),data:{dataPath:i,docId:e}}});const a=[...this.tabs.values()].find(o=>!s.has(o));a&&a.tab.parent.switchTab(a.tab.headElement)}async loadScene(t){if(!t)return null;await this.ready;const e=await B(t),{decodeSvgScene:i}=await this.lazyMod(),s=await i(e,a=>this.hydrateSceneFiles(a));return this.rememberRecent(t),s}async hydrateSceneFiles(t){const e={};for(const[i,s]of Object.entries(t)){const a=s??{};if(typeof a.dataURL=="string"&&a.dataURL!==""){e[i]=s;continue}if(typeof a.path!="string"||a.path===""){e[i]=s;continue}try{const o=await wa(a.path),r=typeof a.mimeType=="string"&&a.mimeType!==""?a.mimeType:"image/png";e[i]={...a,dataURL:Ea(o,r)}}catch(o){console.warn("[excali-studio] 白板图片读回失败（该图会显示为空框）",a.path,o),e[i]=s}}return e}async saveBoardMedia(t,e){const i=ka(t);if(!i)throw new Error(f("无法解析图片数据"));const s=await va(i.bytes,i.mime||e),a=`${xa}/${s}`;return await ya(a,i.bytes,i.mime||e),a}openBoardDocLink(t){const e=ja(t);if(e){this.openLinkedBoard(e);return}const i=Pa(t);if(!i){E.showMessage(f("无法识别的文档链接：{link}",{link:t}),5e3,"error");return}this.openDocOf(i)}async openLinkedBoard(t){if(!await X(t)){E.showMessage(f("这块白板已经不在了：{path}",{path:P(t)}),5e3,"error");return}await this.openExisting(t)}async restoreFromBackup(t){const e=_(t);for(const i of si(e))try{const s=await B(i);if(!Jn(s))continue;return await tt(e,s),ne(e),!0}catch{}return!1}buildTopMenu(t){t.addItem({icon:"iconAdd",label:f("新建白板"),click:()=>void this.openNew()}),t.addSeparator(),this.recent.length===0?t.addItem({type:"readonly",label:f("还没有打开或保存过白板")}):(this.recent.slice(0,Gr).forEach(e=>{const i=t.addItem({label:T(e),click:()=>void this.openExisting(e)});i instanceof HTMLElement&&i.setAttribute("title",e)}),t.addItem({label:f("清空最近记录"),click:()=>this.clearRecent()})),t.addSeparator(),t.addItem({icon:"iconOpen",label:f("按路径打开…"),click:()=>this.promptOpenPath()}),t.addItem({icon:"iconFolder",label:f("打开白板…"),click:()=>void this.openBoardPicker()}),t.addItem({icon:"iconSettings",label:f("设置"),click:()=>this.openSetting()})}registerBlockIconMenu(){this.eventBus.on("click-blockicon",({detail:t})=>{const e=to(t.blockElements);e&&t.menu.addItem({icon:q,label:f("用 Excali 白板打开"),click:()=>void this.openExisting(e)})})}async refreshBoardLib(){if(this.libLoading)return;this.libLoading=!0;let t=[];try{await this.ready;try{t=(await gn()).map(Ia),this.boardDocs=t,this.boardSvgByDocId=new Map(t.map(i=>[i.docId,i.svg]))}catch(i){t=this.boardDocs,console.warn("[excali-studio] 白板文档查询失败（沿用上次绑定）",i)}let e=null;try{e=await ot(this.settings.saveDir)}catch(i){console.warn("[excali-studio] 白板库读保存目录失败",i)}e&&(this.boardFiles=Ma(e,t))}finally{this.libLoading=!1}this.dockRefresh?.()}rememberBoardDoc(t,e,i){this.boardSvgByDocId.set(t,i);const s={docId:t,title:e||f("无标题"),hpath:"",svg:i,updated:Date.now(),refs:0};this.boardDocs=[s,...this.boardDocs.filter(o=>o.docId!==t)];const a=_(i);this.boardFiles=this.boardFiles.map(o=>o.dataPath===a?{...o,docId:t,docTitle:e||f("无标题")}:o)}async adoptBoardFile(t){if(t.docId)return null;const e=await qa()??await Va();if(!e)return E.showMessage(f("找不到笔记本，无法建档"),7e3,"error"),null;const i=t.name.replace(/\.svg$/i,"")||t.name;try{const s=await Ya(e,Ta(this.settings.boardDir,i),""),a=P(t.dataPath);await Za(s,a,i),await ee(s,{"custom-excali-svg":a}),this.rememberBoardDoc(s,i,a);const o=[...this.tabs.values()].find(r=>r.data.dataPath===t.dataPath);return o&&!o.data.docId&&(o.data.docId=s),E.showMessage(f("已建档《{title}》",{title:i}),5e3),this.dockRefresh?.(),s}catch(s){return E.showMessage(f("建档失败：{msg}",{msg:s instanceof Error?s.message:String(s)}),1e4,"error"),null}}async autoOpenBoardForDoc(t){if(!this.settings.autoOpenBoard||this.autoOpenedDocs.has(t))return;this.autoOpenedDocs.add(t);let e=this.boardSvgByDocId.get(t);if(e===void 0){try{e=(await Ja(t))["custom-excali-svg"]||""}catch{e=""}this.boardSvgByDocId.set(t,e)}e&&await this.openStudioTab(e,t)}registerBoardDocEvents(){this.eventBus.on("switch-protyle",({detail:t})=>{const e=t?.protyle?.block?.rootID;typeof e=="string"&&e!==""&&this.autoOpenBoardForDoc(e)}),this.eventBus.on("open-menu-doctree",({detail:t})=>{const e=t.elements?.[0];if(!e||e.getAttribute("data-type")!=="navigation-file")return;const i=e.getAttribute("data-node-id")||"",s=i?this.boardSvgByDocId.get(i):void 0;s&&t.menu.addItem({icon:q,label:f("在画板中打开"),click:()=>void this.openStudioTab(s,i)})}),this.eventBus.on("open-menu-filetab",t=>{try{const e=t.detail,i=e?.protyle?.protyle?.block?.rootID||e?.protyle?.block?.rootID||"";if(!i)return;const s=this.boardSvgByDocId.get(i);if(!s)return;e?.menu?.addItem({icon:q,label:f("在画板中打开"),click:()=>void this.openStudioTab(s,i)})}catch(e){console.warn("[excali-studio] 文件页签菜单注入失败",e)}})}copyText(t,e){const i=()=>E.showMessage(e,3e3);try{navigator.clipboard?.writeText?navigator.clipboard.writeText(t).then(i,()=>this.fallbackCopy(t,i)):this.fallbackCopy(t,i)}catch{this.fallbackCopy(t,i)}}fallbackCopy(t,e){try{const i=document.createElement("textarea");i.value=t,i.style.position="fixed",i.style.opacity="0",document.body.appendChild(i),i.select();const s=document.execCommand("copy");i.remove(),s?e():E.showMessage(f("复制失败：{msg}",{msg:"execCommand"}),7e3,"error")}catch(i){E.showMessage(f("复制失败：{msg}",{msg:i instanceof Error?i.message:String(i)}),7e3,"error")}}openFileMenu(t,e,i){const s=new E.Menu("excali-file-menu");s.addItem({icon:"iconEdit",label:f("在画板中打开"),click:()=>void this.openBoardFile(t)}),s.addItem({icon:"iconRight",label:f("插入到当前画布"),click:()=>this.insertBoardCardToActive(t)}),t.docId?(s.addItem({icon:"iconFile",label:f("打开存档文档"),click:()=>this.openDocOf(t.docId)}),s.addItem({icon:"iconCopy",label:f("复制嵌入引用"),click:()=>this.copyText(pn(t.docId),f("已复制嵌入引用"))}),s.addItem({icon:"iconCopy",label:f("复制行内引用"),click:()=>this.copyText(Da(t.docId,t.docTitle),f("已复制行内引用"))})):s.addItem({icon:"iconAdd",label:f("建档"),click:()=>void this.adoptBoardFile(t)}),s.addItem({icon:"iconRename",label:f("重命名"),click:()=>void this.renameFromDock(t)}),s.addSeparator(),s.addItem({icon:"iconTrash",label:f("删除…"),click:()=>void this.deleteBoardFile(t)}),s.open({x:e,y:i})}openBoardFile(t){return this.openStudioTab(t.dataPath,t.docId||void 0)}insertBoardCardToActive(t){const e=this.activeActions();if(!e){E.showMessage(f("先打开一块白板，再往里插卡片"));return}e.insertBoardCard(P(t.dataPath),fe(t))}openDocOf(t){E.openTab({app:this.app,doc:{id:t}}).catch(e=>{E.showMessage(f("打开文档失败：{msg}",{msg:e instanceof Error?e.message:String(e)}),7e3)})}async deleteBoardFile(t){const e=La(t),i=e.doc?`，以及存档文档《${e.doc.title}》`:"";E.confirm(f("删除白板"),f("将删除白板文件 {name} 及其备份（如存在）{doc}。删除不可恢复；白板开着时，画布上未保存的改动也会一并丢弃。",{name:t.name,doc:i}),()=>{(async()=>{try{for(const s of[...this.tabs.values()])s.data.dataPath===t.dataPath&&s.closeForDelete();await rt(e.svgPath);for(const s of e.bakPaths)try{await rt(s)}catch{}if(e.doc)try{await Ka(e.doc.id)}catch(s){console.warn("[excali-studio] 删除存档文档失败（文件已删）",e.doc.id,s)}this.boardFiles=this.boardFiles.filter(s=>s.dataPath!==t.dataPath),this.boardDocs=this.boardDocs.filter(s=>s.docId!==e.doc?.id),e.doc&&this.boardSvgByDocId.delete(e.doc.id),this.recent=this.recent.filter(s=>s!==t.dataPath),this.persist(),this.dockRefresh?.(),E.showMessage(f("已删除《{name}》",{name:t.name}),5e3)}catch(s){E.showMessage(f("删除失败：{msg}",{msg:s instanceof Error?s.message:String(s)}),1e4,"error")}})()})}deleteActiveBoard(){const t=this.activeCustom?this.tabs.get(this.activeCustom)?.data.dataPath:null;if(!t){E.showMessage(f("没有可删除的白板：当前没有打开已保存的白板"),7e3);return}const e=this.boardFiles.find(i=>i.dataPath===t);if(!e){this.refreshBoardLib().then(()=>{const i=this.boardFiles.find(s=>s.dataPath===t);i?this.deleteBoardFile(i):E.showMessage(f("删除失败：{msg}",{msg:t}),7e3,"error")});return}this.deleteBoardFile(e)}async renameFromDock(t){const e=await this.promptFileName(t.name,f("重命名白板"));if(e)try{const i=await this.renameBoard(t.dataPath,e);this.applyRenameToSession(t.dataPath,i),E.showMessage(f("已重命名为 {name}",{name:T(i)}),5e3)}catch(i){E.showMessage(f("重命名失败：{msg}",{msg:i instanceof Error?i.message:String(i)}),7e3,"error")}}applyRenameToSession(t,e){for(const i of this.tabs.values())i.data.dataPath===t&&(i.data.dataPath=e,i.tab.updateTitle(T(e)))}copyBoardRefFor(t){const e=this.tabs.get(t);if(!e)return;const i=e.data.dataPath,s=e.data.docId??(i?this.boardDocs.find(a=>_(a.svg)===i)?.docId:void 0);if(!s){E.showMessage(f("还没建档，复制不了引用：在白板行右键「建档」"),7e3);return}this.copyText(pn(s),f("已复制嵌入引用"))}async runCheckup(){if(!this.checkupRunning){this.checkupRunning=!0;try{await this.refreshBoardLib();const t=[];for(const i of this.boardDocs)await X(_(i.svg))||t.push(i);if(t.length===0){E.showMessage(f("体检完成：没有断链的白板文档"),5e3);return}const e=i=>i.length===0?`<p class="exs-check__none">${f("没有")}</p>`:i.map(s=>`<div class="exs-check__row" title="${K(s.tip)}"><span class="exs-check__name">${N(s.name)}</span><code class="exs-check__path">${N(s.sub)}</code></div>`).join("");new E.Dialog({title:f("白板体检"),width:"560px",content:`<div class="exs-check">
          <div class="exs-check__group">${f("断链文档：{n}",{n:t.length})}</div>
          ${e(t.map(i=>({name:i.title,sub:T(i.svg),tip:_(i.svg)})))}
          <p class="exs-check__hint">${f("断链文档需手动重新保存或删除；未建档的白板文件是正常状态，不用处理")}</p>
        </div>`})}finally{this.checkupRunning=!1}}}promptOpenPath(){E.openInputDialog({title:f("按路径打开…"),label:f("工作空间内的 SVG 路径"),placeholder:"assets/excali-20261015-120000.svg",value:"",confirmText:f("打开"),onConfirm:(t,e)=>{const i=t.trim();i&&(this.openExisting(_(i)),e.destroy())}})}clearSlashHint(t){const e=t?.protyle?.toolbar?.range;!e||!e.toString().startsWith("/")||(e.deleteContents(),t.protyle?.wysiwyg?.element?.dispatchEvent(new InputEvent("input",{bubbles:!0,inputType:"deleteContentBackward"})))}async openNew(){const t=await this.promptFileName(f("未命名白板"),f("新建白板"));if(t)try{const{path:e,docId:i}=await this.createBoardFile(t);await this.openStudioTab(e,i)}catch(e){E.showMessage(f("创建白板失败：{msg}",{msg:e instanceof Error?e.message:String(e)}),7e3,"error")}}openExisting(t){return this.openStudioTab(t)}async createBoardFile(t){const e=await te(this.settings.saveDir,Qt(t,f("未命名白板"))),i=this.settings.autoCreateDoc?await this.adoptBoardFile({dataPath:e,name:T(e),docId:"",docTitle:"",updated:Date.now()}):null,{sceneToSvgText:s}=await this.lazyMod();return await tt(e,await s({elements:[],appState:{},files:{}})),ne(e),this.rememberRecent(e),this.rememberBoardFile(e,i??void 0,T(e).replace(/\.svg$/i,"")),this.refreshBoardLib(),{path:e,docId:i??void 0}}async saveSvg(t,e){if(!e)throw new Error("saveSvg 只接受已有文件（新建走 createBoardFile）");const i=_(e);let s=null;try{s=await B(i)}catch{}if(s===t)return{path:e};this.settings.keepBackup&&await ba(i,s??void 0);const a=await tt(i,t);return ne(a),this.rememberRecent(a),this.rememberBoardFile(a),this.refreshBoardLib(),{path:a}}rememberBoardFile(t,e,i){const s=_(t);this.boardFiles.some(a=>a.dataPath===s)||(this.boardFiles=[{dataPath:s,name:T(s),docId:e??"",docTitle:i??"",updated:Date.now()},...this.boardFiles])}async renameBoard(t,e){const i=_(t),s=await te(this.settings.saveDir,Qt(e),i);if(_(s)===i)return i;const a=await fn(i,s);try{await un(P(i),P(a))}catch(r){console.warn("[excali-studio] 重命名后更新正文资源引用失败",r)}const o=this.boardDocs.filter(r=>_(r.svg)===i);if(o.length>0){const r=P(a);for(const h of o)try{await ee(h.docId,{"custom-excali-svg":r})}catch(d){console.warn("[excali-studio] 重命名后同步白板绑定失败",h.docId,d)}this.boardDocs=this.boardDocs.map(h=>o.some(d=>d.docId===h.docId)?{...h,svg:P(a)}:h),this.boardSvgByDocId=new Map(this.boardDocs.map(h=>[h.docId,h.svg]))}return this.refreshBoardLib(),this.recent=[a,...this.recent.filter(r=>r!==i&&r!==a)],this.persist(),a}libDirRel(){return J(this.settings.saveDir,"excali-libraries")}localLibRel(){return J(this.libDirRel(),Ks)}libraryImportUrl(){const t=encodeURIComponent(this.libDirRel());return`${location.origin}/plugins/${Tt}/library-import.html?dir=${t}`}async migrateStencilLibrary(){if(!this.settings.stencilMigrated)try{const t=this.localLibRel();if(!await X(t)){let e=[];try{e=sn(await B(_(J(this.settings.saveDir,"excali-library.json"))))}catch{e=[]}e.length>0&&(await ct(t,an(e)),E.showMessage(f("组件库已迁移到 {dir}",{dir:"excali-libraries"}),3500))}}catch(t){console.warn("[excali-studio] 组件库迁移失败（旧文件保留，下次不再自动尝试）",t)}finally{this.settings.stencilMigrated=!0,this.persist()}}async loadLibraryItems(){await this.migrateStencilLibrary();const t=this.localLibRel();let e=[];try{e=await hn(this.libDirRel(),/\.excalidrawlib$/i)}catch{e=[]}e.sort((s,a)=>s===t?-1:a===t?1:s.localeCompare(a));const i=[];for(const s of e)try{i.push({path:s,items:sn(await B(s))})}catch(a){console.warn("[excali-studio] 模板库文件读取失败，已跳过",s,a)}return this.libCache=Qs(i),this.libCache.items}async saveLibraryItems(t){const e=this.libCache??{items:[],sourceOf:new Map,byPath:new Map},i=ta(e,t,this.localLibRel());for(const{path:s,items:a}of i)try{if(a.length===0){await X(s)&&await rt(s);continue}await ct(s,an(a))}catch(o){console.error("[excali-studio] 模板库文件写入失败",s,o),E.showMessage(f("模板库保存失败：{path}",{path:T(s)}),5e3,"error")}this.libCache=null,await this.loadLibraryItems()}promptFileName(t,e){return new Promise(i=>{let s=!1;const a=d=>{s||(s=!0,o.destroy(),i(d))},o=new E.Dialog({title:e,width:"420px",content:`<div class="exs-picker">
  <input class="b3-text-field fn__block exs-name-input" value="${K(t)}" />
  <div class="exs-name-tip">${f("位置")}：${N(this.settings.saveDir)}</div>
  <div class="fn__flex" style="gap:8px;margin-top:12px;justify-content:flex-end">
    <button class="b3-button b3-button--outline exs-name-cancel" type="button">${f("取消")}</button>
    <button class="b3-button b3-button--text exs-name-ok" type="button">${f("确定")}</button>
  </div>
</div>`,destroyCallback:()=>a(null)}),r=o.element.querySelector(".exs-name-input");o.element.querySelector(".exs-name-cancel").addEventListener("click",()=>a(null));const h=()=>a(Qt(r.value||t));o.element.querySelector(".exs-name-ok").addEventListener("click",h),r.addEventListener("keydown",d=>{d.key==="Enter"?(d.preventDefault(),h()):d.key==="Escape"&&(d.preventDefault(),a(null)),d.stopPropagation()}),setTimeout(()=>{r.focus(),r.select()},50)})}async pickBoardRef(){let t=[];try{t=await ot(this.settings.saveDir)}catch(i){return E.showMessage(f("读取目录失败：{msg}",{msg:i instanceof Error?i.message:String(i)}),7e3,"error"),null}if(t.length===0)return E.showMessage(f("目录里还没有白板文件")),null;const e=new Set([...this.tabs.values()].map(i=>i.data.dataPath).filter(i=>typeof i=="string"));return await io(t,e)}async openBoardPicker(){const t=await this.pickBoardRef();t&&this.openExisting(t)}rememberRecent(t){const e=_(t);this.recent=[e,...this.recent.filter(i=>i!==e)].slice(0,Xr),this.persist()}clearRecent(){this.recent=[],this.persist()}setupSetting(){let t=null,e=null,i=null,s=null,a=null,o=null,r=null,h=null,d=null,l=null,u=null,p=null;this.setting=new E.Setting({confirmCallback:()=>{this.settings={...this.settings,saveDir:t?.value??this.settings.saveDir,accentStroke:e?.checked??this.settings.accentStroke,showWelcome:i?.checked??this.settings.showWelcome,keepBackup:s?.checked??this.settings.keepBackup,gridModeEnabled:a?.checked??this.settings.gridModeEnabled,boardDir:o?.value??this.settings.boardDir,autoOpenBoard:r?.checked??this.settings.autoOpenBoard,autoCreateDoc:h?.checked??this.settings.autoCreateDoc,imageBaseUrl:d?.value??this.settings.imageBaseUrl,imageModel:l?.value??this.settings.imageModel,imageApiKey:u?.value??this.settings.imageApiKey,imageSize:p?.value??this.settings.imageSize},this.settings=st(this.settings),this.persist()}}),this.setting.addItem({title:f("保存目录"),description:f("新白板保存的位置（工作空间相对路径，默认 assets/excali）。白板库只列这个目录里的 .svg；assets 根目录留给普通图片附件。"),createActionElement:()=>{const c=document.createElement("input");return c.type="text",c.className="b3-text-field fn__block",c.value=this.settings.saveDir,c.placeholder=L.saveDir,c.addEventListener("change",()=>{this.settings={...this.settings,saveDir:c.value},this.persist()}),t=c,c}}),this.setting.addItem({title:f("图像生成 API 地址"),description:f("OpenAI 兼容的 images API 地址（如 https://api.openai.com/v1）；留空 = 关闭生图。"),createActionElement:()=>{const c=document.createElement("input");return c.type="text",c.className="b3-text-field fn__block",c.value=this.settings.imageBaseUrl,c.placeholder="https://api.openai.com/v1",c.addEventListener("change",()=>{this.settings=st({...this.settings,imageBaseUrl:c.value}),this.persist()}),d=c,c}}),this.setting.addItem({title:f("图像生成模型"),description:f("模型名（如 gpt-image-1、dall-e-3）；按服务商支持的型号填写。"),createActionElement:()=>{const c=document.createElement("input");return c.type="text",c.className="b3-text-field fn__block",c.value=this.settings.imageModel,c.placeholder=L.imageModel,c.addEventListener("change",()=>{this.settings=st({...this.settings,imageModel:c.value}),this.persist()}),l=c,c}}),this.setting.addItem({title:f("图像生成 API Key"),description:f("只保存在插件数据里，不写日志、不写白板文件。"),createActionElement:()=>{const c=document.createElement("input");return c.type="password",c.className="b3-text-field fn__block",c.autocomplete="off",c.spellcheck=!1,c.value=this.settings.imageApiKey,c.placeholder="sk-...",c.addEventListener("change",()=>{this.settings=st({...this.settings,imageApiKey:c.value}),this.persist()}),u=c,c}}),this.setting.addItem({title:f("图像生成尺寸"),description:f("传给 images API 的 size（如 1024x1024）；不同模型支持的尺寸不同，按服务商文档填写。"),createActionElement:()=>{const c=document.createElement("input");return c.type="text",c.className="b3-text-field fn__block",c.value=this.settings.imageSize,c.placeholder=L.imageSize,c.addEventListener("change",()=>{this.settings=st({...this.settings,imageSize:c.value}),this.persist()}),p=c,c}}),this.setting.addItem({title:f("画笔颜色跟随思源强调色"),description:f("新画板把第一笔的默认颜色设成当前主题强调色；只影响默认值，不覆盖已有图。"),createActionElement:()=>{const c=document.createElement("input");return c.type="checkbox",c.className="b3-switch fn__flex-center",c.checked=this.settings.accentStroke,c.addEventListener("change",()=>{this.settings={...this.settings,accentStroke:c.checked},this.persist()}),e=c,c}}),this.setting.addItem({title:f("空画板显示引导画面"),description:f("空白板中央显示手绘纸飞机和上手提示；落第一笔就消失，只影响新建的白板。"),createActionElement:()=>{const c=document.createElement("input");return c.type="checkbox",c.className="b3-switch fn__flex-center",c.checked=this.settings.showWelcome,c.addEventListener("change",()=>{this.settings={...this.settings,showWelcome:c.checked},this.persist()}),i=c,c}}),this.setting.addItem({title:f("覆盖前留备份"),description:f("每次覆盖保存前把上一版滚进备份链：<文件名>.svg.bak.svg（最新）、.bak2、.bak3，最多三份；空画板或坏内容不入链、不进白板库列表。"),createActionElement:()=>{const c=document.createElement("input");return c.type="checkbox",c.className="b3-switch fn__flex-center",c.checked=this.settings.keepBackup,c.addEventListener("change",()=>{this.settings={...this.settings,keepBackup:c.checked},this.persist()}),s=c,c}}),this.setting.addItem({title:f("默认显示网格"),description:f("在任意白板里切换网格都会记住这个值，之后所有白板（含还没保存过的空白板）打开时都按它显示。改这里只影响之后打开的页签。"),createActionElement:()=>{const c=document.createElement("input");return c.type="checkbox",c.className="b3-switch fn__flex-center",c.checked=this.settings.gridModeEnabled,c.addEventListener("change",()=>{this.settings={...this.settings,gridModeEnabled:c.checked},this.persist()}),a=c,c}}),this.setting.addItem({title:f("白板文档目录"),description:f("白板建档的落点（当前笔记本内的路径，默认 /Excali 白板）。只影响「建档」动作，SVG 工程文件不受它影响，仍存上面的保存目录。"),createActionElement:()=>{const c=document.createElement("input");return c.type="text",c.className="b3-text-field fn__block",c.value=this.settings.boardDir,c.placeholder=L.boardDir,c.addEventListener("change",()=>{this.settings={...this.settings,boardDir:c.value},this.persist()}),o=c,c}}),this.setting.addItem({title:f("新建时自动建档"),description:f("关：新建只落 SVG 工程文件，白板库按文件列，文档树保持干净。开：新建白板时顺带建一篇文档绑定（可反链、可搜索、可文档树管理）。关着也能补建——Dock 白板行右键「建档」。"),createActionElement:()=>{const c=document.createElement("input");return c.type="checkbox",c.className="b3-switch fn__flex-center",c.checked=this.settings.autoCreateDoc,c.addEventListener("change",()=>{this.settings={...this.settings,autoCreateDoc:c.checked},this.persist()}),h=c,c}}),this.setting.addItem({title:f("打开白板文档时自动进入画板"),description:f("切到绑定了白板的文档会自动打开对应画板页签；每篇文档每次会话只自动开一次，已开着则直接聚焦。"),createActionElement:()=>{const c=document.createElement("input");return c.type="checkbox",c.className="b3-switch fn__flex-center",c.checked=this.settings.autoOpenBoard,c.addEventListener("change",()=>{this.settings={...this.settings,autoOpenBoard:c.checked},this.persist()}),r=c,c}}),this.setting.addItem({title:f("白板体检"),description:f("检查存档文档绑定的工程文件是否还存在（断链）。白板文件本身即白板，未建档是正常状态，不用处理。"),createActionElement:()=>{const c=document.createElement("button");return c.type="button",c.className="b3-button b3-button--outline fn__flex-center",c.textContent=f("开始体检"),c.addEventListener("click",()=>void this.runCheckup()),c}})}async loadState(){const t=await this.loadData(Mn),e=t&&typeof t=="object"?t:{};this.settings=st(e.settings),this.recent=Array.isArray(e.recent)?e.recent.filter(i=>typeof i=="string"&&i!==""):[],this.dirMigrated=e.dirMigrated===!0,this.legacyBoards=Array.isArray(e.boards)?e.boards.filter(i=>typeof i=="string"):[]}rememberGrid(t){this.settings.gridModeEnabled!==t&&(this.settings={...this.settings,gridModeEnabled:t},this.persist())}persist(){this.saveData(Mn,{settings:this.settings,recent:this.recent,dirMigrated:this.dirMigrated}).catch(t=>console.error("[excali-studio] 保存设置失败",t))}}module.exports=Zr;
