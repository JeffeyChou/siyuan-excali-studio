"use strict";const $=require("siyuan");let ai={};function ns(n){ai=n&&typeof n=="object"?n:{}}function p(n,t){const e=ai[n],i=typeof e=="string"?e:n;return t?i.replace(/\{(\w+)\}/g,(o,s)=>s in t?String(t[s]):o):i}const Zt="siyuan-excali-studio";function is(){return new URL(`plugins/${Zt}/`,`${location.origin}/`).href}function ss(){const n=is();return window.EXCALIDRAW_ASSET_PATH=n,n}function os(...n){return n.map(e=>String(e??"").trim()).filter(e=>e!=="").join("/").replace(/\/{2,}/g,"/")}function as(){try{const t=window.siyuan?.config?.system?.dataDir;return typeof t=="string"?t.trim():""}catch{return""}}const rt="iconExcaliStudio",rs=`<symbol id="${rt}" viewBox="0 0 1024 1024"><g fill="none" stroke="currentColor" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"><rect x="128" y="168" width="768" height="588" rx="56"/><path d="M272 616c72-152 148 92 224-56 44-88 96-36 152-72"/></g></symbol>`;function cs(n){return`<div class="b3-list-item__first"><svg class="b3-list-item__graphic"><use xlink:href="#${rt}"></use></svg><span class="b3-list-item__text">${n}</span></div>`}function Et(n){let t=n.length;for(;--t>=0;)n[t]=0}const ls=3,ds=258,ri=29,hs=256,fs=hs+1+ri,ci=30,us=512,ps=new Array((fs+2)*2);Et(ps);const gs=new Array(ci*2);Et(gs);const ms=new Array(us);Et(ms);const ys=new Array(ds-ls+1);Et(ys);const bs=new Array(ri);Et(bs);const xs=new Array(ci);Et(xs);const ws=(n,t,e,i)=>{let o=n&65535|0,s=n>>>16&65535|0,a=0;for(;e!==0;){a=e>2e3?2e3:e,e-=a;do o=o+t[i++]|0,s=s+o|0;while(--a);o%=65521,s%=65521}return o|s<<16|0};var Ie=ws;const ks=()=>{let n,t=[];for(var e=0;e<256;e++){n=e;for(var i=0;i<8;i++)n=n&1?3988292384^n>>>1:n>>>1;t[e]=n}return t},Ss=new Uint32Array(ks()),vs=(n,t,e,i)=>{const o=Ss,s=i+e;n^=-1;for(let a=i;a<s;a++)n=n>>>8^o[(n^t[a])&255];return n^-1};var V=vs,Ce={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},li={Z_NO_FLUSH:0,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_DEFLATED:8};const Es=(n,t)=>Object.prototype.hasOwnProperty.call(n,t);var _s=function(n){const t=Array.prototype.slice.call(arguments,1);for(;t.length;){const e=t.shift();if(e){if(typeof e!="object")throw new TypeError(e+"must be non-object");for(const i in e)Es(e,i)&&(n[i]=e[i])}}return n},As=n=>{let t=0;for(let i=0,o=n.length;i<o;i++)t+=n[i].length;const e=new Uint8Array(t);for(let i=0,o=0,s=n.length;i<s;i++){let a=n[i];e.set(a,o),o+=a.length}return e},di={assign:_s,flattenChunks:As};let hi=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch{hi=!1}const Rt=new Uint8Array(256);for(let n=0;n<256;n++)Rt[n]=n>=252?6:n>=248?5:n>=240?4:n>=224?3:n>=192?2:1;Rt[254]=Rt[254]=1;var Ms=n=>{let t,e,i,o,s,a=n.length,r=0;for(o=0;o<a;o++)e=n.charCodeAt(o),(e&64512)===55296&&o+1<a&&(i=n.charCodeAt(o+1),(i&64512)===56320&&(e=65536+(e-55296<<10)+(i-56320),o++)),r+=e<128?1:e<2048?2:e<65536?3:4;for(t=new Uint8Array(r),s=0,o=0;s<r;o++)e=n.charCodeAt(o),(e&64512)===55296&&o+1<a&&(i=n.charCodeAt(o+1),(i&64512)===56320&&(e=65536+(e-55296<<10)+(i-56320),o++)),e<128?t[s++]=e:e<2048?(t[s++]=192|e>>>6,t[s++]=128|e&63):e<65536?(t[s++]=224|e>>>12,t[s++]=128|e>>>6&63,t[s++]=128|e&63):(t[s++]=240|e>>>18,t[s++]=128|e>>>12&63,t[s++]=128|e>>>6&63,t[s++]=128|e&63);return t};const $s=(n,t)=>{if(t<65534&&n.subarray&&hi)return String.fromCharCode.apply(null,n.length===t?n:n.subarray(0,t));let e="";for(let i=0;i<t;i++)e+=String.fromCharCode(n[i]);return e};var Is=(n,t)=>{let e,i;const o=t||n.length,s=new Array(o*2);for(i=0,e=0;e<o;){let a=n[e++];if(a<128){s[i++]=a;continue}let r=Rt[a];if(r>4){s[i++]=65533,e+=r-1;continue}for(a&=r===2?31:r===3?15:7;r>1&&e<o;)a=a<<6|n[e++]&63,r--;if(r>1){s[i++]=65533;continue}a<65536?s[i++]=a:(a-=65536,s[i++]=55296|a>>10&1023,s[i++]=56320|a&1023)}return $s(s,i)},Cs=(n,t)=>{t=t||n.length,t>n.length&&(t=n.length);let e=t-1;for(;e>=0&&(n[e]&192)===128;)e--;return e<0||e===0?t:e+Rt[n[e]]>t?e:t},Te={string2buf:Ms,buf2string:Is,utf8border:Cs};function Ts(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}var Rs=Ts;const Ot=30,Ls=12;var Ds=function(t,e){let i,o,s,a,r,d,c,l,g,h,f,u,w,m,b,y,x,k,S,E,v,I,M,_;const A=t.state;i=t.next_in,M=t.input,o=i+(t.avail_in-5),s=t.next_out,_=t.output,a=s-(e-t.avail_out),r=s+(t.avail_out-257),d=A.dmax,c=A.wsize,l=A.whave,g=A.wnext,h=A.window,f=A.hold,u=A.bits,w=A.lencode,m=A.distcode,b=(1<<A.lenbits)-1,y=(1<<A.distbits)-1;t:do{u<15&&(f+=M[i++]<<u,u+=8,f+=M[i++]<<u,u+=8),x=w[f&b];e:for(;;){if(k=x>>>24,f>>>=k,u-=k,k=x>>>16&255,k===0)_[s++]=x&65535;else if(k&16){S=x&65535,k&=15,k&&(u<k&&(f+=M[i++]<<u,u+=8),S+=f&(1<<k)-1,f>>>=k,u-=k),u<15&&(f+=M[i++]<<u,u+=8,f+=M[i++]<<u,u+=8),x=m[f&y];n:for(;;){if(k=x>>>24,f>>>=k,u-=k,k=x>>>16&255,k&16){if(E=x&65535,k&=15,u<k&&(f+=M[i++]<<u,u+=8,u<k&&(f+=M[i++]<<u,u+=8)),E+=f&(1<<k)-1,E>d){t.msg="invalid distance too far back",A.mode=Ot;break t}if(f>>>=k,u-=k,k=s-a,E>k){if(k=E-k,k>l&&A.sane){t.msg="invalid distance too far back",A.mode=Ot;break t}if(v=0,I=h,g===0){if(v+=c-k,k<S){S-=k;do _[s++]=h[v++];while(--k);v=s-E,I=_}}else if(g<k){if(v+=c+g-k,k-=g,k<S){S-=k;do _[s++]=h[v++];while(--k);if(v=0,g<S){k=g,S-=k;do _[s++]=h[v++];while(--k);v=s-E,I=_}}}else if(v+=g-k,k<S){S-=k;do _[s++]=h[v++];while(--k);v=s-E,I=_}for(;S>2;)_[s++]=I[v++],_[s++]=I[v++],_[s++]=I[v++],S-=3;S&&(_[s++]=I[v++],S>1&&(_[s++]=I[v++]))}else{v=s-E;do _[s++]=_[v++],_[s++]=_[v++],_[s++]=_[v++],S-=3;while(S>2);S&&(_[s++]=_[v++],S>1&&(_[s++]=_[v++]))}}else if(k&64){t.msg="invalid distance code",A.mode=Ot;break t}else{x=m[(x&65535)+(f&(1<<k)-1)];continue n}break}}else if(k&64)if(k&32){A.mode=Ls;break t}else{t.msg="invalid literal/length code",A.mode=Ot;break t}else{x=w[(x&65535)+(f&(1<<k)-1)];continue e}break}}while(i<o&&s<r);S=u>>3,i-=S,u-=S<<3,f&=(1<<u)-1,t.next_in=i,t.next_out=s,t.avail_in=i<o?5+(o-i):5-(i-o),t.avail_out=s<r?257+(r-s):257-(s-r),A.hold=f,A.bits=u};const gt=15,Ze=852,qe=592,Ke=0,le=1,Je=2,Ps=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),Os=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),Bs=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),Ns=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]),Fs=(n,t,e,i,o,s,a,r)=>{const d=r.bits;let c=0,l=0,g=0,h=0,f=0,u=0,w=0,m=0,b=0,y=0,x,k,S,E,v,I=null,M=0,_;const A=new Uint16Array(gt+1),T=new Uint16Array(gt+1);let O=null,D=0,R,L,j;for(c=0;c<=gt;c++)A[c]=0;for(l=0;l<i;l++)A[t[e+l]]++;for(f=d,h=gt;h>=1&&A[h]===0;h--);if(f>h&&(f=h),h===0)return o[s++]=1<<24|64<<16|0,o[s++]=1<<24|64<<16|0,r.bits=1,0;for(g=1;g<h&&A[g]===0;g++);for(f<g&&(f=g),m=1,c=1;c<=gt;c++)if(m<<=1,m-=A[c],m<0)return-1;if(m>0&&(n===Ke||h!==1))return-1;for(T[1]=0,c=1;c<gt;c++)T[c+1]=T[c]+A[c];for(l=0;l<i;l++)t[e+l]!==0&&(a[T[t[e+l]]++]=l);if(n===Ke?(I=O=a,_=19):n===le?(I=Ps,M-=257,O=Os,D-=257,_=256):(I=Bs,O=Ns,_=-1),y=0,l=0,c=g,v=s,u=f,w=0,S=-1,b=1<<f,E=b-1,n===le&&b>Ze||n===Je&&b>qe)return 1;for(;;){R=c-w,a[l]<_?(L=0,j=a[l]):a[l]>_?(L=O[D+a[l]],j=I[M+a[l]]):(L=96,j=0),x=1<<c-w,k=1<<u,g=k;do k-=x,o[v+(y>>w)+k]=R<<24|L<<16|j|0;while(k!==0);for(x=1<<c-1;y&x;)x>>=1;if(x!==0?(y&=x-1,y+=x):y=0,l++,--A[c]===0){if(c===h)break;c=t[e+a[l]]}if(c>f&&(y&E)!==S){for(w===0&&(w=f),v+=g,u=c-w,m=1<<u;u+w<h&&(m-=A[u+w],!(m<=0));)u++,m<<=1;if(b+=1<<u,n===le&&b>Ze||n===Je&&b>qe)return 1;S=y&E,o[S]=f<<24|u<<16|v-s|0}}return y!==0&&(o[v+y]=c-w<<24|64<<16|0),r.bits=f,0};var It=Fs;const js=0,fi=1,ui=2,{Z_FINISH:Ve,Z_BLOCK:Hs,Z_TREES:Bt,Z_OK:ht,Z_STREAM_END:zs,Z_NEED_DICT:Xs,Z_STREAM_ERROR:K,Z_DATA_ERROR:pi,Z_MEM_ERROR:gi,Z_BUF_ERROR:Us,Z_DEFLATED:Qe}=li,mi=1,tn=2,en=3,nn=4,sn=5,on=6,an=7,rn=8,cn=9,ln=10,Vt=11,tt=12,de=13,dn=14,he=15,hn=16,fn=17,un=18,pn=19,Nt=20,Ft=21,gn=22,mn=23,yn=24,bn=25,xn=26,fe=27,wn=28,kn=29,N=30,yi=31,Ys=32,Gs=852,Ws=592,Zs=15,qs=Zs,Sn=n=>(n>>>24&255)+(n>>>8&65280)+((n&65280)<<8)+((n&255)<<24);function Ks(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}const bi=n=>{if(!n||!n.state)return K;const t=n.state;return n.total_in=n.total_out=t.total=0,n.msg="",t.wrap&&(n.adler=t.wrap&1),t.mode=mi,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new Int32Array(Gs),t.distcode=t.distdyn=new Int32Array(Ws),t.sane=1,t.back=-1,ht},xi=n=>{if(!n||!n.state)return K;const t=n.state;return t.wsize=0,t.whave=0,t.wnext=0,bi(n)},wi=(n,t)=>{let e;if(!n||!n.state)return K;const i=n.state;return t<0?(e=0,t=-t):(e=(t>>4)+1,t<48&&(t&=15)),t&&(t<8||t>15)?K:(i.window!==null&&i.wbits!==t&&(i.window=null),i.wrap=e,i.wbits=t,xi(n))},ki=(n,t)=>{if(!n)return K;const e=new Ks;n.state=e,e.window=null;const i=wi(n,t);return i!==ht&&(n.state=null),i},Js=n=>ki(n,qs);let vn=!0,ue,pe;const Vs=n=>{if(vn){ue=new Int32Array(512),pe=new Int32Array(32);let t=0;for(;t<144;)n.lens[t++]=8;for(;t<256;)n.lens[t++]=9;for(;t<280;)n.lens[t++]=7;for(;t<288;)n.lens[t++]=8;for(It(fi,n.lens,0,288,ue,0,n.work,{bits:9}),t=0;t<32;)n.lens[t++]=5;It(ui,n.lens,0,32,pe,0,n.work,{bits:5}),vn=!1}n.lencode=ue,n.lenbits=9,n.distcode=pe,n.distbits=5},Si=(n,t,e,i)=>{let o;const s=n.state;return s.window===null&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new Uint8Array(s.wsize)),i>=s.wsize?(s.window.set(t.subarray(e-s.wsize,e),0),s.wnext=0,s.whave=s.wsize):(o=s.wsize-s.wnext,o>i&&(o=i),s.window.set(t.subarray(e-i,e-i+o),s.wnext),i-=o,i?(s.window.set(t.subarray(e-i,e),0),s.wnext=i,s.whave=s.wsize):(s.wnext+=o,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=o))),0},Qs=(n,t)=>{let e,i,o,s,a,r,d,c,l,g,h,f,u,w,m=0,b,y,x,k,S,E,v,I;const M=new Uint8Array(4);let _,A;const T=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(!n||!n.state||!n.output||!n.input&&n.avail_in!==0)return K;e=n.state,e.mode===tt&&(e.mode=de),a=n.next_out,o=n.output,d=n.avail_out,s=n.next_in,i=n.input,r=n.avail_in,c=e.hold,l=e.bits,g=r,h=d,I=ht;t:for(;;)switch(e.mode){case mi:if(e.wrap===0){e.mode=de;break}for(;l<16;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if(e.wrap&2&&c===35615){e.check=0,M[0]=c&255,M[1]=c>>>8&255,e.check=V(e.check,M,2,0),c=0,l=0,e.mode=tn;break}if(e.flags=0,e.head&&(e.head.done=!1),!(e.wrap&1)||(((c&255)<<8)+(c>>8))%31){n.msg="incorrect header check",e.mode=N;break}if((c&15)!==Qe){n.msg="unknown compression method",e.mode=N;break}if(c>>>=4,l-=4,v=(c&15)+8,e.wbits===0)e.wbits=v;else if(v>e.wbits){n.msg="invalid window size",e.mode=N;break}e.dmax=1<<e.wbits,n.adler=e.check=1,e.mode=c&512?ln:tt,c=0,l=0;break;case tn:for(;l<16;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if(e.flags=c,(e.flags&255)!==Qe){n.msg="unknown compression method",e.mode=N;break}if(e.flags&57344){n.msg="unknown header flags set",e.mode=N;break}e.head&&(e.head.text=c>>8&1),e.flags&512&&(M[0]=c&255,M[1]=c>>>8&255,e.check=V(e.check,M,2,0)),c=0,l=0,e.mode=en;case en:for(;l<32;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}e.head&&(e.head.time=c),e.flags&512&&(M[0]=c&255,M[1]=c>>>8&255,M[2]=c>>>16&255,M[3]=c>>>24&255,e.check=V(e.check,M,4,0)),c=0,l=0,e.mode=nn;case nn:for(;l<16;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}e.head&&(e.head.xflags=c&255,e.head.os=c>>8),e.flags&512&&(M[0]=c&255,M[1]=c>>>8&255,e.check=V(e.check,M,2,0)),c=0,l=0,e.mode=sn;case sn:if(e.flags&1024){for(;l<16;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}e.length=c,e.head&&(e.head.extra_len=c),e.flags&512&&(M[0]=c&255,M[1]=c>>>8&255,e.check=V(e.check,M,2,0)),c=0,l=0}else e.head&&(e.head.extra=null);e.mode=on;case on:if(e.flags&1024&&(f=e.length,f>r&&(f=r),f&&(e.head&&(v=e.head.extra_len-e.length,e.head.extra||(e.head.extra=new Uint8Array(e.head.extra_len)),e.head.extra.set(i.subarray(s,s+f),v)),e.flags&512&&(e.check=V(e.check,i,f,s)),r-=f,s+=f,e.length-=f),e.length))break t;e.length=0,e.mode=an;case an:if(e.flags&2048){if(r===0)break t;f=0;do v=i[s+f++],e.head&&v&&e.length<65536&&(e.head.name+=String.fromCharCode(v));while(v&&f<r);if(e.flags&512&&(e.check=V(e.check,i,f,s)),r-=f,s+=f,v)break t}else e.head&&(e.head.name=null);e.length=0,e.mode=rn;case rn:if(e.flags&4096){if(r===0)break t;f=0;do v=i[s+f++],e.head&&v&&e.length<65536&&(e.head.comment+=String.fromCharCode(v));while(v&&f<r);if(e.flags&512&&(e.check=V(e.check,i,f,s)),r-=f,s+=f,v)break t}else e.head&&(e.head.comment=null);e.mode=cn;case cn:if(e.flags&512){for(;l<16;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if(c!==(e.check&65535)){n.msg="header crc mismatch",e.mode=N;break}c=0,l=0}e.head&&(e.head.hcrc=e.flags>>9&1,e.head.done=!0),n.adler=e.check=0,e.mode=tt;break;case ln:for(;l<32;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}n.adler=e.check=Sn(c),c=0,l=0,e.mode=Vt;case Vt:if(e.havedict===0)return n.next_out=a,n.avail_out=d,n.next_in=s,n.avail_in=r,e.hold=c,e.bits=l,Xs;n.adler=e.check=1,e.mode=tt;case tt:if(t===Hs||t===Bt)break t;case de:if(e.last){c>>>=l&7,l-=l&7,e.mode=fe;break}for(;l<3;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}switch(e.last=c&1,c>>>=1,l-=1,c&3){case 0:e.mode=dn;break;case 1:if(Vs(e),e.mode=Nt,t===Bt){c>>>=2,l-=2;break t}break;case 2:e.mode=fn;break;case 3:n.msg="invalid block type",e.mode=N}c>>>=2,l-=2;break;case dn:for(c>>>=l&7,l-=l&7;l<32;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if((c&65535)!==(c>>>16^65535)){n.msg="invalid stored block lengths",e.mode=N;break}if(e.length=c&65535,c=0,l=0,e.mode=he,t===Bt)break t;case he:e.mode=hn;case hn:if(f=e.length,f){if(f>r&&(f=r),f>d&&(f=d),f===0)break t;o.set(i.subarray(s,s+f),a),r-=f,s+=f,d-=f,a+=f,e.length-=f;break}e.mode=tt;break;case fn:for(;l<14;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if(e.nlen=(c&31)+257,c>>>=5,l-=5,e.ndist=(c&31)+1,c>>>=5,l-=5,e.ncode=(c&15)+4,c>>>=4,l-=4,e.nlen>286||e.ndist>30){n.msg="too many length or distance symbols",e.mode=N;break}e.have=0,e.mode=un;case un:for(;e.have<e.ncode;){for(;l<3;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}e.lens[T[e.have++]]=c&7,c>>>=3,l-=3}for(;e.have<19;)e.lens[T[e.have++]]=0;if(e.lencode=e.lendyn,e.lenbits=7,_={bits:e.lenbits},I=It(js,e.lens,0,19,e.lencode,0,e.work,_),e.lenbits=_.bits,I){n.msg="invalid code lengths set",e.mode=N;break}e.have=0,e.mode=pn;case pn:for(;e.have<e.nlen+e.ndist;){for(;m=e.lencode[c&(1<<e.lenbits)-1],b=m>>>24,y=m>>>16&255,x=m&65535,!(b<=l);){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if(x<16)c>>>=b,l-=b,e.lens[e.have++]=x;else{if(x===16){for(A=b+2;l<A;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if(c>>>=b,l-=b,e.have===0){n.msg="invalid bit length repeat",e.mode=N;break}v=e.lens[e.have-1],f=3+(c&3),c>>>=2,l-=2}else if(x===17){for(A=b+3;l<A;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}c>>>=b,l-=b,v=0,f=3+(c&7),c>>>=3,l-=3}else{for(A=b+7;l<A;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}c>>>=b,l-=b,v=0,f=11+(c&127),c>>>=7,l-=7}if(e.have+f>e.nlen+e.ndist){n.msg="invalid bit length repeat",e.mode=N;break}for(;f--;)e.lens[e.have++]=v}}if(e.mode===N)break;if(e.lens[256]===0){n.msg="invalid code -- missing end-of-block",e.mode=N;break}if(e.lenbits=9,_={bits:e.lenbits},I=It(fi,e.lens,0,e.nlen,e.lencode,0,e.work,_),e.lenbits=_.bits,I){n.msg="invalid literal/lengths set",e.mode=N;break}if(e.distbits=6,e.distcode=e.distdyn,_={bits:e.distbits},I=It(ui,e.lens,e.nlen,e.ndist,e.distcode,0,e.work,_),e.distbits=_.bits,I){n.msg="invalid distances set",e.mode=N;break}if(e.mode=Nt,t===Bt)break t;case Nt:e.mode=Ft;case Ft:if(r>=6&&d>=258){n.next_out=a,n.avail_out=d,n.next_in=s,n.avail_in=r,e.hold=c,e.bits=l,Ds(n,h),a=n.next_out,o=n.output,d=n.avail_out,s=n.next_in,i=n.input,r=n.avail_in,c=e.hold,l=e.bits,e.mode===tt&&(e.back=-1);break}for(e.back=0;m=e.lencode[c&(1<<e.lenbits)-1],b=m>>>24,y=m>>>16&255,x=m&65535,!(b<=l);){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if(y&&!(y&240)){for(k=b,S=y,E=x;m=e.lencode[E+((c&(1<<k+S)-1)>>k)],b=m>>>24,y=m>>>16&255,x=m&65535,!(k+b<=l);){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}c>>>=k,l-=k,e.back+=k}if(c>>>=b,l-=b,e.back+=b,e.length=x,y===0){e.mode=xn;break}if(y&32){e.back=-1,e.mode=tt;break}if(y&64){n.msg="invalid literal/length code",e.mode=N;break}e.extra=y&15,e.mode=gn;case gn:if(e.extra){for(A=e.extra;l<A;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}e.length+=c&(1<<e.extra)-1,c>>>=e.extra,l-=e.extra,e.back+=e.extra}e.was=e.length,e.mode=mn;case mn:for(;m=e.distcode[c&(1<<e.distbits)-1],b=m>>>24,y=m>>>16&255,x=m&65535,!(b<=l);){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if(!(y&240)){for(k=b,S=y,E=x;m=e.distcode[E+((c&(1<<k+S)-1)>>k)],b=m>>>24,y=m>>>16&255,x=m&65535,!(k+b<=l);){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}c>>>=k,l-=k,e.back+=k}if(c>>>=b,l-=b,e.back+=b,y&64){n.msg="invalid distance code",e.mode=N;break}e.offset=x,e.extra=y&15,e.mode=yn;case yn:if(e.extra){for(A=e.extra;l<A;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}e.offset+=c&(1<<e.extra)-1,c>>>=e.extra,l-=e.extra,e.back+=e.extra}if(e.offset>e.dmax){n.msg="invalid distance too far back",e.mode=N;break}e.mode=bn;case bn:if(d===0)break t;if(f=h-d,e.offset>f){if(f=e.offset-f,f>e.whave&&e.sane){n.msg="invalid distance too far back",e.mode=N;break}f>e.wnext?(f-=e.wnext,u=e.wsize-f):u=e.wnext-f,f>e.length&&(f=e.length),w=e.window}else w=o,u=a-e.offset,f=e.length;f>d&&(f=d),d-=f,e.length-=f;do o[a++]=w[u++];while(--f);e.length===0&&(e.mode=Ft);break;case xn:if(d===0)break t;o[a++]=e.length,d--,e.mode=Ft;break;case fe:if(e.wrap){for(;l<32;){if(r===0)break t;r--,c|=i[s++]<<l,l+=8}if(h-=d,n.total_out+=h,e.total+=h,h&&(n.adler=e.check=e.flags?V(e.check,o,h,a-h):Ie(e.check,o,h,a-h)),h=d,(e.flags?c:Sn(c))!==e.check){n.msg="incorrect data check",e.mode=N;break}c=0,l=0}e.mode=wn;case wn:if(e.wrap&&e.flags){for(;l<32;){if(r===0)break t;r--,c+=i[s++]<<l,l+=8}if(c!==(e.total&4294967295)){n.msg="incorrect length check",e.mode=N;break}c=0,l=0}e.mode=kn;case kn:I=zs;break t;case N:I=pi;break t;case yi:return gi;case Ys:default:return K}return n.next_out=a,n.avail_out=d,n.next_in=s,n.avail_in=r,e.hold=c,e.bits=l,(e.wsize||h!==n.avail_out&&e.mode<N&&(e.mode<fe||t!==Ve))&&Si(n,n.output,n.next_out,h-n.avail_out),g-=n.avail_in,h-=n.avail_out,n.total_in+=g,n.total_out+=h,e.total+=h,e.wrap&&h&&(n.adler=e.check=e.flags?V(e.check,o,h,n.next_out-h):Ie(e.check,o,h,n.next_out-h)),n.data_type=e.bits+(e.last?64:0)+(e.mode===tt?128:0)+(e.mode===Nt||e.mode===he?256:0),(g===0&&h===0||t===Ve)&&I===ht&&(I=Us),I},to=n=>{if(!n||!n.state)return K;let t=n.state;return t.window&&(t.window=null),n.state=null,ht},eo=(n,t)=>{if(!n||!n.state)return K;const e=n.state;return e.wrap&2?(e.head=t,t.done=!1,ht):K},no=(n,t)=>{const e=t.length;let i,o,s;return!n||!n.state||(i=n.state,i.wrap!==0&&i.mode!==Vt)?K:i.mode===Vt&&(o=1,o=Ie(o,t,e,0),o!==i.check)?pi:(s=Si(n,t,e,e),s?(i.mode=yi,gi):(i.havedict=1,ht))};var io=xi,so=wi,oo=bi,ao=Js,ro=ki,co=Qs,lo=to,ho=eo,fo=no,uo="pako inflate (from Nodeca project)",nt={inflateReset:io,inflateReset2:so,inflateResetKeep:oo,inflateInit:ao,inflateInit2:ro,inflate:co,inflateEnd:lo,inflateGetHeader:ho,inflateSetDictionary:fo,inflateInfo:uo};function po(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}var go=po;const vi=Object.prototype.toString,{Z_NO_FLUSH:mo,Z_FINISH:yo,Z_OK:Lt,Z_STREAM_END:ge,Z_NEED_DICT:me,Z_STREAM_ERROR:bo,Z_DATA_ERROR:En,Z_MEM_ERROR:xo}=li;function ie(n){this.options=di.assign({chunkSize:1024*64,windowBits:15,to:""},n||{});const t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,t.windowBits===0&&(t.windowBits=-15)),t.windowBits>=0&&t.windowBits<16&&!(n&&n.windowBits)&&(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&(t.windowBits&15||(t.windowBits|=15)),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new Rs,this.strm.avail_out=0;let e=nt.inflateInit2(this.strm,t.windowBits);if(e!==Lt)throw new Error(Ce[e]);if(this.header=new go,nt.inflateGetHeader(this.strm,this.header),t.dictionary&&(typeof t.dictionary=="string"?t.dictionary=Te.string2buf(t.dictionary):vi.call(t.dictionary)==="[object ArrayBuffer]"&&(t.dictionary=new Uint8Array(t.dictionary)),t.raw&&(e=nt.inflateSetDictionary(this.strm,t.dictionary),e!==Lt)))throw new Error(Ce[e])}ie.prototype.push=function(n,t){const e=this.strm,i=this.options.chunkSize,o=this.options.dictionary;let s,a,r;if(this.ended)return!1;for(t===~~t?a=t:a=t===!0?yo:mo,vi.call(n)==="[object ArrayBuffer]"?e.input=new Uint8Array(n):e.input=n,e.next_in=0,e.avail_in=e.input.length;;){for(e.avail_out===0&&(e.output=new Uint8Array(i),e.next_out=0,e.avail_out=i),s=nt.inflate(e,a),s===me&&o&&(s=nt.inflateSetDictionary(e,o),s===Lt?s=nt.inflate(e,a):s===En&&(s=me));e.avail_in>0&&s===ge&&e.state.wrap>0&&n[e.next_in]!==0;)nt.inflateReset(e),s=nt.inflate(e,a);switch(s){case bo:case En:case me:case xo:return this.onEnd(s),this.ended=!0,!1}if(r=e.avail_out,e.next_out&&(e.avail_out===0||s===ge))if(this.options.to==="string"){let d=Te.utf8border(e.output,e.next_out),c=e.next_out-d,l=Te.buf2string(e.output,d);e.next_out=c,e.avail_out=i-c,c&&e.output.set(e.output.subarray(d,d+c),0),this.onData(l)}else this.onData(e.output.length===e.next_out?e.output:e.output.subarray(0,e.next_out));if(!(s===Lt&&r===0)){if(s===ge)return s=nt.inflateEnd(this.strm),this.onEnd(s),this.ended=!0,!0;if(e.avail_in===0)break}}return!0};ie.prototype.onData=function(n){this.chunks.push(n)};ie.prototype.onEnd=function(n){n===Lt&&(this.options.to==="string"?this.result=this.chunks.join(""):this.result=di.flattenChunks(this.chunks)),this.chunks=[],this.err=n,this.msg=this.strm.msg};function wo(n,t){const e=new ie(t);if(e.push(n),e.err)throw e.msg||Ce[e.err];return e.result}var ko=wo,So={inflate:ko};const{inflate:vo}=So;var Ei=vo;const Eo="svg-source:excalidraw",_o="application/vnd.excalidraw+json",_i=/<!-- payload-start -->\s*([\s\S]+?)\s*<!-- payload-end -->/,Ao=/<!-- payload-version:(\d+) -->/;class G extends Error{constructor(t,e){super(`scene:${t}${e?` (${e})`:""}`),this.reason=t,this.detail=e,this.name="SceneError"}}function je(n){const t=new Uint8Array(n.length);for(let e=0;e<n.length;e++)t[e]=n.charCodeAt(e)&255;return t}function Ai(n){return new TextDecoder("utf-8").decode(je(n))}function Mo(n,t){const e=atob(n);return t?Ei(je(e),{to:"string"}):Ai(e)}function Mi(n){return n.includes(Eo)&&_i.test(n)}function $o(n){if(!Mi(n))return!1;try{return $i(n).elements.length>0}catch{return!1}}function $i(n){if(!n.includes(_o))throw new G("no-payload");const t=Ao.exec(n),e=t?Number(t[1]):1,i=_i.exec(n);if(!i)throw new G("no-payload","缺 payload-start/end 标记");let o;try{o=e===1?Mo(i[1],!1):atob(i[1])}catch(d){throw new G("bad-payload",d instanceof Error?d.message:String(d))}let s;try{s=JSON.parse(o)}catch{throw new G("bad-payload","载荷不是合法 JSON")}if(!s||typeof s!="object")throw new G("bad-payload","载荷不是对象");const a=Io(s);if(a.type!=="excalidraw")throw new G("wrong-type",String(a.type));if(!Array.isArray(a.elements))throw new G("bad-payload","scene 缺 elements 数组");return{elements:a.elements,appState:a.appState&&typeof a.appState=="object"?a.appState:{},files:a.files&&typeof a.files=="object"?a.files:{}}}function Io(n){if(!("encoded"in n)){if(n.type==="excalidraw")return n;throw new G("wrong-type",typeof n.type=="string"?n.type:"unknown")}const t=n.encoding;if(t!=="bstring")throw new G("unsupported-encoding",String(t));const e=n.encoded;if(typeof e!="string")throw new G("bad-payload","encoded 字段不是字符串");const i=n.compressed===!0;let o;try{o=i?Ei(je(e),{to:"string"}):Ai(e)}catch(a){throw new G("bad-payload",a instanceof Error?a.message:String(a))}let s;try{s=JSON.parse(o)}catch{throw new G("bad-payload","scene JSON 解析失败")}if(!s||typeof s!="object")throw new G("bad-payload","scene 不是对象");return s}function Re(n){if(Array.isArray(n))return n.map(Re);if(n&&typeof n=="object"){const t={},e=n;for(const i of Object.keys(e).sort()){const o=e[i];o!=null&&(i==="boundElements"&&Array.isArray(o)&&o.length===0||(t[i]=Re(o)))}return t}return n}function _n(n){if(!Mi(n))return null;try{const t=$i(n);return JSON.stringify(Re({elements:t.elements,appState:t.appState,files:t.files}))}catch{return null}}function Co(n,t){if(n===t)return!0;const e=_n(n),i=_n(t);return e!==null&&e===i}const To=".excalidrawlib",Ro=`local${To}`;function An(n){let t=[];try{const e=JSON.parse(n);if(Array.isArray(e))t=e;else if(e&&typeof e=="object"){const i=e;Array.isArray(i.libraryItems)?t=i.libraryItems:Array.isArray(i.library)&&(t=i.library)}}catch{}return Po(t)}function Lo(n){if(!n||typeof n!="object")return"";const t=n;return`${typeof t.id=="string"?t.id:""}:${typeof t.versionNonce=="number"?t.versionNonce:""}`}function ye(n){const t=n.map(Lo).sort().join("|");let e=2166136261,i=2166136261;for(let o=0;o<t.length;o++){const s=t.charCodeAt(o);e=Math.imul(e^s,16777619)>>>0,i=Math.imul(i^s,2246822507)>>>0}return`lib-${e.toString(16).padStart(8,"0")}${i.toString(16).padStart(8,"0")}`}function Le(n){return!!n&&typeof n=="object"&&typeof n.type=="string"}function Do(n){return Object.keys(n).filter(t=>/^\d+$/.test(t)).sort((t,e)=>Number(t)-Number(e)).map(t=>n[t]).filter(Le)}function Po(n,t="published"){const e=[];for(const i of n){if(Array.isArray(i)){const o=i.filter(Le);if(o.length===0)continue;e.push({id:ye(o),status:t,elements:o,created:Date.now()});continue}if(i&&typeof i=="object"){const o=i;if(Array.isArray(o.elements)){const a=o.elements.filter(Le);if(a.length===0)continue;e.push({...o,elements:a,id:typeof o.id=="string"&&o.id!==""?o.id:ye(a),status:typeof o.status=="string"?o.status:t,created:typeof o.created=="number"?o.created:Date.now()});continue}const s=Do(o);s.length>0&&e.push({id:ye(s),status:t,elements:s,created:Date.now()});continue}}return e}function Mn(n,t="siyuan-excali-studio"){return JSON.stringify({type:"excalidrawlib",version:2,source:t,libraryItems:n},null,2)}function qt(n){if(n&&typeof n=="object"){const t=n.id;if(typeof t=="string"&&t!=="")return t}return null}function Oo(n){const t=[],e=new Map,i=new Map,o=n[0]?.path??"";for(const s of n){i.set(s.path,s.items);const a=s.path===o;for(const r of s.items){const d=qt(r);if(d!==null&&e.has(d)){console.warn(`[excali-studio] 模板库条目 id 重复（${d}，来自 ${s.path}），保留先到的一份`);continue}d!==null&&e.set(d,s.path),t.push(a?r:{...r,status:"published"})}}return{items:t,sourceOf:e,byPath:i}}function Bo(n,t,e){const i=new Map,o=[];for(const r of t){const d=qt(r);if(d===null){o.push(r);continue}n.sourceOf.has(d)||o.push(r),i.set(d,r)}const s=new Set;for(const r of n.items){const d=qt(r),c=d!==null&&n.sourceOf.get(d)||e,l=d!==null?i.get(d):void 0;(!l||JSON.stringify(l)!==JSON.stringify(r))&&s.add(c)}o.length>0&&s.add(e);const a=[];for(const r of[...s].sort()){const d=n.byPath.get(r)??[],c=[];for(const l of d){const g=qt(l);if(g!==null&&n.sourceOf.get(g)!==r){c.push(l);continue}const h=g!==null?i.get(g):void 0;h&&c.push(r===e?h:{...h,status:"published"})}if(r===e)for(const l of o)c.unshift(l);a.push({path:r,items:c})}return a}const $n="exs:script-pin-changed",be="exs:rail-view-changed",No="exs:highlighter-changed",Fo=0,Kt={color:"#ffd43b",width:4,opacity:45},jo=/^#[0-9a-fA-F]{6}$/;function In(n,t,e,i){return Number.isFinite(n)?Math.min(e,Math.max(t,n)):i}function Qt(n){const t=n&&typeof n=="object"?n:{};return{color:typeof t.color=="string"&&jo.test(t.color.trim())?t.color.trim().toLowerCase():Kt.color,width:In(Number(t.width),1,12,Kt.width),opacity:In(Number(t.opacity),10,100,Kt.opacity)}}const Ho="M4,7L4,17A2,2 0 0 0 6,19L18,19A2,2 0 0 0 20,17L20,7A2,2 0 0 0 18,5L6,5A2,2 0 0 0 4,7ZM12,9.5L12,14.5M9.5,12L14.5,12",zo="M3.5,6A2.5,2.5 0 0 1 6,3.5L12,3.5A2.5,2.5 0 0 1 14.5,6L14.5,12A2.5,2.5 0 0 1 12,14.5L6,14.5A2.5,2.5 0 0 1 3.5,12ZM22,18A3.5,3.5 0 1 1 15,18A3.5,3.5 0 1 1 22,18",Xo="M4,9L4,6A2,2 0 0 1 6,4L9,4M20,15L20,18A2,2 0 0 1 18,20L15,20M15.6,6.4L19.6,10.4L11,19L6.4,20L7.4,15.4ZM13.6,8.4L17.6,12.4",Cn="M8.4,12A3.6,3.6 0 1 0 15.6,12A3.6,3.6 0 1 0 8.4,12M12,3.5L12,6M12,18L12,20.5M3.5,12L6,12M18,12L20.5,12M5.9,5.9L7.7,7.7M16.3,16.3L18.1,18.1M18.1,5.9L16.3,7.7M7.7,16.3L5.9,18.1",Uo="M4.5,19.5L4.5,16.3L12.8,8.0L16.2,11.4L8.0,19.5ZM10.2,10.6L13.6,14.0",Yo="M5,6L7.5,6M10.5,6L19,6M5,12L7.5,12M10.5,12L19,12M5,18L7.5,18M10.5,18L19,18",Go="M3.5,5.5L20.5,5.5L20.5,18.5L3.5,18.5ZM7,9.5L11,9.5L11,13.5L7,13.5ZM13.5,11L17,11L17,15L13.5,15Z",Wo="M3.5,5L20.5,5L20.5,19L3.5,19ZM9,9.8L12,12.8L15,9.8",Zo="M4.5,5.8L7.6,7L4.5,8.2ZM9.8,7L20,7M9.8,11.5L16.5,11.5M9.8,16L18.5,16",qo={"text-numbering.md":Yo,"box-selection.md":Go,"highlighter.md":Uo,"frame-collapse.md":Wo,"selection-fold.md":Zo},Tn="M9.5,3.5L14.5,3.5L16,7L8,7ZM10,7L10.8,14L13.2,14L14,7M12,14L12,20.5",Ko="M3.5,4L20.5,4L20.5,14.5L3.5,14.5ZM12,14.5L12,19M8.5,20.5L15.5,20.5M10.5,7L15,9.25L10.5,11.5Z",He="insert-board-card",Ii="outline-color",Ci="image-to-material",Ti="presentation";function xe(n){return n.mount??"rail"}const ze=[{id:He,title:"插入白板卡片",titleEn:"Insert board card",desc:"从白板库挑一块，在当前画布中心插一张能点开的卡片",icon:Ho},{id:Ii,title:"仅外框颜色",titleEn:"Outline color",desc:"只改选中图形的边框色，文字颜色保持不变",icon:zo},{id:Ci,title:"图片转笔画素材",titleEn:"Image to strokes",desc:"把选中的图片描成可改色的原生笔画，可替换到画布或加入素材库",icon:Xo},{id:Ti,title:"演示模式",titleEn:"Presentation mode",desc:"把画布里的画框当幻灯片，逐页放映；点图钉固定到画布右上角",icon:Ko,mount:"top-right"}],Ri=[He];function De(n){return typeof n=="string"&&ze.some(t=>t.id===n)}function Rn(n){return ze.find(t=>t.id===n)??null}function Jo(n){if(!Array.isArray(n))return[...Ri];const t=[];for(const e of n)De(e)&&!t.includes(e)&&t.push(e);return t}const Vo=["agent","mcp","cli","script"],Li={agent:!0,mcp:!0,cli:!0,script:!0};function Qo(n){const t=n&&typeof n=="object"?n:{},e={...Li};for(const i of Vo)t[i]===!1?e[i]=!1:t[i]===!0&&(e[i]=!0);return e}const bt="assets/excali";function Di(n){return String(n??"").trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/^data\//i,"").replace(/\/+$/,"")}const Pi={scrim:!0,reveal:!0,typewriter:!1,cursor:!1,speed:28,fit:.95,autoAdvance:0,fullscreen:!0,directional:!1};function mt(n,t){return typeof n=="boolean"?n:t}function we(n,t,e,i){return typeof n!="number"||!Number.isFinite(n)?i:Math.min(e,Math.max(t,n))}function Oi(n){const t=n&&typeof n=="object"?n:{},e=Pi;return{scrim:mt(t.scrim,e.scrim),reveal:mt(t.reveal,e.reveal),typewriter:mt(t.typewriter,e.typewriter),cursor:mt(t.cursor,e.cursor),speed:Math.round(we(t.speed,8,200,e.speed)),fit:we(t.fit,.5,1,e.fit),autoAdvance:Math.round(we(t.autoAdvance,0,300,e.autoAdvance)),fullscreen:mt(t.fullscreen,e.fullscreen),directional:mt(t.directional,e.directional)}}const z={saveDir:bt,accentStroke:!0,showWelcome:!0,gridModeEnabled:!1,boardDir:"/Excali 白板",autoOpenBoard:!1,autoCreateDoc:!1,stencilMigrated:!1,pinnedScripts:[],pinnedActions:[...Ri],scriptRailCollapsed:!1,scriptRailTop:.09,scriptSettings:{},builtinSnapshot:{},highlighter:{...Kt},imageBaseUrl:"",imageModel:"gpt-image-1",imageApiKey:"",imageSize:"1024x1024",aiChannels:{...Li},presentation:{...Pi}};function yt(n){const t=n&&typeof n=="object"?n:{},e=typeof t.saveDir=="string"?Di(t.saveDir):"",i=e!==""?e:z.saveDir,o=typeof t.boardDir=="string"&&t.boardDir.trim()!==""?t.boardDir.trim():z.boardDir,s={};if(t.scriptSettings&&typeof t.scriptSettings=="object")for(const[r,d]of Object.entries(t.scriptSettings).slice(0,50)){if(!d||typeof d!="object")continue;const c={};for(const[l,g]of Object.entries(d).slice(0,20))(typeof g=="string"||typeof g=="number"||typeof g=="boolean")&&(c[l]=g);s[r]=c}const a={};if(t.builtinSnapshot&&typeof t.builtinSnapshot=="object")for(const[r,d]of Object.entries(t.builtinSnapshot).slice(0,100))r!==""&&typeof d=="number"&&Number.isFinite(d)&&(a[r]=d);return{saveDir:i,accentStroke:typeof t.accentStroke=="boolean"?t.accentStroke:z.accentStroke,showWelcome:typeof t.showWelcome=="boolean"?t.showWelcome:z.showWelcome,gridModeEnabled:typeof t.gridModeEnabled=="boolean"?t.gridModeEnabled:z.gridModeEnabled,boardDir:o,autoOpenBoard:typeof t.autoOpenBoard=="boolean"?t.autoOpenBoard:z.autoOpenBoard,autoCreateDoc:typeof t.autoCreateDoc=="boolean"?t.autoCreateDoc:z.autoCreateDoc,stencilMigrated:typeof t.stencilMigrated=="boolean"?t.stencilMigrated:z.stencilMigrated,pinnedScripts:Array.isArray(t.pinnedScripts)?t.pinnedScripts.filter(r=>typeof r=="string"&&r!==""):z.pinnedScripts,pinnedActions:Jo(t.pinnedActions),scriptRailCollapsed:typeof t.scriptRailCollapsed=="boolean"?t.scriptRailCollapsed:z.scriptRailCollapsed,scriptRailTop:typeof t.scriptRailTop=="number"&&Number.isFinite(t.scriptRailTop)&&t.scriptRailTop>=0&&t.scriptRailTop<=.85?t.scriptRailTop:z.scriptRailTop,scriptSettings:s,builtinSnapshot:a,highlighter:Qt(t.highlighter),imageBaseUrl:typeof t.imageBaseUrl=="string"?t.imageBaseUrl.trim().replace(/\/+$/,"").slice(0,500):z.imageBaseUrl,imageModel:typeof t.imageModel=="string"&&t.imageModel.trim()!==""?t.imageModel.trim().slice(0,100):z.imageModel,imageApiKey:typeof t.imageApiKey=="string"?t.imageApiKey.trim().slice(0,500):z.imageApiKey,imageSize:typeof t.imageSize=="string"&&t.imageSize.trim()!==""?t.imageSize.trim().slice(0,32):z.imageSize,aiChannels:Qo(t.aiChannels),presentation:Oi(t.presentation)}}const Ln="board";function C(n){const t=n.replace(/^\/+/,"");return t==="data"||t.startsWith("data/")?`/${t}`:`/data/${t}`}function H(n){return n.replace(/^\/+/,"").replace(/^data\//,"")}function ta(n){return C(n)}function ea(n){return`/${H(n)}`}function B(n){return H(n).split("/").pop()||n}function ct(n,t){const e=n.trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+$/,"");return`${e===""?"assets":e}/${t}`}function ke(n,t="excali-board.svg"){return`${(String(n??"").replace(/[\\/:*?"<>|\u0000-\u001f]/g,"").replace(/^\.+/,"").trim().replace(/\.svg$/i,"")||t.replace(/\.svg$/i,"")).slice(0,80)}.svg`}const Bi=3;function Jt(n,t=1){const e=n.replace(/\.svg$/i,"");return t<=1?`${e}.svg.bak.svg`:`${e}.svg.bak${t}.svg`}function Ni(n){const t=C(n);return Array.from({length:Bi},(e,i)=>Jt(t,i+1))}function Xe(n){return/\.bak\d*\.svg$/i.test(n)}async function Se(n,t,e){const i=t.replace(/\.svg$/i,"");for(let o=0;o<50;o++){const s=C(ct(n,o===0?t:`${i}_${o-1}.svg`));if(e&&s===e||!await et(s))return s}return C(ct(n,t))}async function Ct(n,t){const e=C(n),i=new FormData;i.append("path",e),i.append("isDir","false"),i.append("file",new Blob([t],{type:"image/svg+xml;charset=utf-8"}),e.split("/").pop()||"x.svg");const o=await fetch("/api/file/putFile",{method:"POST",body:i}),s=await o.json().catch(()=>null);if(!o.ok||!s||s.code!==0)throw new Error(s?.msg||`putFile HTTP ${o.status}`);return e}async function q(n){const t=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:C(n)})});if(!t.ok)throw new Error(`getFile HTTP ${t.status}`);const e=await t.text();if((t.headers.get("content-type")||"").includes("application/json")){let i=null;try{i=JSON.parse(e)}catch{return e}if(i&&typeof i=="object"&&"code"in i&&i.code!==0){const o=i.msg;throw new Error(o||`getFile code ${i.code}`)}}return e}async function et(n){try{const t=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:C(n)})});if(!t.ok)return!1;if((t.headers.get("content-type")||"").includes("application/json")){const e=await t.json().catch(()=>null);return!e||e.code===0}return!0}catch{return!1}}async function Ue(n,t){const e=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),i=await e.json().catch(()=>null);if(!e.ok||!i||i.code!==0)throw new Error(i?.msg||`${n} HTTP ${e.status}`);return i.data}async function At(n){const t=n.trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+$/,""),e=t===""?"assets":t,i=await Ue("/api/file/readDir",{path:C(e)});return(Array.isArray(i)?i.filter(s=>s&&s.isDir!==!0&&typeof s.name=="string"&&/\.svg$/i.test(s.name)&&!Xe(s.name)):[]).map(s=>({path:`${e}/${s.name}`,updated:typeof s.updated=="number"?s.updated:0})).sort((s,a)=>a.updated-s.updated)}async function ve(n,t){const e=n.trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+$/,""),i=e===""?"assets":e,o=await Ue("/api/file/readDir",{path:C(i)});return Array.isArray(o)?o.filter(s=>s&&s.isDir!==!0&&typeof s.name=="string"&&(!t||t.test(s.name))).map(s=>`${i}/${s.name}`):[]}async function xt(n){await Ue("/api/file/removeFile",{path:C(n)})}async function Dn(n,t){const e=C(n),i=C(t),o=await q(e),s=await Ct(i,o);if(s!==e){await xt(e);for(let a=1;a<=Bi;a++)try{const r=await q(Jt(e,a));await Ct(Jt(s,a),r),await xt(Jt(e,a))}catch{}}return s}async function wt(n,t){const e=C(n),i=new FormData;i.append("path",e),i.append("isDir","false"),i.append("file",new Blob([t],{type:"application/json;charset=utf-8"}),e.split("/").pop()||"x.json");const o=await fetch("/api/file/putFile",{method:"POST",body:i}),s=await o.json().catch(()=>null);if(!o.ok||!s||s.code!==0)throw new Error(s?.msg||`putFile HTTP ${o.status}`);return e}async function na(n,t,e){const i=C(n),o=new FormData;o.append("path",i),o.append("isDir","false"),o.append("file",new Blob([t],{type:e}),i.split("/").pop()||"x.bin");const s=await fetch("/api/file/putFile",{method:"POST",body:o}),a=await s.json().catch(()=>null);if(!s.ok||!a||a.code!==0)throw new Error(a?.msg||`putFile HTTP ${s.status}`);return i}async function ia(n){const t=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:C(n)})});if(!t.ok)throw new Error(`getFile HTTP ${t.status}`);if((t.headers.get("content-type")||"").includes("application/json")){const e=await t.json().catch(()=>null);throw new Error(e?.msg||`getFile code ${e?.code??"?"}`)}return new Uint8Array(await t.arrayBuffer())}function sa(){return!!window.siyuan?.mobile}function oa(n){const t=document.createElement("div");t.className="exs-mobile-shell";const e=document.createElement("div");e.className="exs-mobile-header";const i=document.createElement("div");i.className="exs-mobile-title",i.textContent=n.data.dataPath?B(n.data.dataPath):p("未命名白板");const o=document.createElement("button");o.type="button",o.className="exs-mobile-close",o.setAttribute("aria-label",p("关闭")),o.textContent="✕",e.append(i,o);const s=document.createElement("div");s.className="exs-mobile-body exs-panel";const a=document.createElement("div");a.className="exs-loading",a.textContent=p("正在打开白板…"),s.appendChild(a),t.append(e,s),document.body.appendChild(t),document.body.classList.add("exs-mobile-open");const r=()=>{document.querySelectorAll(".exs-mobile-shell").forEach(f=>{f!==t&&(f.style.display="none")}),t.style.display="flex"};r();let d=null,c=!1;const l=()=>{if(!c){c=!0;try{d?.dispose()}finally{d=null,t.remove(),document.querySelector(".exs-mobile-shell")||document.body.classList.remove("exs-mobile-open"),n.onDispose()}}},g={headElement:e,updateTitle:f=>{i.textContent=f},close:l,parent:{switchTab:()=>r()}},h={element:s,data:n.data,tab:g};return o.addEventListener("click",f=>{d||(f.preventDefault(),f.stopPropagation(),l())}),{custom:h,body:s,mount:f=>{d=f},showError:f=>{s.replaceChildren();const u=document.createElement("div");u.className="exs-loaderror";const w=document.createElement("div");w.textContent=f,u.appendChild(w),s.appendChild(u)},close:l,isClosed:()=>c}}const aa="assets/excali-media";function ra(n){const t=/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]+)$/.exec(n.trim());if(!t)return null;const e=atob(t[2]),i=new Uint8Array(e.length);for(let o=0;o<e.length;o++)i[o]=e.charCodeAt(o)&255;return{mime:t[1]||"application/octet-stream",bytes:i}}function ca(n){return{"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/svg+xml":"svg","image/bmp":"bmp","image/avif":"avif"}[n]||"bin"}async function la(n,t){const e=await crypto.subtle.digest("SHA-1",n);return`${Array.from(new Uint8Array(e.slice(0,8))).map(o=>o.toString(16).padStart(2,"0")).join("")}.${ca(t)}`}function da(n,t){let e="";for(let o=0;o<n.length;o+=32768)e+=String.fromCharCode(...n.subarray(o,o+32768));return`data:${t};base64,${btoa(e)}`}function ha(){let n="";try{n=getComputedStyle(document.documentElement).getPropertyValue("--b3-theme-primary").trim()}catch{return null}return n&&/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(n)?n:null}function fa(n){const t=String(n??"");if(!/^\d{8}(\d{6})?$/.test(t))return 0;const e=Number(t.slice(0,4)),i=Number(t.slice(4,6)),o=Number(t.slice(6,8)),s=t.length>=12?Number(t.slice(8,10)):0,a=t.length>=12?Number(t.slice(10,12)):0,r=t.length>=14?Number(t.slice(12,14)):0,d=new Date(e,i-1,o,s,a,r).getTime();return Number.isFinite(d)?d:0}function ua(n){if(typeof n!="string"||n==="")return 0;let t;try{t=JSON.parse(n)}catch{return 0}const e=t?.blocks;if(!e||typeof e!="object")return 0;const i=new Set;for(const o of Object.values(e)){const s=o?.root_id;typeof s=="string"&&s&&i.add(s)}return i.size}function pa(n){return{docId:n.id,title:n.content||p("无标题"),hpath:n.hpath||"",svg:n.svg||"",updated:fa(n.updated),refs:ua(n.refs)}}function ga(n,t){const e=new Map(t.map(i=>[C(i.svg),i]));return n.map(i=>{const o=C(i.path),s=e.get(o);return{dataPath:o,name:B(i.path),docId:s?.docId??"",docTitle:s?.title??"",updated:i.updated}})}function Pe(n){return n.docTitle||n.name.replace(/\.svg$/i,"")}function ma(n,t){return n.map(e=>`${e.dataPath}\0${e.name}\0${e.docId}\0${e.docTitle}\0${e.updated}\0${t.has(e.dataPath)?1:0}`).join("")}function ya(n,t){let e=String(n??"").trim().replace(/\\/g,"/").replace(/\/+$/,"");e!==""&&!e.startsWith("/")&&(e=`/${e}`);const i=String(t??"").trim()||p("未命名白板");return`${e}/${i}`}function Pn(n){return`![[${n}]]`}function ba(n){return String(n??"").replace(/["\r\n]/g," ").replace(/\s+/g," ").trim()}function xa(n,t){return`((${n} "${ba(t)}"))`}function wa(n){return{svgPath:n.dataPath,bakPaths:Ni(n.dataPath),doc:n.docId?{id:n.docId,title:n.docTitle}:null}}function ka(n){if(typeof n!="string")return null;const t=/^siyuan:(?:\/\/)?doc\/([A-Za-z0-9-]{10,})$/.exec(n.trim());return t?t[1]??null:null}const Sa="application/x-siyuan-excali-board";function va(n){return n.split("/").map(t=>{try{return decodeURIComponent(t)}catch{return t}}).join("/")}function Ea(n){const t=String(n??"").trim().replace(/\\/g,"/");if(t==="")return null;const e=H(C(t));return!/\.svg$/i.test(e)||Xe(e)||e.split("/").some(i=>i===".."||i==="")?null:e}function _a(n){if(typeof n!="string")return null;const t=n.trim(),e=/^siyuan:(?:\/\/)?excali\/(.+)$/.exec(t);return e?Ea(va(e[1]??"")):null}function Aa(n){const t=_a(n);return t?C(t):null}const $t="assets";function Ma(n){return/^excali-\d{8}-\d{6}\.svg$/i.test(n)}function $a(n){const t=C(n).replace(/^\/data\//,""),e=t.lastIndexOf("/");return e<0?"":t.slice(0,e)}function Ia(n,t){return $a(n)===t.replace(/^\/+|\/+$/g,"")}function Ca(n,t=$t){const e=t.replace(/^\/+|\/+$/g,""),i=[],o=new Set;for(const s of[...n.recent,...n.registry,...n.docSvgs,...n.autoNamed]){if(typeof s!="string"||!/\.svg$/i.test(s)||Xe(s))continue;const a=C(s);!Ia(a,e)||o.has(a)||(o.add(a),i.push(a))}return i}function Ta(n,t){const e=[],i=new Set;for(const o of n){const s=C(o),a=t.get(s)??s;i.has(a)||(i.add(a),e.push(a))}return e}let te=null;function Ra(n){n.eventBus.on("switch-protyle",({detail:t})=>{te=t.protyle}),n.eventBus.on("click-editorcontent",({detail:t})=>{te=t.protyle})}function Fi(){if(te?.wysiwyg?.element?.isConnected)return te;const n=$.getAllEditor();for(let t=n.length-1;t>=0;t--){const e=n[t].protyle;if(e?.wysiwyg?.element?.isConnected)return e}return null}function ji(n){return n.replace(/'/g,"''")}async function it(n,t){const e=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),i=await e.json().catch(()=>null);if(!e.ok||!i||i.code!==0)throw new Error(i?.msg||`${n} HTTP ${e.status}`);return i}async function La(n,t,e){const o=(await it("/api/filetree/createDocWithMd",{notebook:n,path:t,markdown:e})).data;if(!o?.blockID)throw new Error("createDocWithMd 未返回 blockID");return o.blockID}async function Ye(n){const t=await it("/api/query/sql",{stmt:n});return Array.isArray(t.data)?t.data:[]}async function Da(n,t,e){const i=`![${e}](${t})`;return(await it("/api/block/appendBlock",{dataType:"markdown",data:i,parentID:n})).data?.[0]?.doOperations?.find(a=>a.action==="insert")?.id??""}async function Ee(n,t){await it("/api/attr/setBlockAttrs",{id:n,attrs:t})}async function On(n,t){if(!n||!t||n===t)return 0;const e=`%${n.replace(/[\\%_]/g,"\\$&")}%`,i=await Ye(`SELECT id FROM blocks WHERE content LIKE '${ji(e)}' ESCAPE '\\'`);let o=0;for(const s of i)try{const r=(await it("/api/block/getBlockKramdown",{id:s.id})).data?.kramdown;if(typeof r!="string"||!r.includes(n))continue;await it("/api/block/updateBlock",{id:s.id,dataType:"markdown",data:r.split(n).join(t)}),o++}catch(a){console.warn("[excali-studio] 更新资源引用失败（忽略）",s.id,a)}return o}async function Pa(n){await it("/api/filetree/removeDoc",{id:n})}async function Oa(){const t=Fi()?.block?.rootID;return t&&(await Ye(`SELECT box FROM blocks WHERE id = '${ji(t)}' LIMIT 1`))[0]?.box||null}async function Bn(){return(await Ye(`SELECT b.id, b.content, b.hpath, b.updated, a.value AS svg
     FROM blocks b
     INNER JOIN attributes a ON a.block_id = b.id AND a.name = 'custom-excali-svg'
     WHERE b.type = 'd'
     ORDER BY b.updated DESC`)).map(t=>({id:t.id,content:t.content||"",hpath:t.hpath||"",updated:Number(t.updated)||0,refs:"",svg:typeof t.svg=="string"?t.svg:""}))}async function Ba(n){const e=(await it("/api/attr/getBlockAttrs",{id:n})).data?.attrs;return e&&typeof e=="object"?e:{}}async function Na(){const t=(await it("/api/notebook?listNotebooks",{})).data,e=Array.isArray(t)?t.find(i=>typeof i?.id=="string"&&i.id!==""):void 0;return typeof e?.id=="string"?e.id:null}function _e(n){const t=ea(n);let e=0;return document.querySelectorAll("img").forEach(i=>{let o;try{o=new URL(i.src,location.href)}catch{return}decodeURIComponent(o.pathname)===t&&(o.searchParams.set("t",String(Date.now())),i.src=o.href,e++)}),e}function Fa(n){let t;try{t=new URL(n,location.href)}catch{return null}const e=decodeURIComponent(t.pathname);return e.startsWith("/assets/")?ta(e.replace(/^\/+/,"")):null}function ja(n){for(const t of n){const e=t.tagName==="IMG"?t:t.querySelector("img");if(!e)continue;const i=Fa(e.getAttribute("src")||e.dataset.src||"");if(i&&/\.svg$/i.test(i))return i}return null}function Hi(n,t=new Date){if(!n)return"";const e=new Date(n),i=d=>String(d).padStart(2,"0"),o=`${i(e.getHours())}:${i(e.getMinutes())}`,s=d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;if(s(e)===s(t))return`${p("今天")} ${o}`;const a=new Date(t);if(a.setDate(t.getDate()-1),s(e)===s(a))return`${p("昨天")} ${o}`;const r=`${i(e.getMonth()+1)}-${i(e.getDate())}`;return e.getFullYear()===t.getFullYear()?`${r} ${o}`:`${e.getFullYear()}-${r}`}function Ha(n,t){const e=t.trim().toLowerCase();return e===""?n:n.filter(i=>B(i.path).toLowerCase().includes(e))}const za={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function Ae(n){return n.replace(/[&<>"']/g,t=>za[t])}function Xa(n,t){return new Promise(e=>{let i=!1,o=!1,s,a=n,r=-1;const d=m=>{i||(i=!0,s!==void 0&&window.clearTimeout(s),c.destroy(),e(m))},c=new $.Dialog({title:p("打开白板…"),width:"520px",content:`<div class="exs-picker">
  <input class="b3-text-field fn__block exs-picker__search" placeholder="${p("搜索文件名…")}" />
  <div class="exs-picker__list b3-list b3-list--background"></div>
</div>`,destroyCallback:()=>d(null)}),l=c.element.querySelector(".exs-picker__search"),g=c.element.querySelector(".exs-picker__list"),h=()=>{if(a.length===0){g.innerHTML=`<div class="exs-picker__empty">${p("没有匹配的白板")}</div>`;return}g.innerHTML=a.map((m,b)=>{const y=`b3-list-item exs-picker__item${b===r?" b3-list-item--focus":""}`,x=t.has(C(m.path))?`<span class="exs-picker__badge">${p("已打开")}</span>`:"",k=Hi(m.updated),S=x||k?`<span class="b3-list-item__meta">${x}${Ae(k)}</span>`:"";return`<div class="${y}" data-idx="${b}" title="${Ae(m.path)}"><span class="b3-list-item__text">${Ae(B(m.path))}</span>${S}</div>`}).join("")},f=m=>{const b=a[m];b&&d(b.path)},u=m=>{a.length!==0&&(r=r<0?m>0?0:a.length-1:(r+m+a.length)%a.length,h(),g.querySelector(".b3-list-item--focus")?.scrollIntoView({block:"nearest"}))},w=()=>{s!==void 0&&window.clearTimeout(s),s=window.setTimeout(()=>{s=void 0,a=Ha(n,l.value),r=-1,h()},120)};l.addEventListener("compositionstart",()=>{o=!0}),l.addEventListener("compositionend",()=>{o=!1,w()}),l.addEventListener("input",()=>{o||w()}),l.addEventListener("keydown",m=>{m.isComposing||m.keyCode===229||(m.key==="ArrowDown"?(m.preventDefault(),u(1)):m.key==="ArrowUp"?(m.preventDefault(),u(-1)):m.key==="Enter"?(m.preventDefault(),f(r>=0?r:0)):m.key==="Escape"&&(m.preventDefault(),d(null)))}),g.addEventListener("click",m=>{const b=m.target?.closest(".exs-picker__item");b&&f(Number(b.dataset.idx))}),l.focus(),h()})}const Ua={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},jt=n=>n.replace(/[&<>"']/g,t=>Ua[t]);function Ya(n){const t=document.createElement("div");t.className="exs-dock",t.innerHTML=`
  <div class="block__icons exs-dock__head">
    <div class="block__logo fn__flex-1"><span class="fn__ellipsis">${p("白板库")}</span><span class="exs-dock__count" data-role="libcount"></span></div>
    <span class="fn__space"></span>
    <button class="block__icon block__icon--show ariaLabel" data-act="new" aria-label="${p("新建白板")}" data-position="north" title="${p("新建白板")}" type="button"><svg aria-hidden="true" focusable="false"><use xlink:href="#iconAdd"></use></svg></button>
    <button class="block__icon block__icon--show ariaLabel" data-act="delete-active" data-role="del-active" aria-label="${p("删除当前白板")}" data-position="north" title="${p("删除当前白板")}" type="button" disabled><svg aria-hidden="true" focusable="false"><use xlink:href="#iconTrashcan"></use></svg></button>
    <button class="block__icon block__icon--show ariaLabel" data-act="lib-refresh" aria-label="${p("刷新")}" data-position="north" title="${p("刷新")}" type="button"><svg aria-hidden="true" focusable="false"><use xlink:href="#iconRefresh"></use></svg></button>
  </div>
  <ul class="b3-list b3-list--background exs-dock__liblist" data-role="liblist"></ul>`;const e=t.querySelector('[data-role="libcount"]'),i=t.querySelector('[data-role="liblist"]'),o=t.querySelector('[data-role="del-active"]');let s="",a=[];const r=()=>{const l=n.getBoardFiles(),g=ma(l.files,l.opened);if(g!==s){if(s=g,a=l.files,e.textContent=l.files.length>0?String(l.files.length):"",l.files.length===0){i.innerHTML=`<li class="exs-lib__hint">${p("还没有白板")}</li>`;return}i.innerHTML=l.files.map(h=>{const f=l.opened.has(h.dataPath),u=h.docId!=="",w=Hi(h.updated),m=(f?`<span class="exs-lib__badge">${p("已打开")}</span>`:"")+(u?`<span class="exs-lib__badge exs-lib__badge--doc">${p("已建档")}</span>`:"");return`<li class="b3-list-item b3-list-item--narrow b3-list-item--hide-action exs-lib__item${f?" is-open":""}" data-file="${jt(h.dataPath)}" title="${jt(h.dataPath)}" draggable="true">
          <button class="b3-list-item__text exs-lib__text" type="button">${jt(Pe(h))}</button>${m}
          <span class="fn__space"></span>
          <span class="exs-lib__meta">${jt(w)}</span>
          <button class="b3-list-item__action b3-tooltips b3-tooltips__w" data-act="row-rename" title="${p("重命名")}" type="button"><svg aria-hidden="true"><use xlink:href="#iconEdit"></use></svg></button>
          <button class="b3-list-item__action b3-tooltips b3-tooltips__w exs-lib__act--danger" data-act="row-delete" title="${p("删除…")}" type="button"><svg aria-hidden="true"><use xlink:href="#iconTrashcan"></use></svg></button>
        </li>`}).join("")}},d=()=>{r(),o.disabled=!n.hasActiveBoard()},c=l=>{const g=l.closest(".exs-lib__item");return g?a.find(f=>f.dataPath===g.dataset.file):void 0};return t.addEventListener("click",l=>{const g=l.target,h=g.closest("[data-act]");if(h&&!h.disabled)switch(h.dataset.act){case"new":n.openNew();return;case"delete-active":n.deleteActiveBoard();return;case"lib-refresh":n.refreshBoardLib();return;case"row-rename":{const u=c(h);u&&n.renameBoardFile(u);return}case"row-delete":{const u=c(h);u&&n.deleteBoardFile(u);return}}const f=g.closest(".exs-lib__item");if(f){const u=a.find(w=>w.dataPath===f.dataset.file);u&&n.openBoardFile(u)}}),t.addEventListener("dblclick",l=>{const g=l.target.closest(".exs-lib__item");if(!g)return;const h=a.find(f=>f.dataPath===g.dataset.file)?.docId;h&&n.openDocOf(h)}),t.addEventListener("dragstart",l=>{const g=l.target.closest(".exs-lib__item");if(!g)return;const h=a.find(w=>w.dataPath===g.dataset.file),f=l.dataTransfer;if(!h||!f)return;const u=H(h.dataPath);f.effectAllowed="copy",f.setData("text/plain",u),f.setData(Sa,JSON.stringify({ref:u,title:Pe(h)}))}),t.addEventListener("contextmenu",l=>{const g=l.target.closest(".exs-lib__item");if(!g)return;const h=a.find(f=>f.dataPath===g.dataset.file);h&&(l.preventDefault(),n.openFileMenu(h,l.clientX,l.clientY))}),n.onRefresh(d),d(),{element:t,refresh:d}}const Ht="0.3.0",Nn="excali-studio-version";function Ga(n,t){const e=t.trim();if(!e)return"unknown-version";const i=(typeof n=="string"?n:"").trim();return i?i===e?"up-to-date":"show":"first-install"}function Wa(n){return`/data/plugins/${n}/CHANGELOG.md`}const Za={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function qa(n){return n.replace(/[&<>"']/g,t=>Za[t])}function Ka(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}async function Ja(n){const t=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:n})});if(!t.ok)throw new Error(`getFile HTTP ${t.status}`);const e=await t.text();if((t.headers.get("content-type")||"").includes("application/json")||/"code"\s*:\s*404/.test(e))throw new Error(`getFile 读不到文件：${n}`);return e}function Va(n,t){const e=t.trim();if(!e)return"";const i=new RegExp(`^##\\s+v?${Ka(e)}(?![0-9.])`,"m").exec(n);if(!i)return"";const o=(()=>{const c=n.indexOf(`
`,i.index);return c<0?n.length:c+1})(),a=n.slice(o).search(/^##[ \t]/m),r=a<0?n.length:o+a;return n.slice(i.index,r).replace(/\s+$/,"").replace(/\n-{3,}$/,"").replace(/\s+$/,"")}function Qa(n){const t=globalThis.Lute;if(t?.New)try{const e=t.New().Md2HTML?.(n);if(e)return e}catch{}return`<pre class="exs-changelog__plain">${qa(n)}</pre>`}function tr(n){const t=[];let e=!1;for(const i of(n||"").split(/\r?\n/)){if(/^\s*```/.test(i)){e=!e;continue}if(e)continue;const o=i.match(/^(#{1,6})\s+(.+?)\s*$/);o&&t.push({level:o[1].length,text:o[2]})}return t}function er(n){const t=(n||"").split(/\r?\n/);let e=-1;for(let o=0;o<t.length;o++)if(/^\s*\|.*\|\s*$/.test(t[o])){e=o;break}if(e<0)return null;const i=[];for(let o=e;o<t.length;o++){const s=t[o];if(!/^\s*\|.*\|\s*$/.test(s))break;const a=s.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(r=>r.trim());a.every(r=>/^:?-{2,}:?$/.test(r))||i.push(a)}return i.length===0?null:{headers:i[0],rows:i.slice(1)}}function nr(n){const t=(n||"").split(/\r?\n/),e=[],i=[];for(const o of t){const s=o.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+?)\s*$/);if(!s){if(o.trim()===""||i.length===0)continue;continue}const a=Math.floor(s[1].replace(/\t/g,"  ").length/2),r={text:s[2],depth:a,children:[]};for(;i.length>a+1;)i.pop();if(a===0||i.length===0){if(a>0&&e.length===0){e.push(r),i.length=0,i.push(r);continue}e.push(r),i.length=0,i.push(r)}else(i[a-1]??i[i.length-1]).children.push(r),i[a]=r}return e}function ir(n){const t=(n||"").match(/```[a-zA-Z0-9]*\r?\n([\s\S]*?)```/);return t?t[1]:null}function sr(n){const t=(n||"").match(/^#\s+(.+?)\s*$/m)?.[1]??"",e=/@excalidraw-onload/.test(n||""),i=(ir(n)??(n||"").replace(/^#.*$/gm,"").replace(/@excalidraw-onload/g,"")).trim(),s=((n||"").split(/```/)[0]??"").split(`
`).filter(a=>!/^#\s/.test(a)&&!a.includes("@excalidraw-onload")).join(" ").replace(/\s+/g," ").trim();return{title:t,onload:e,code:i,description:s}}const Z="assets/excali-scripts",or=50,Mt={"text-numbering.md":[{key:"format",label:p("默认编号格式"),type:"select",default:"1",options:[{value:"1",label:p("数字（1. 2. 3.）")},{value:"2",label:p("罗马大写（I. II. III.）")},{value:"3",label:p("罗马小写（i. ii. iii.）")},{value:"4",label:p("字母大写（A. B. C.）")},{value:"5",label:p("字母小写（a. b. c.）")},{value:"6",label:p("无序列表（• • •）")}]}],"box-selection.md":[{key:"padding",label:p("外框边距（像素）"),type:"number",default:20,min:0,max:200}]};async function zi(n){const t=await fetch("/api/file/readDir",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:C(n)})}),e=await t.json().catch(()=>null);return!t.ok||!e||e.code!==0?[]:Array.isArray(e.data)?e.data.filter(i=>i&&i.isDir!==!0&&typeof i.name=="string").map(i=>i.name):[]}async function Oe(n){const t=await q(C(n));return sr(t)}async function zt(){let n=[];try{n=await zi(Z)}catch{return[]}const t=[];for(const e of n.filter(i=>/\.md$/i.test(i)).sort().slice(0,or)){const i=`${Z}/${e}`;try{const o=await Oe(i);t.push({path:i,name:e,title:o.title||e.replace(/\.md$/i,""),description:o.description,onload:o.onload,builtin:$r.has(e)})}catch{}}return t}async function Xi(n){const t=new FormData;t.append("path",C(n)),t.append("isDir","true"),await fetch("/api/file/putFile",{method:"POST",body:t}).catch(()=>{})}async function ar(){let n=[];try{n=await zi(Z)}catch{n=[]}const t=Pt.filter(i=>!n.includes(i.file));if(t.length===0)return 0;await Xi(Z);let e=0;for(const i of t)try{await wt(C(`${Z}/${i.file}`),i.content),e++}catch(o){console.warn("[excali-studio] 内置脚本写入失败",i.file,o)}return e}async function Ui(){const n=[];for(const t of Pt)try{(await q(C(`${Z}/${t.file}`))).trim()!==t.content.trim()&&n.push(t.file)}catch{}return n}async function rr(){const n=new Set(await Ui());if(n.size===0)return 0;await Xi(Z);let t=0;for(const e of Pt)if(n.has(e.file))try{await wt(C(`${Z}/${e.file}`),e.content),t++}catch(i){console.warn("[excali-studio] 内置脚本重置失败",e.file,i)}return t}function Me(n){let t=5381;for(let e=0;e<n.length;e++)t=t*33^n.charCodeAt(e);return t>>>0}async function cr(n){const t={...n},e=[],i=[];for(const o of Pt){let s;try{s=await q(C(`${Z}/${o.file}`))}catch{continue}if(s.trim()===o.content.trim()){t[o.file]=Me(s);continue}const a=t[o.file];if(a===void 0||a===Me(s))try{await wt(C(`${Z}/${o.file}`),o.content),t[o.file]=Me(o.content),e.push(o.file)}catch(r){console.warn("[excali-studio] 内置脚本自动更新失败",o.file,r),i.push(o.file)}else i.push(o.file)}return{updated:e,drifted:i,snapshot:t}}const lr=`# 笔记标题 → 思维导图

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
`,dr=`# Markdown 表格 → 渲染表格

把 Markdown 表格直接画成画布上的渲染表格（表头浅蓝底、单元格白底、
列宽按内容自适应、长释义自动撑高行）。两种来源二选一：

① 画布上选中含竖线的文本元素（粘贴的 Markdown 表格草稿）→ 跑本脚本，
   原地生成表格并**替换掉原文本**（误删可 Ctrl+Z 撤回）；
② 不选中任何东西 → 读当前打开文档的第一个 Markdown 表格。

\`\`\`js
// 来源①：画布选中的文本元素（含竖线才算 Markdown 表格草稿）
const sourceIds = ea.getSelectedElements();
const consumed = sourceIds
  .map((id) => ea.getElement(id))
  .filter((el) => el && el.type === "text" && typeof el.text === "string" && el.text.includes("|"));
const selTexts = consumed.map((el) => el.text);
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
  const originEl = fromCanvas ? consumed[0] : null;
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
    ea.deleteElements(consumed.map((el) => el.id)); // 原文本已被表格取代（只删吃掉的草稿，同选的其它元素不动）
    ea.notify("表格已生成（原文本已删，误删可 Ctrl+Z 撤回）");
  } else {
    ea.notify("表格已生成");
  }
  ea.selectElements(ids);
  ea.zoomToFit();
}
\`\`\`
`,hr=`# 缩进列表 → 流程图

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
`,fr=`# 批量导入图片

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
`,ur=`# 对齐与分布

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
`,pr=`# 序号标注

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
`,gr=`# 智能连线

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
`,mr=`# 任务清单 → 三列看板

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
`,yr=`# 导出分步图

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
`,br=`# 重复补间（选中 2 个）

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
`,xr=`# 选区加外框

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
`,wr=`# 统一尺寸（选中 2 个以上）

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
`,kr=`# 反转箭头

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
`,Sr=`# 形状互转

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
`,vr=`# 文字编号（按选择顺序）

给选中的文字前面加序号——1. 2. 3. / I. II. III. / A. B. C. / • 列表都行。
**直接点按钮** = 按脚本库 ⚙ 设置里的格式编号（默认数字）；选中的文字全都带编号时再点一次 = 全部去掉编号；
**按住 Shift 点按钮** = 弹出格式菜单自选（预勾选当前默认格式，点空白 = 不动）；
用 Shift 逐个点选文字，点选顺序就是编号顺序（拖框选择不保证顺序）。

\`\`\`js
const PREFIX_RE = /^\\s*(?:(\\d{1,3}|[IVXLCDM]+|[ivxlcdm]+|[A-Za-z])[.、)．:：]|[•◦‣▪·])\\s*/;
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
      { value: "6", label: "无序列表", hint: "• • •" },
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
  fmt = [1, 2, 3, 4, 5, 6].includes(parsed) ? parsed : 1;
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
  fmt === 6 ? "•" :
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
`,Er=`# 荧光笔

把笔刷切到荧光笔并进入手绘工具，之后直接在画布上拖拽就行——对标 Obsidian Excalidraw
的 Highlighter tool。

颜色 / 粗细 / 透明度读的是插件设置里那一份，和右缘竖条色板**同一个配置**（在色板改完
这里立刻跟着变）。脚本侧刻意不带参数：两处各存一套迟早打架，竖向色板是唯一的调色入口。

\`\`\`js
ea.highlighter();
const p = ea.getPen();
ea.notify("荧光笔：" + p.color + " · 约 " + Math.round(p.width * 4.25) + "px · " + p.opacity + "%");
\`\`\`
`,_r=`# 素材配方（改色 / 重新生成）

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
`,Ar=`# 选区折叠为列表

把框选的一批元素折成一条「列表项」：**最上面的文本当折叠头**，其余整体收进它的
自定义字段，画布上只剩头 + 头左侧的圆点控制钮。点头（圆点）= 收起 / 展开，
带淡入淡出动画；每一步都能 ⌘Z 撤销，存盘后折叠状态不丢。

三种跑法（同一个按钮，脚本自己看状态分流）：
1. **折叠**：框选「头 + 所有下属元素」→ 跑一次 → 成员收进头，只剩头 + 圆点；
2. **恢复原样**：选中折叠头（单选它就够，不用再框选下属）→ 再跑一次 →
   快照成员全部回到画布、头上的折叠字段被清除——和折叠前一模一样，圆点也消失；
   画布上只有一个折叠时，不选任何东西直接点按钮也行（按钮即开关）；
3. **日常收放**：之后不再用脚本，点头部左侧圆点即可（收起/展开切换，带动画）。

与「画框折叠」的分工：那个把元素收进画框（frame，整块场景收放）；本脚本把元素
收进普通文本（列表收放，不占画布结构）。两者可同时用。

已知边界（演示版）：成员还原后 z 序置顶（列表元素不重叠，无感）；成员自带的
自定义字段（如素材配方）不保留——普通元素无损。解散时快照里已在画布上的成员
不会重复插入（防同 id 两个元素）。

\`\`\`js
const ids = ea.getSelectedElements();
let els = ids.map((id) => ea.getElement(id)).filter((e) => e && e.isDeleted !== true);
const allHeads = ea.getElements().filter(
  (e) => e.excaliToggle && typeof e.excaliToggle.collapsed === "boolean" && e.isDeleted !== true,
);
// 没选区也允许「再点一次」：画布上恰好只有一个折叠时，它就是这次的目标
if (els.length === 0 && allHeads.length === 1) els = allHeads.slice();

// ① 消除模式：选区里已有折叠头（折叠态或展开态都算）→ 解散，恢复原样
const heads = els.filter(
  (e) => e.excaliToggle && typeof e.excaliToggle.collapsed === "boolean",
);
if (heads.length > 0) {
  const alive = new Set(ea.getElements().map((e) => e.id));
  let restored = 0;
  for (const h of heads) {
    const snap = h.excaliToggle;
    if (snap.collapsed && Array.isArray(snap.elements)) {
      // 折叠态：快照成员回场（已在场的不重复加，防同 id 两元素）
      const missing = snap.elements.filter((m) => !alive.has(m.id));
      if (missing.length > 0) ea.addElements(missing);
      restored += missing.length;
    }
    // 展开态的成员本就在画布上，只差清字段。undefined：内存里即时失效，
    // 存盘时 JSON.stringify 直接丢掉这个键——完全无痕
    ea.setStyle([h.id], { excaliToggle: undefined });
  }
  ea.notify(
    "已恢复原样：" + heads.length + " 个折叠已消除" +
      (restored > 0 ? "，" + restored + " 个成员回到画布" : "（成员已在画布上）"),
  );
} else if (els.length < 2) {
  ea.notify(
    allHeads.length > 1
      ? "画布上有 " + allHeads.length + " 个折叠：先选中要恢复的那个折叠头（单选即可），再跑一次"
      : "先框选至少 2 个元素：最上面的当折叠头，其余收进它",
  );
} else {
  // ② 折叠模式：最上的文本当头，其余收进快照后删除（先存后删防数据丢失）
  els.sort((a, b) => a.y - b.y || a.x - b.x);
  const head = els.find((e) => e.type === "text") ?? els[0];
  const members = els.filter((e) => e.id !== head.id);
  ea.setStyle([head.id], {
    excaliToggle: {
      collapsed: true,
      elements: members.map((m) => JSON.parse(JSON.stringify(m))),
    },
  });
  ea.deleteElements(members.map((m) => m.id));
  const label = typeof head.text === "string" && head.text.trim() ? head.text.trim().slice(0, 12) : "元素";
  ea.notify("已把 " + members.length + " 个元素收进「" + label + "」，点头部左侧圆点展开 / 收起；再跑一次本脚本可恢复原样");
}
\`\`\`
`,Mr=`# 画框折叠 / 展开

选中一个画框（frame）后运行。**折叠** = 把框内元素整体收进画框的
自定义字段、画框缩成标签条；**展开** = 原样还原。可反复切换，
每一步都进撤销栈（⌘Z 可退），存盘后折叠状态不丢（成员在快照里）。

机制：快照 \`excaliCollapsed\` 挂在画框元素上（引擎 restore 的
\`...element\` 展开保证自定义字段往返存活），成员以绝对坐标深拷贝，
展开时按画框位移量整体平移归位、并重新挂回画框（frameId）。

已知边界（演示版）：成员还原后 frameId 会补挂，但自带自定义字段
（如素材配方 excaliRecipe）或绑定关系（绑定文字/箭头 boundElements）
不保留——普通元素无损。

\`\`\`js
const sel = ea.getSelectedElements().map((id) => ea.getElement(id)).filter(Boolean);
const frame = sel.find((e) => e.type === "frame");
if (!frame) {
  ea.notify("请先选中一个画框：点画框的边框/标签选中它（不要点进框内空白）");
} else {
  const snap = frame.excaliCollapsed;
  if (snap && Array.isArray(snap.elements) && snap.elements.length > 0) {
    // ---------- 展开 ----------
    const dx = frame.x - (snap.fx ?? frame.x);
    const dy = frame.y - (snap.fy ?? frame.y);
    ea.addElements(
      snap.elements.map((e) => ({ ...e, frameId: frame.id, x: e.x + dx, y: e.y + dy })),
    );
    ea.setStyle([frame.id], {
      excaliCollapsed: null,
      width: snap.fw ?? frame.width,
      height: snap.fh ?? frame.height,
      name: snap.name ?? null,
    });
    ea.notify("已展开 " + snap.elements.length + " 个元素归位");
  } else {
    // ---------- 折叠 ----------
    const members = ea
      .getElements()
      .filter((e) => e.frameId === frame.id && e.id !== frame.id && e.isDeleted !== true);
    if (members.length === 0) {
      ea.notify("这个画框是空的：往里拖元素（或框选后建组）才会归框");
    } else {
      // 必须先存快照再删成员——反了的话中途失败就是数据丢失
      const payload = {
        name: frame.name ?? null,
        fw: frame.width,
        fh: frame.height,
        fx: frame.x,
        fy: frame.y,
        elements: JSON.parse(JSON.stringify(members)),
      };
      ea.setStyle([frame.id], {
        excaliCollapsed: payload,
        height: 44,
        name: (frame.name || "画框") + "（" + members.length + "）",
      });
      ea.deleteElements(members.map((e) => e.id));
      ea.notify(
        "已折叠 " + members.length + " 个元素，画框缩成标签条；再跑一次还原",
      );
    }
  }
}
\`\`\`
`,Pt=[{file:"mindmap-from-headings.md",content:lr},{file:"table-from-markdown.md",content:dr},{file:"flowchart-from-list.md",content:hr},{file:"batch-import-images.md",content:fr},{file:"align-and-distribute.md",content:ur},{file:"number-badges.md",content:pr},{file:"smart-connect.md",content:gr},{file:"kanban-from-list.md",content:mr},{file:"export-steps.md",content:yr},{file:"repeat-tween.md",content:br},{file:"box-selection.md",content:xr},{file:"uniform-size.md",content:wr},{file:"reverse-arrows.md",content:kr},{file:"change-shape.md",content:Sr},{file:"text-numbering.md",content:vr},{file:"highlighter.md",content:Er},{file:"material-recipe.md",content:_r},{file:"selection-fold.md",content:Ar},{file:"frame-collapse.md",content:Mr}],$r=new Set(Pt.map(n=>n.file));async function Fn(n,t,e){const i=[],o=r=>(...d)=>{try{i.push(`[${r}] ${d.map(c=>typeof c=="string"?c:JSON.stringify(c)).join(" ")}`)}catch{i.push(`[${r}] <无法序列化的输出>`)}},s={log:o("log"),warn:o("warn"),error:o("error"),info:o("log"),debug:o("log")},a=Date.now();try{return await new Function("ea","utils","console",`"use strict";
return (async () => {
${n}
})();`)(t,e,s),{ok:!0,logs:i,durationMs:Date.now()-a}}catch(r){const d=r instanceof Error?`${r.message}
${r.stack??""}`:String(r);return{ok:!1,logs:i,error:d,durationMs:Date.now()-a}}}let jn=0;function Be(n="ea"){return jn+=1,`${n}-${Date.now().toString(36)}-${jn.toString(36)}`}function dt(n,t){let e=0;for(const i of n)e+=/[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(i)?1:.56;return Math.ceil(e*t)}function Ir(n){let t=n.x,e=n.y,i=n.x+n.width,o=n.y+n.height;if(n.points&&n.points.length>0){t=e=1/0,i=o=-1/0;for(const[a,r]of n.points)t=Math.min(t,n.x+a),e=Math.min(e,n.y+r),i=Math.max(i,n.x+a),o=Math.max(o,n.y+r)}const s=n.angle??0;if(s!==0){const a=(t+i)/2,r=(e+o)/2,d=Math.cos(s),c=Math.sin(s),l=[[t,e],[i,e],[t,o],[i,o]];let g=1/0,h=1/0,f=-1/0,u=-1/0;for(const[w,m]of l){const b=w-a,y=m-r,x=a+b*d-y*c,k=r+b*c+y*d;g=Math.min(g,x),h=Math.min(h,k),f=Math.max(f,x),u=Math.max(u,k)}t=g,e=h,i=f,o=u}return{minX:t,minY:e,maxX:i,maxY:o,width:i-t,height:o-e,cx:(t+i)/2,cy:(e+o)/2}}function kt(n){if(n.length===0)return null;const t=n.map(Ir),e=Math.min(...t.map(a=>a.minX)),i=Math.min(...t.map(a=>a.minY)),o=Math.max(...t.map(a=>a.maxX)),s=Math.max(...t.map(a=>a.maxY));return{minX:e,minY:i,maxX:o,maxY:s,width:o-e,height:s-i,cx:(e+o)/2,cy:(i+s)/2}}function Hn(n,t){if((n.angle??0)!==0)return{x:n.x+n.width/2,y:n.y+n.height/2};switch(t){case"top":return{x:n.x+n.width/2,y:n.y};case"bottom":return{x:n.x+n.width/2,y:n.y+n.height};case"left":return{x:n.x,y:n.y+n.height/2};case"right":return{x:n.x+n.width,y:n.y+n.height/2}}}function Xt(n,t){const e=t.x+t.width/2-(n.x+n.width/2),i=t.y+t.height/2-(n.y+n.height/2);return Math.abs(e)>=Math.abs(i)?e>=0?"right":"left":i>=0?"bottom":"top"}function Yi(n,t,e){const i=/[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/,o=d=>i.test(d)?1:.56,s=d=>[...d].reduce((c,l)=>c+o(l),0),a=t/e,r=[];for(const d of n.split(`
`)){const c=d.match(/[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]|[^\s\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]+\s*|\s+/g)??[];let l="";const g=()=>{r.push(l.replace(/\s+$/,"")),l=""};for(const h of c){if(l===""&&/^\s+$/.test(h))continue;const f=h.replace(/\s+$/,"");if(l!==""&&s(l.replace(/\s+$/,""))+s(f)>a&&g(),s(f)<=a){l+=h;continue}for(const u of h)l===""&&/\s/.test(u)||(l!==""&&!/\s/.test(u)&&s(l)+o(u)>a&&g(),l+=u)}g()}return r}function zn(n,t,e="",i={}){const o=a=>n.addElements([a])[0]??"";return{addRect:a=>o({...a,type:"rectangle"}),addDiamond:a=>o({...a,type:"diamond"}),addEllipse:a=>o({...a,type:"ellipse"}),addArrow:a=>o({...a,type:"arrow"}),addLine:a=>o({...a,type:"line"}),addText:a=>o({...a,type:"text"}),addFrame:a=>o({...a,type:"frame"}),addImage:(a,r)=>n.addImage(a,r),getElements:()=>n.getElements(),getElement:a=>n.getElements().find(r=>r.id===a),addElements:a=>n.addElements(a.map(r=>({...r,type:r.type??"rectangle"}))),deleteElements:a=>n.deleteElements(a),clear:()=>n.clear(),selectElements:a=>n.selectElements(a),setStyle:(a,r)=>{const d=a==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):a;d.length!==0&&n.patchElements(d,r)},setText:(a,r)=>{const d=n.getElements().find(h=>h.id===a);if(!d||d.type!=="text")return;const c=d.fontSize??20,l=d.lineHeight??1.25,g=String(r).split(`
`);n.patchElements([a],{text:r,originalText:r,width:Math.max(1,...g.map(h=>dt(h,c))),height:Math.ceil(c*l*g.length)})},zoomToFit:()=>n.scrollToContent(),scrollToElement:a=>n.scrollToElement(a),getViewMode:()=>!!n.getAppState().viewModeEnabled,setViewMode:a=>n.setViewMode(a),getBackground:()=>n.getAppState().viewBackgroundColor??"",setBackground:a=>n.updateScene({viewBackgroundColor:a}),setLink:(a,r)=>{const d=a==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):a;d.length!==0&&n.patchElements(d,{link:r})},getLink:a=>{const r=n.getElements().find(d=>d.id===a);return r&&typeof r.link=="string"?r.link:null},exportSVG:(a,r)=>n.exportImage("svg",a,r),exportPNG:(a,r)=>n.exportImage("png",a,r),save:()=>t.save(),notify:a=>t.notify(a),getDocMarkdown:()=>t.getDocMarkdown(),getSelectedText:()=>t.getSelectedText(),listFiles:a=>t.listFiles(a),addImageFromFile:async(a,r)=>{const d=await t.readFileAsDataURL(a);return n.addImage(d,r)},settings:t.getSettings(),targetView:{getTitle:()=>"board"},getSelectedElements:()=>Object.keys(n.getAppState().selectedElementIds??{}),getBoundingBox:a=>{const r=a==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):a;if(r.length===0)return null;const d=new Set(r),c=n.getElements().filter(l=>d.has(l.id));return kt(c)},connectObjects:(a,r,d,c,l)=>n.connectObjects(a,r,d,c,l),group:a=>{if(a.length<2)return null;const r=Be("group");return n.patchElements(a,{groupIds:[r]}),r},unGroup:a=>{n.patchElements(a,{groupIds:[]})},toFront:a=>Xn(n,a,"front"),toBack:a=>Xn(n,a,"back"),setPosition:(a,r,d)=>n.patchElements([a],{x:r,y:d}),moveBy:(a,r,d)=>{const c=a==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):a;for(const l of c){const g=n.getElements().find(h=>h.id===l);g&&n.patchElements([l],{x:g.x+r,y:g.y+d})}},measureText:(a,r=20)=>({width:dt(a,r),height:Math.ceil(r*1.25)}),wrapText:(a,r,d=20)=>Yi(a,r,d),addEmbeddable:(a,r)=>n.addEmbeddable(a,r),addLibraryItem:a=>n.addLibraryItem(a),getTheme:()=>n.getTheme(),setTheme:a=>n.setTheme(a),getPen:()=>n.getPen(),setPen:a=>{const r=n.getPen(),d={color:a.color??r.color,width:a.width??r.width,opacity:a.opacity??r.opacity,roughness:a.roughness??r.roughness};n.applyPen({...Qt(d),roughness:d.roughness},a.tool)},highlighter:()=>n.applyPen({...t.getHighlighter(),roughness:Fo},"freedraw"),siyuan:{call:(a,r)=>t.siyuanCall(a,r??{})},getModifiers:()=>({shift:!!i.shift}),getScriptSetting:(a,r)=>{const d=t.getScriptSetting(e,a);return d===void 0?r:d},setScriptSetting:(a,r)=>t.setScriptSetting(e,a,r),utils:{uuid:()=>Be("uuid"),now:()=>Date.now(),parseHeadings:tr,parseList:nr,parseTable:er,inputPrompt:async(a,r="text",d="")=>await t.inputPrompt(a,r,d)??"",selectOption:a=>t.selectOption({...a,at:a.at??i.at})}}}function Xn(n,t,e){const i=[...n.getElements()].sort((d,c)=>String(d.index??"").localeCompare(String(c.index??"")));if(i.length===0)return;const o=new Set(t),s=i.filter(d=>o.has(d.id)),a=i.filter(d=>!o.has(d.id));if(s.length===0||a.length===0)return;(e==="front"?[...a,...s]:[...s,...a]).forEach((d,c)=>{const l=String(i[c].index??"");String(d.index??"")!==l&&n.patchElements([d.id],{index:l})})}const se={pencil:{background:"#fffdf7",ink:"#1e1e1e",fill:"#ffffff",edge:"#495057",muted:"#868e96",strokeWidth:2,roughness:1,fillStyle:"solid",strokeStyle:"solid",fontFamily:5,fontSizes:{title:28,node:16,edge:14,caption:14},nodeRoundness:{type:3}},marker:{background:"#ffffff",ink:"#1e1e1e",fill:"#ffec99",fillPalette:["#ffec99","#b2f2bb","#a5d8ff","#ffc9c9","#d0bfff","#ffd8a8","#c3fae8","#e9fac8"],edge:"#e03131",muted:"#868e96",strokeWidth:2,roughness:1,fillStyle:"solid",strokeStyle:"solid",fontFamily:5,fontSizes:{title:28,node:16,edge:14,caption:14},nodeRoundness:{type:3}},blueprint:{background:"#f8fbff",ink:"#1971c2",fill:"#e7f5ff",edge:"#1971c2",muted:"#4dabf7",strokeWidth:1,roughness:0,fillStyle:"solid",strokeStyle:"solid",fontFamily:3,fontSizes:{title:26,node:15,edge:13,caption:12},nodeRoundness:{type:3}}},Cr=Object.keys(se),ut=new Map,ee=new Map,Tr=8,Rr={hand:"pencil",handdrawn:"pencil","hand-drawn":"pencil",sketch:"pencil",ink:"pencil",color:"marker",colour:"marker",crayon:"marker",vivid:"marker",highlight:"marker",technical:"blueprint",line:"blueprint",wireframe:"blueprint",mono:"blueprint"};function St(n){return n.trim().toLowerCase().replace(/[\s_]+/g,"-").replace(/[^a-z0-9._-]/g,"").replace(/^-+|-+$/g,"")}function Lr(n){if(typeof n!="string")return null;const t=St(n);if(t in se)return t;const e=Rr[t];return e||(ut.has(t)?t:null)}function Dr(n){return St(n)in se||ut.has(St(n))}function Pr(n,t){ut.set(n,t),ee.clear()}function Or(){ut.clear(),ee.clear()}function Br(n){return ut.get(n)?.extendsFrom??null}function Gi(){return[...Cr,...[...ut.keys()].sort()]}function Wi(n,t){const e=ee.get(n);if(e)return e;const i=se[n];if(i)return i;const o=ut.get(n);if(!o)throw new Error(`style:unknown-style (${n})`);if(t.includes(n)||t.length>=Tr)throw new Error(`style:circular-extends (${[...t,n].join(" <- ")})`);const s=Wi(o.extendsFrom,[...t,n]),a=o.diff.fontSizes,r={...s,...o.diff,fontSizes:{title:a?.title??s.fontSizes.title,node:a?.node??s.fontSizes.node,edge:a?.edge??s.fontSizes.edge,caption:a?.caption??s.fontSizes.caption},...o.diff.space?{space:{...s.space,...o.diff.space}}:{},...o.diff.fillPalette?{fillPalette:o.diff.fillPalette.slice()}:{}};return ee.set(n,r),r}function oe(n){return Wi(n,[])}function Nr(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t>>>0}function Fr(n,t,e){const i=n.groupColor?.roles;if(n.groupColor?.mode==="roles"&&e&&i){const a=i[e]??i[e.toLowerCase()];if(a)return a}const o=n.fillPalette;if(!o||o.length===0)return n.fill;const s=e&&e!==""?`g:${e}`:`i:${t}`;return o[Nr(s)%o.length]}const ne={margin:20,bendPenalty:48,overlapPenalty:2,portPenalty:160},Ut=["top","right","bottom","left"],Un={top:[0,-1],right:[1,0],bottom:[0,1],left:[-1,0]},jr=[0,1,0,-1],Hr=[-1,0,1,0],P=.01;function ae(n,t){return{minX:n.x-t,minY:n.y-t,maxX:n.x+n.width+t,maxY:n.y+n.height+t}}function Yn(n,t){switch(t){case"top":return{x:n.x+n.width/2,y:n.y};case"bottom":return{x:n.x+n.width/2,y:n.y+n.height};case"left":return{x:n.x,y:n.y+n.height/2};case"right":return{x:n.x+n.width,y:n.y+n.height/2}}}function Gn(n){const t=[];for(const e of[...n].sort((i,o)=>i-o))(!t.length||e-t[t.length-1]>.5)&&t.push(e);return t}function Wn(n){const t=Gn(n),e=[];for(let i=0;i+1<t.length;i++)e.push((t[i]+t[i+1])/2);return Gn([...t,...e])}function Zi(n,t=ne.margin){const e=n.map(u=>ae(u,t)),i=Math.min(...e.map(u=>u.minX))-t,o=Math.max(...e.map(u=>u.maxX))+t,s=Math.min(...e.map(u=>u.minY))-t,a=Math.max(...e.map(u=>u.maxY))+t,r=Wn([i,o,...e.flatMap(u=>[u.minX,u.maxX]),...n.map(u=>u.x+u.width/2)]),d=Wn([s,a,...e.flatMap(u=>[u.minY,u.maxY]),...n.map(u=>u.y+u.height/2)]),c=r.length,l=d.length,g=new Uint8Array(c*l),h=new Uint8Array(c*l),f=new Uint8Array(c*l);for(const u of e){for(let w=0;w<l;w++){const m=d[w];if(m<u.minY-P||m>u.maxY+P)continue;const b=m>u.minY+P&&m<u.maxY-P;for(let y=0;y<c;y++){const x=r[y];if(x<u.minX-P||x>u.maxX+P)continue;const k=x>u.minX+P&&x<u.maxX-P,S=w*c+y;k&&b&&(g[S]=1),b&&y+1<c&&r[y+1]>u.minX+P&&x<u.maxX-P&&(h[S]=1),k&&w+1<l&&d[w+1]>u.minY+P&&m<u.maxY-P&&(f[S]=1)}for(let y=0;y+1<c;y++)b&&r[y]<=u.minX+P&&r[y+1]>u.minX+P&&(h[w*c+y]=1)}for(let w=0;w<c;w++){const m=r[w];if(m>u.minX+P&&m<u.maxX-P)for(let b=0;b+1<l;b++)d[b]<=u.minY+P&&d[b+1]>u.minY+P&&(f[b*c+w]=1)}}return{boxes:n,margin:t,xs:r,ys:d,blocked:g,hBlocked:h,vBlocked:f,hUse:new Uint16Array(c*l),vUse:new Uint16Array(c*l)}}class zr{constructor(){this.keys=[],this.values=[]}get size(){return this.keys.length}push(t,e){const i=this.keys,o=this.values;i.push(t),o.push(e);let s=i.length-1;for(;s>0;){const a=s-1>>1;if(i[a]<=i[s])break;[i[a],i[s]]=[i[s],i[a]],[o[a],o[s]]=[o[s],o[a]],s=a}}pop(){const t=this.keys,e=this.values,i=e[0],o=t.pop(),s=e.pop();if(t.length){t[0]=o,e[0]=s;let a=0;for(;;){const r=a*2+1,d=r+1;let c=a;if(r<t.length&&t[r]<t[c]&&(c=r),d<t.length&&t[d]<t[c]&&(c=d),c===a)break;[t[c],t[a]]=[t[a],t[c]],[e[c],e[a]]=[e[a],e[c]],a=c}}return i}}function Yt(n,t){let e=0,i=n.length-1;for(;e<=i;){const o=e+i>>1;if(Math.abs(n[o]-t)<.5)return o;n[o]<t?e=o+1:i=o-1}return-1}function Xr(n,t,e,i,o,s,a,r){const{xs:d,ys:c,blocked:l,hBlocked:g,vBlocked:h,hUse:f,vUse:u}=n,w=d.length,m=c.length,b=new Float64Array(w*m*4).fill(1/0),y=new Int32Array(w*m*4).fill(-1),x=new zr,k=(M,_)=>Math.abs(d[M]-d[o])+Math.abs(c[_]-c[s]),S=(e*w+t)*4+i;b[S]=0,x.push(k(t,e),S);let E=-1,v=1/0;for(;x.size;){const M=x.pop(),_=M&3,A=M>>2,T=A%w,O=(A-T)/w,D=b[M];if(D+k(T,O)>=v)break;if(T===o&&O===s){const R=D+(_===a?0:r.bendPenalty*(_===(a+2&3)?2:1));R<v&&(v=R,E=M);continue}for(let R=0;R<4;R++){if(R===(_+2&3))continue;const L=T+jr[R],j=O+Hr[R];if(L<0||j<0||L>=w||j>=m)continue;const J=j*w+L;if(l[J])continue;const U=R===1?A:R===3?J:R===2?A:J,st=R===1||R===3;if(st?g[U]:h[U])continue;const ot=Math.abs(st?d[L]-d[T]:c[j]-c[O]),ce=st?f[U]:u[U],_t=D+ot+(R===_?0:r.bendPenalty)+(ce?ot*r.overlapPenalty:0),pt=J*4+R;_t<b[pt]&&(b[pt]=_t,y[pt]=M,x.push(_t+k(L,j),pt))}}if(E<0)return null;const I=[];for(let M=E;M>=0;M=y[M]){const _=M>>2,A=_%w;I.push([A,(_-A)/w])}return I.reverse(),{cost:v,cells:I}}function Ur(n){const t=[];for(const e of n){const i=t[t.length-1];if(!(i&&Math.abs(i.x-e.x)<P&&Math.abs(i.y-e.y)<P))for(t.push(e);t.length>=3;){const[o,s,a]=t.slice(-3);if(!(Math.abs(o.x-s.x)<P&&Math.abs(s.x-a.x)<P||Math.abs(o.y-s.y)<P&&Math.abs(s.y-a.y)<P))break;t.splice(t.length-2,1)}}return t}function Zn(n,t){const e=t.x+t.width/2-(n.x+n.width/2),i=t.y+t.height/2-(n.y+n.height/2),o=e>=0?"right":"left",s=i>=0?"bottom":"top";return Math.abs(e)>=Math.abs(i)?[o,s]:[s,o]}function Yr(n,t,e,i=[],o=ne,s=new Map,a=Zi(n,o.margin)){const r=n.find(b=>b.id===t),d=n.find(b=>b.id===e);if(!r||!d||r===d)return null;const c=a.margin;let l=null,g=[];const h=b=>{let y=1/0;for(const[x,k]of b){const S=Yn(r,x),E=Yn(d,k),[v,I]=Un[x],[M,_]=Un[k],A=Yt(a.xs,S.x+v*c),T=Yt(a.ys,S.y+I*c),O=Yt(a.xs,E.x+M*c),D=Yt(a.ys,E.y+_*c);if(A<0||T<0||O<0||D<0)continue;const R=Ut.indexOf(x),L=Ut.indexOf(k)+2&3,j=Xr(a,A,T,R,O,D,L,o);if(!j)continue;const J=s.get(`${r.id}:${x}`),U=s.get(`${d.id}:${k}`),st=(J?.in?1:0)+(U?.out?1:0),ot=j.cost+2*c+st*o.portPenalty;if(ot<y){y=ot,g=j.cells;const ce=j.cells.map(([_t,pt])=>({x:a.xs[_t],y:a.ys[pt]}));l={side1:x,side2:k,path:Ur([S,...ce,E])}}}},f=Gr(r,d,a,s);if(f)return qn(f,[],r,d,a,s,i),f;const u=Zn(r,d),w=Zn(d,r);h(u.flatMap(b=>w.map(y=>[b,y]))),l||h(Ut.flatMap(b=>Ut.map(y=>[b,y])));const m=l;return m?(qn(m,g,r,d,a,s,i),m):null}function qn(n,t,e,i,o,s,a){const r=`${e.id}:${n.side1}`,d=`${i.id}:${n.side2}`;s.set(r,{in:s.get(r)?.in??0,out:(s.get(r)?.out??0)+1}),s.set(d,{in:(s.get(d)?.in??0)+1,out:s.get(d)?.out??0});const c=o.xs.length;for(let l=0;l+1<t.length;l++){const[g,h]=t[l],[f,u]=t[l+1];h===u?o.hUse[h*c+Math.min(g,f)]++:o.vUse[Math.min(h,u)*c+g]++}for(let l=0;l+1<n.path.length;l++){const g=n.path[l],h=n.path[l+1];a.push({x1:g.x,y1:g.y,x2:h.x,y2:h.y})}}function Gr(n,t,e,i){const o=e.margin,s=(x,k)=>{const S=k==="x"?x.x:x.y,E=k==="x"?x.width:x.height;return x.shape==="diamond"||x.shape==="ellipse"?[S+E/2,S+E/2]:[S+12,S+E-12]},a=[],[r,d]=s(n,"x"),[c,l]=s(t,"x"),g=Math.max(r,c),h=Math.min(d,l);if(h>=g){const x=(g+h)/2;n.y+n.height+2*o<=t.y?a.push({side1:"bottom",side2:"top",path:[{x,y:n.y+n.height},{x,y:t.y}]}):t.y+t.height+2*o<=n.y&&a.push({side1:"top",side2:"bottom",path:[{x,y:n.y},{x,y:t.y+t.height}]})}const[f,u]=s(n,"y"),[w,m]=s(t,"y"),b=Math.max(f,w),y=Math.min(u,m);if(y>=b){const x=(b+y)/2;n.x+n.width+2*o<=t.x?a.push({side1:"right",side2:"left",path:[{x:n.x+n.width,y:x},{x:t.x,y:x}]}):t.x+t.width+2*o<=n.x&&a.push({side1:"left",side2:"right",path:[{x:n.x,y:x},{x:t.x+t.width,y:x}]})}for(const x of a){const[k,S]=x.path;if(!e.boxes.some(v=>v!==n&&v!==t&&qi(k,S,ae(v,o/2)))&&!(i.get(`${n.id}:${x.side1}`)?.in||i.get(`${t.id}:${x.side2}`)?.out))return x}return null}function Wr(n,t,e,i=8){const o=n.find(f=>f.id===t),s=n.find(f=>f.id===e);if(!o||!s||o===s)return null;const a={x:o.x+o.width/2,y:o.y+o.height/2},r={x:s.x+s.width/2,y:s.y+s.height/2},d=r.x-a.x,c=r.y-a.y;if(Math.abs(d)<P&&Math.abs(c)<P)return null;const l=(f,u)=>{const w=Math.abs(d)<P?1/0:f.width/2/Math.abs(d),m=Math.abs(c)<P?1/0:f.height/2/Math.abs(c),b=Math.min(w,m),y={x:f.x+f.width/2,y:f.y+f.height/2};return{x:y.x+u*d*b,y:y.y+u*c*b}},g=l(o,1),h=l(s,-1);for(const f of n)if(!(f===o||f===s)&&qi(g,h,ae(f,i)))return null;return[g,h]}function qi(n,t,e){let i=0,o=1;const s=t.x-n.x,a=t.y-n.y,r=[[-s,n.x-e.minX],[s,e.maxX-n.x],[-a,n.y-e.minY],[a,e.maxY-n.y]];for(const[d,c]of r){if(Math.abs(d)<1e-9){if(c<0)return!1;continue}const l=c/d;if(d<0?i=Math.max(i,l):o=Math.min(o,l),i>o)return!1}return!0}function Zr(n,t,e,i,o){let s=0,a=0;for(let u=0;u+1<n.length;u++){const w=Math.abs(n[u+1].x-n[u].x)+Math.abs(n[u+1].y-n[u].y);w>s&&(s=w,a=u)}const r=n[a]??{x:0,y:0},d=n[a+1]??r,c=Math.abs(d.x-r.x)>=Math.abs(d.y-r.y),l=[...i.map(u=>ae(u,4)),...o],g=(u,w)=>!l.some(m=>u<m.maxX&&u+t>m.minX&&w<m.maxY&&w+e>m.minY),h=[];for(const u of[.5,.33,.67,.2,.8]){const w=r.x+(d.x-r.x)*u,m=r.y+(d.y-r.y)*u;c?h.push({x:w-t/2,y:m-e-6},{x:w-t/2,y:m+6}):h.push({x:w+8,y:m-e/2},{x:w-t-8,y:m-e/2})}const f=h.find(u=>g(u.x,u.y))??h[0];return o.push({minX:f.x-4,minY:f.y-2,maxX:f.x+t+4,maxY:f.y+e+2}),f}const qr={minW:160,minH:90,padX:64,padY:40,gapX:110,gapY:64,gridGapX:90,gridGapY:72,radialMinRadius:240,radialGap:120,maxGridCols:4,textWrap:200};function Kr(n){return{...qr,...n.space}}const lt=24;function Jr(n,t,e,i){const o=t.fontSizes.node,s=Yi(n.label,i.textWrap,o),a=Math.max(1,...s.map(l=>dt(l,o))),r=Math.ceil(s.length*o*1.25);let d,c;return n.shape==="text"?(d=Math.max(a,24),c=Math.max(r,o)):(d=Math.max(i.minW,a+i.padX),c=Math.max(i.minH,r+i.padY)),n.shape==="ellipse"?(d=Math.ceil(d*1.1),c=Math.ceil(c*1.12)):n.shape==="diamond"&&(d=Math.ceil(d*1.24),c=Math.ceil(c*1.32)),{id:n.id,label:n.label,shape:n.shape,...n.group?{group:n.group}:{},...n.rank!==void 0?{rank:n.rank}:{},...n.order!==void 0?{order:n.order}:{},index:e,fill:n.shape==="text"?"transparent":Fr(t,e,n.group),lines:s,x:0,y:0,width:d,height:c}}function Vr(n,t){const e=new Map(n.map(c=>[c.id,c.index])),i=new Map(n.map(c=>[c.id,0])),o=new Map(n.map(c=>[c.id,[]]));for(const c of t)o.get(c.from)?.push(c.to),i.set(c.to,(i.get(c.to)??0)+1);const s=new Map(n.map(c=>[c.id,0])),a=new Set,r=n.filter(c=>(i.get(c.id)??0)===0).map(c=>c.id);for(;a.size<n.length;){if(r.length===0){const g=n.filter(f=>!a.has(f.id)).sort((f,u)=>(e.get(f.id)??0)-(e.get(u.id)??0))[0];let h=0;for(const f of t)f.to===g.id&&a.has(f.from)&&(h=Math.max(h,(s.get(f.from)??0)+1));s.set(g.id,h),r.push(g.id)}const c=r.shift();if(!(!c||a.has(c))){a.add(c);for(const l of o.get(c)??[]){if(a.has(l))continue;s.set(l,Math.max(s.get(l)??0,(s.get(c)??0)+1));const g=(i.get(l)??1)-1;i.set(l,g),g<=0&&r.push(l)}}}const d=new Set(t.map(c=>c.to));for(const c of n){if(d.has(c.id))continue;const l=(o.get(c.id)??[]).map(g=>s.get(g)??0);l.length&&s.set(c.id,Math.max(s.get(c.id)??0,Math.min(...l)-1))}for(const c of n)c.rank!==void 0&&s.set(c.id,c.rank);return s}function Ki(n,t){const e=Vr(n,t),i=new Map;for(const o of n){const s=e.get(o.id)??0,a=i.get(s)??[];a.push(o),i.set(s,a)}Qr(i,t);for(const[o,s]of i)i.set(o,Ge(s));return i}function Ge(n){const t=new Map;return n.forEach((i,o)=>{i.group&&!t.has(i.group)&&t.set(i.group,o)}),n.map((i,o)=>({n:i,i:o,key:i.group?t.get(i.group)??o:o})).sort((i,o)=>i.key-o.key||i.i-o.i).map(i=>i.n).map((i,o)=>({n:i,i:o,key:i.order??o,explicit:i.order!==void 0?0:1})).sort((i,o)=>i.key-o.key||i.explicit-o.explicit||i.i-o.i).map(i=>i.n)}function Qr(n,t){const e=[...n.keys()].sort((s,a)=>s-a);if(e.length<2)return;const i=new Map;for(const s of t)s.from!==s.to&&(i.set(s.from,[...i.get(s.from)??[],s.to]),i.set(s.to,[...i.get(s.to)??[],s.from]));const o=(s,a)=>{s.forEach((r,d)=>{const c=a(d);if(c===void 0)return;const l=new Map((n.get(c)??[]).map((f,u)=>[f.id,u])),g=n.get(r)??[],h=g.map((f,u)=>{const w=(i.get(f.id)??[]).map(b=>l.get(b)).filter(b=>b!==void 0),m=Math.max(1,(n.get(c)?.length??1)-1)/Math.max(1,g.length-1);return{n:f,k:u,key:w.length?w.reduce((b,y)=>b+y,0)/w.length/m:u}});h.sort((f,u)=>f.key-u.key||f.k-u.k),n.set(r,h.map(f=>f.n))})};for(let s=0;s<2;s++){o(e,r=>r>0?e[r-1]:void 0);const a=[...e].reverse();o(a,r=>r>0?a[r-1]:void 0)}}function tc(n,t,e){const i=Ki(n,t),o=[...i.keys()].sort((c,l)=>c-l),s=o.map(c=>Math.max(...(i.get(c)??[]).map(l=>l.width))),a=o.map(c=>{const l=i.get(c)??[];return l.reduce((g,h)=>g+h.height,0)+e.gapY*Math.max(0,l.length-1)}),r=Math.max(0,...a);let d=0;o.forEach((c,l)=>{const g=i.get(c)??[];let h=Math.max(0,(r-a[l])/2);for(const f of g)f.x=d+(s[l]-f.width)/2,f.y=h,h+=f.height+e.gapY;d+=s[l]+e.gapX})}function ec(n,t,e){const i=Ki(n,t),o=[...i.keys()].sort((c,l)=>c-l),s=o.map(c=>Math.max(...(i.get(c)??[]).map(l=>l.height))),a=o.map(c=>{const l=i.get(c)??[];return l.reduce((g,h)=>g+h.width,0)+e.gapX*Math.max(0,l.length-1)}),r=Math.max(0,...a);let d=0;o.forEach((c,l)=>{const g=i.get(c)??[];let h=Math.max(0,(r-a[l])/2);for(const f of g)f.x=h,f.y=d+(s[l]-f.height)/2,h+=f.width+e.gapX;d+=s[l]+e.gapY})}function nc(n,t){const e=Ge(n),i=Math.max(1,Math.min(t.maxGridCols,Math.ceil(Math.sqrt(e.length)))),o=Math.ceil(e.length/i),s=Array.from({length:i},(g,h)=>Math.max(0,...e.filter((f,u)=>u%i===h).map(f=>f.width))),a=Array.from({length:o},(g,h)=>Math.max(0,...e.slice(h*i,h*i+i).map(f=>f.height))),r=[];let d=0;for(let g=0;g<i;g++)r.push(d),d+=s[g]+t.gridGapX;const c=[];let l=0;for(let g=0;g<o;g++)c.push(l),l+=a[g]+t.gridGapY;e.forEach((g,h)=>{const f=h%i,u=Math.floor(h/i);g.x=r[f]+(s[f]-g.width)/2,g.y=c[u]+(a[u]-g.height)/2})}function ic(n,t,e){if(n.length===1){n[0].x=0,n[0].y=0;return}const i=new Map(n.map(S=>[S.id,0]));for(const S of t)i.set(S.from,(i.get(S.from)??0)+1),i.set(S.to,(i.get(S.to)??0)+1);const o=[...n].sort((S,E)=>(i.get(E.id)??0)-(i.get(S.id)??0)||S.index-E.index)[0],s=Ge(n.filter(S=>S.id!==o.id)),a=Math.max(...s.map(S=>S.width)),r=Math.max(...s.map(S=>S.height)),d=Math.max(e.radialMinRadius,o.width/2+a/2+e.radialGap,o.height/2+r/2+e.radialGap);o.x=-o.width/2,o.y=-o.height/2;const c=Math.hypot(a,r)+e.radialGap/2,l=S=>Math.max(1,Math.floor(Math.PI/Math.asin(Math.min(1,c/(2*S))))),g=[];let h=s,f=d;for(;h.length;){const S=g.length===0&&h.length<=l(f)?h.length:Math.min(h.length,l(f));g.push({r:f,nodes:h.slice(0,S)}),h=h.slice(S),f+=Math.max(a,r)+e.radialGap}const u=s.length<=2?0:-Math.PI/2,w=[o],m=(S,E,v,I,M,_)=>{const A=M.x-_,T=M.x+M.width+_,O=M.y-_,D=M.y+M.height+_;let R=0,L=1;const j=v-S,J=I-E;for(const[U,st]of[[-j,S-A],[j,T-S],[-J,E-O],[J,D-E]]){if(Math.abs(U)<1e-9){if(st<0)return!1;continue}const ot=st/U;if(U<0?R=Math.max(R,ot):L=Math.min(L,ot),R>L)return!1}return!0},b=(S,E)=>{const I=[];for(let T=0;T<720;T++){const O=u+T/720*Math.PI*2,D=Math.cos(O)*S,R=Math.sin(O)*S,L=D-a/2,j=R-r/2;w.some(U=>U!==o&&(m(0,0,D,R,U,12)||L<U.x+U.width+12&&U.x<L+a+12&&j<U.y+U.height+12&&U.y<j+r+12))||I.push(O)}if(I.length<E)return null;const M=2*Math.asin(Math.min(1,c/(2*S))),_=(T,O)=>{const D=Math.abs(T-O)%(Math.PI*2);return Math.min(D,Math.PI*2-D)},A=[];for(let T=0;T<E;T++){const O=u+(T+.5)/E*Math.PI*2;let D=null;for(const R of I)A.some(L=>_(R,L)<M-1e-6)||(D===null||_(R,O)<_(D,O))&&(D=R);if(D===null)return null;A.push(D)}return A};let y=0;g.forEach((S,E)=>{const v=S.nodes.length,I=Math.PI*2/v;S.r+=y;let M=S.nodes.map((_,A)=>u+I*A+(E>0?I/2:0));if(E>0)for(let _=0;_<4;_++){const A=b(S.r,v);if(A){M=A;break}const T=S.r*.15;S.r+=T,y+=T}S.nodes.forEach((_,A)=>{_.x=Math.cos(M[A])*S.r-_.width/2,_.y=Math.sin(M[A])*S.r-_.height/2,w.push(_)})});const x=Math.min(...n.map(S=>S.x)),k=Math.min(...n.map(S=>S.y));n.forEach(S=>{S.x-=x,S.y-=k})}function Kn(n){const t=[];for(const e of n){const i=t[t.length-1];(!i||Math.abs(i[0]-e[0])>.01||Math.abs(i[1]-e[1])>.01)&&t.push(e)}return t.length>=2?t:[[0,0],[0,0]]}function sc(n,t,e,i=!1,o=[]){const s=new Map(n.map(h=>[h.id,h])),a=[],r=[],d=new Map,c=Zi(n,ne.margin),l=[...o],g=t.map((h,f)=>({edge:h,index:f})).sort((h,f)=>Jn(s,h.edge)-Jn(s,f.edge));for(const{edge:h,index:f}of g){const u=s.get(h.from),w=s.get(h.to);if(!u||!w)continue;const m=i?Wr(n,u.id,w.id):null,b=m?{side1:Xt(u,w),side2:Xt(w,u),path:m}:u===w?null:Yr(n,u.id,w.id,r,ne,d,c);if(b){const T=b.path[0],O=b.path[b.path.length-1],D=Kn(b.path.map(L=>[L.x-T.x,L.y-T.y]));let R;if(h.label){const L=e.fontSizes.edge;R=Zr(b.path,dt(h.label,L),Math.ceil(L*1.25),n,l)}a.push({index:f,route:{from:h.from,to:h.to,...h.label?{label:h.label}:{},side1:b.side1,side2:b.side2,p1:T,p2:O,points:D,...R?{labelAt:R}:{}}});continue}const y=Xt(u,w),x=Xt(w,u),k=Hn(u,y),S=Hn(w,x),E=S.x-k.x,v=S.y-k.y,M=y==="left"||y==="right"?[[0,0],[E/2,0],[E/2,v],[E,v]]:[[0,0],[0,v/2],[E,v/2],[E,v]],_=Kn(M);let A;if(h.label){const T=e.fontSizes.edge,O=dt(h.label,T),D=Math.ceil(T*1.25),R=(k.x+S.x)/2,L=(k.y+S.y)/2;A=Math.abs(E)>=Math.abs(v)?{x:R-O/2,y:L-D-8}:{x:R+10,y:L-D/2}}a.push({index:f,route:{from:h.from,to:h.to,...h.label?{label:h.label}:{},side1:y,side2:x,p1:k,p2:S,points:_,...A?{labelAt:A}:{}}})}return a.sort((h,f)=>h.index-f.index).map(h=>h.route)}function Jn(n,t){const e=n.get(t.from),i=n.get(t.to);return!e||!i?1/0:Math.abs(e.x+e.width/2-(i.x+i.width/2))+Math.abs(e.y+e.height/2-(i.y+i.height/2))}function oc(n,t){const e=n.split(`
`),i=Math.max(1,...e.map(s=>dt(s,t))),o=Math.max(1,Math.ceil(e.length*t*1.25));return{minX:0,minY:0,maxX:i,maxY:o,width:i,height:o,cx:i/2,cy:o/2}}function ac(n){const t=oe(n.preset),e=n.groups??[],i=Math.ceil(t.fontSizes.edge*1.25)+8,o=Kr(t),s=e.length?{...o,gapX:Math.max(o.gapX,2*lt+32),gapY:Math.max(o.gapY,2*lt+i+24),gridGapX:Math.max(o.gridGapX,2*lt+32),gridGapY:Math.max(o.gridGapY,2*lt+i+24)}:o,a=n.nodes.map((f,u)=>Jr(f,t,u,s));switch(n.layout){case"tb":ec(a,n.edges,s);break;case"grid":nc(a,s);break;case"radial":ic(a,n.edges,s);break;case"lr":default:tc(a,n.edges,s);break}const r=[],d=rc(e,a,i,r),c=d.flatMap(f=>[{minX:f.labelAt.x-4,minY:f.labelAt.y-2,maxX:f.labelAt.x+dt(f.label,t.fontSizes.edge)+4,maxY:f.labelAt.y+i},{minX:f.x-3,minY:f.y-3,maxX:f.x+f.width+3,maxY:f.y+3},{minX:f.x-3,minY:f.y+f.height-3,maxX:f.x+f.width+3,maxY:f.y+f.height+3},{minX:f.x-3,minY:f.y-3,maxX:f.x+3,maxY:f.y+f.height+3},{minX:f.x+f.width-3,minY:f.y-3,maxX:f.x+f.width+3,maxY:f.y+f.height+3}]),l=sc(a,n.edges,t,n.layout==="radial",c),g=kt([...a,...d]);if(g&&(g.minX<0||g.minY<0)){const f=Math.max(0,-g.minX),u=Math.max(0,-g.minY);for(const w of a)w.x+=f,w.y+=u;for(const w of d)w.x+=f,w.y+=u,w.labelAt={x:w.labelAt.x+f,y:w.labelAt.y+u};for(const w of l)w.p1={x:w.p1.x+f,y:w.p1.y+u},w.p2={x:w.p2.x+f,y:w.p2.y+u},w.labelAt&&(w.labelAt={x:w.labelAt.x+f,y:w.labelAt.y+u})}const h=kt([...a,...d])??{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,cx:0,cy:0};return{nodes:a,routes:l,titleBox:n.title?oc(n.title,t.fontSizes.title):null,frames:d,contentBox:h,preset:t,warnings:r}}function rc(n,t,e,i){const o=[];for(const s of n){const a=t.filter(h=>h.group===s.id),r=kt(a);if(!r)continue;const d=r.minX-lt,c=r.minY-lt-e,l={id:s.id,label:s.label,x:d,y:c,width:r.width+2*lt,height:r.height+2*lt+e,labelAt:{x:d+12,y:c+6}},g=t.filter(h=>h.group!==s.id&&h.x<l.x+l.width&&h.x+h.width>l.x&&h.y<l.y+l.height&&h.y+h.height>l.y);g.length&&i.push(`分组「${s.label}」的框包住了非成员节点 ${g.map(h=>h.id).join(", ")}：成员跨了不相邻的层或位置，可用 rank/order 让它们挨在一起`);for(const h of o)l.x<h.x+h.width&&l.x+l.width>h.x&&l.y<h.y+h.height&&l.y+l.height>h.y&&i.push(`分组「${s.label}」与「${h.label}」的框重叠`);o.push(l)}return o}class Q extends Error{constructor(t,e){super(`plan:${t}${e?` (${e})`:""}`),this.reason=t,this.detail=e,this.name="PlanError"}}const W={maxNodes:40,maxEdges:80,maxLabel:200,maxNote:120,maxTitle:120,maxCaption:300,maxEdgeLabel:60,maxGroups:12,maxGroupLabel:60,maxRank:39},cc={lr:"lr",horizontal:"lr","left-right":"lr",tb:"tb",vertical:"tb","top-down":"tb",grid:"grid",matrix:"grid",radial:"radial",mindmap:"radial",circle:"radial"},lc={rounded:"rounded",round:"rounded",card:"rounded",rectangle:"rectangle",rect:"rectangle",square:"rectangle",box:"rectangle",ellipse:"ellipse",oval:"ellipse",circle:"ellipse",diamond:"diamond",decision:"diamond",rhombus:"diamond",text:"text",plain:"text"};function Dt(n){return typeof n=="object"&&n!==null&&!Array.isArray(n)}function X(n){return typeof n=="string"?n:typeof n=="number"&&Number.isFinite(n)?String(n):""}function ft(n,t){const e=n.trim().replace(/\r\n?/g,`
`);return e.length>t?`${e.slice(0,t-1)}…`:e}function dc(n){if(typeof n!="string")return null;const t=n.trim().toLowerCase();return cc[t]??null}function hc(n){return n===""?"rounded":lc[n.trim().toLowerCase()]??null}function Ji(n){return n.trim().replace(/[^\w.-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,48)}function fc(n,t){const e=[],i=new Set;for(let o=0;o<n.length;o++){const s=n[o];let a="",r="",d="",c="",l,g;if(typeof s=="string")r=s;else if(Dt(s)){a=X(s.id),r=X(s.label??s.text??s.title),d=X(s.shape),c=X(s.group),l=s.rank??s.layer,g=s.order;const w=X(s.note??s.description);w&&(r=r?`${r}
${w}`:w)}else{t.push(`nodes[${o}] 不是字符串或对象，已忽略`);continue}if(r=ft(r,W.maxLabel+W.maxNote+1),!r.trim()){t.push(`nodes[${o}] 没有 label，已忽略`);continue}const h=hc(d);if(!h)throw new Q("bad-shape",`nodes[${o}].shape=${d}`);if(a=Ji(a)||`n${o+1}`,i.has(a))throw new Q("duplicate-node-id",a);i.add(a);const f=uc(l,0,W.maxRank,`nodes[${o}].rank`,t),u=pc(g,`nodes[${o}].order`,t);e.push({id:a,label:r,shape:h,...c.trim()?{group:ft(c,40)}:{},...f!==void 0?{rank:f}:{},...u!==void 0?{order:u}:{}})}return e}function uc(n,t,e,i,o){if(n==null||n==="")return;const s=typeof n=="number"?n:Number(n);if(!Number.isInteger(s)||s<t||s>e){o.push(`${i}=${X(n)||typeof n} 不是 ${t}–${e} 的整数，已忽略`);return}return s}function pc(n,t,e){if(n==null||n==="")return;const i=typeof n=="number"?n:Number(n);if(!Number.isFinite(i)){e.push(`${t}=${X(n)||typeof n} 不是数字，已忽略`);return}return i}function gc(n,t,e){if(n==null)return[];const i=[];if(Array.isArray(n))n.forEach((a,r)=>{typeof a=="string"?i.push([a,a]):Dt(a)?i.push([X(a.id??a.name),X(a.label??a.title??a.id??a.name)]):e.push(`groups[${r}] 不是字符串或对象，已忽略`)});else if(Dt(n))for(const[a,r]of Object.entries(n))i.push([a,X(r)||a]);else return e.push("groups 必须是对象或数组，已忽略"),[];const o=new Set(t.map(a=>a.group).filter(Boolean)),s=[];for(const[a,r]of i){const d=ft(a,40);if(d){if(!o.has(d)){e.push(`groups 里的「${d}」没有任何节点使用（node.group），已忽略`);continue}if(!s.some(c=>c.id===d)){if(s.length>=W.maxGroups){e.push(`groups 超过 ${W.maxGroups} 个，其余不画框`);break}s.push({id:d,label:ft(r||d,W.maxGroupLabel)})}}}return s}function Vn(n,t){const e=n.trim();if(!e)return null;const i=t.find(a=>a.id===e||a.id===Ji(e));if(i)return i.id;const o=e.toLowerCase(),s=t.filter(a=>a.label.toLowerCase()===o);return s.length===1?s[0].id:null}function mc(n,t,e){const i=[],o=new Set;for(let s=0;s<n.length;s++){const a=n[s];let r="",d="",c="";if(typeof a=="string"){const f=a.split(/\s*->\s*/);if(f.length!==2){e.push(`edges[${s}] 不是 "a->b" 形式，已忽略`);continue}[r,d]=f}else if(Array.isArray(a))r=X(a[0]),d=X(a[1]),c=X(a[2]);else if(Dt(a))r=X(a.from??a.source??a.start),d=X(a.to??a.target??a.end),c=X(a.label??a.text);else{e.push(`edges[${s}] 不是字符串/数组/对象，已忽略`);continue}const l=Vn(r,t),g=Vn(d,t);if(!l||!g){e.push(`edges[${s}] 端点不存在（${r||"?"} -> ${d||"?"}），已忽略`);continue}if(l===g){e.push(`edges[${s}] 是自环（${l}），已忽略`);continue}c=ft(c,W.maxEdgeLabel);const h=`${l}\0${g}\0${c}`;if(o.has(h)){e.push(`edges[${s}] 与前面的边重复，已忽略`);continue}o.add(h),i.push({from:l,to:g,...c?{label:c}:{}})}return i}function yc(n,t={}){if(!Dt(n))throw new Q("bad-plan","计划必须是 JSON 对象");const e=[],i=n.nodes;if(!Array.isArray(i))throw new Q("bad-plan","缺少 nodes 数组");if(i.length>W.maxNodes)throw new Q("too-many-nodes",`${i.length} > ${W.maxNodes}，请拆成多张白板`);const o=fc(i,e);if(o.length===0)throw new Q("empty-plan","没有可用节点");const s=n.edges??[];if(!Array.isArray(s))throw new Q("bad-plan","edges 必须是数组");if(s.length>W.maxEdges)throw new Q("too-many-edges",`${s.length} > ${W.maxEdges}`);const a=mc(s,o,e),r=t.preset!==void 0&&t.preset!==""?t.preset:n.preset;let d="pencil";if(r!=null&&r!==""){const w=Lr(r);if(!w)throw new Q("bad-preset",`${X(r)}（可选 ${Gi().join("/")}）`);d=w}const c=t.layout!==void 0&&t.layout!==""?t.layout:n.layout;let l=a.length>0?"lr":"grid";if(c!=null&&c!==""){const w=dc(c);if(!w)throw new Q("bad-layout",`${X(c)}（可选 lr/tb/grid/radial）`);l=w}const g=t.title!==void 0&&t.title!==""?t.title:n.title,h=ft(X(g),W.maxTitle)||void 0,f=ft(X(n.caption),W.maxCaption)||void 0,u=gc(n.groups,o,e);return(l==="grid"||l==="radial")&&o.some(w=>w.rank!==void 0)&&e.push(`rank 只对 lr/tb 生效，${l} 布局下已忽略`),{...h?{title:h}:{},...f?{caption:f}:{},preset:d,layout:l,nodes:o,edges:a,groups:u,warnings:e}}function bc(n){return(n??"ai").trim().replace(/[^\w.-]+/g,"_").replace(/^_+|_+$/g,"")||"ai"}function Gt(n,t,e,i,o,s,a,r){const d=t.split(`
`);return{type:"text",id:n,x:e,y:i,width:Math.max(1,...d.map(c=>dt(c,o))),height:Math.max(1,Math.ceil(d.length*o*1.25)),text:t,fontSize:o,fontFamily:s,strokeColor:a,textAlign:r}}function xc(n,t,e,i,o,s){const r={type:n.shape==="ellipse"?"ellipse":n.shape==="diamond"?"diamond":n.shape==="text"?"text":"rectangle",id:t,x:o+n.x,y:s+n.y,width:n.width,height:n.height,text:n.label,fontSize:i.fontSizes.node,fontFamily:i.fontFamily,strokeColor:i.ink,textAlign:n.shape==="text"?"left":"center"};return n.shape!=="text"&&(r.backgroundColor=n.fill,r.fillStyle=i.fillStyle,r.strokeWidth=i.strokeWidth,r.strokeStyle=i.strokeStyle,r.roughness=i.roughness,n.shape==="rectangle"?r.roundness=null:i.nodeRoundness&&(r.roundness=i.nodeRoundness)),n.group&&(r.groupIds=[`${e}-group-${n.group.replace(/[^\w.-]+/g,"_")}`]),r}function wc(n,t={}){const e=yc(n,t),i=oe(e.preset),o=ac(e),s=bc(t.idPrefix),a={x:t.origin?.x??0,y:t.origin?.y??0},r=a.x+40,d=a.y+(e.title?96:40),c=[],l=o.nodes.map(y=>{const x=`${s}-${y.id}`;return c.push(xc(y,x,s,i,r,d)),{...y,elementId:x}}),g=o.routes.map(y=>({...y,fromElementId:`${s}-${y.from}`,toElementId:`${s}-${y.to}`,p1:{x:r+y.p1.x,y:d+y.p1.y},p2:{x:r+y.p2.x,y:d+y.p2.y},...y.labelAt?{labelAt:{x:r+y.labelAt.x,y:d+y.labelAt.y}}:{}})),h=e.title?[Gt(`${s}-title`,e.title,a.x+40,a.y+24,i.fontSizes.title,i.fontFamily,i.ink,"left")]:[],f=[];for(const y of o.frames){const x=`${s}-frame-${y.id.replace(/[^\w.-]+/g,"_")}`;f.push({type:"rectangle",id:x,x:r+y.x,y:d+y.y,width:y.width,height:y.height,strokeColor:i.muted,backgroundColor:"transparent",fillStyle:"solid",strokeWidth:1,strokeStyle:"dashed",roughness:i.roughness,roundness:{type:3},groupIds:[`${s}-group-${y.id.replace(/[^\w.-]+/g,"_")}`]}),f.push(Gt(`${x}-label`,y.label,r+y.labelAt.x,d+y.labelAt.y,i.fontSizes.edge,i.fontFamily,i.muted,"left")),f[f.length-1].groupIds=[`${s}-group-${y.id.replace(/[^\w.-]+/g,"_")}`]}const u=[];g.forEach((y,x)=>{!y.label||!y.labelAt||u.push(Gt(`${s}-edge-${x+1}`,y.label,y.labelAt.x,y.labelAt.y,i.fontSizes.edge,i.fontFamily,i.muted,"center"))});const w=e.caption?[Gt(`${s}-caption`,e.caption,r,d+o.contentBox.maxY+44,i.fontSizes.caption,i.fontFamily,i.muted,"left")]:[],m=[...h,...f,...c,...u,...w];e.warnings.push(...o.warnings);const b=kt(m.map(y=>({x:y.x,y:y.y,width:y.width??0,height:y.height??0})))??{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,cx:0,cy:0};return{plan:e,preset:i,specs:m,nodes:l,routes:g,bbox:b,background:i.background,idPrefix:s}}const Ne="assets/excali-styles",kc=/^[a-z0-9][a-z0-9._-]{0,31}$/,Sc=/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,vc=["solid","hachure","cross-hatch"],Ec=["solid","dashed","dotted"],Vi=["minW","minH","padX","padY","gapX","gapY","gridGapX","gridGapY","radialMinRadius","radialGap","maxGridCols","textWrap"],_c=new Set(Vi),Ac=4e3,Mc=8,$c=96,Ic=20,Cc=[0,1,2],Tc=20,Qn=32,ti=64,Rc=40;class Qi extends Error{constructor(t,e,i){super(`style:${t} (${i}) ${e}`),this.reason=t,this.source=i,this.name="StylePackError"}}function vt(n){return typeof n=="object"&&n!==null&&!Array.isArray(n)}function ts(n){return(n.replace(/\\/g,"/").split("/").pop()??"").replace(/\.json$/i,"")}function F(n,t,e){throw new Qi(n,t,e)}function We(n,t,e){return(typeof n!="string"||!Sc.test(n.trim()))&&F("bad-field",`${t} 需要 #rgb/#rrggbb 形式的颜色`,e),n.trim()}function Tt(n,t,e,i,o){const s=typeof n=="number"?n:Number(n);return(!Number.isFinite(s)||!Number.isInteger(s)||s<e||s>i)&&F("bad-field",`${t} 需要 ${e}..${i} 的整数（收到 ${String(n)}）`,o),s}function Fe(n,t,e,i){return(typeof n!="string"||!e.includes(n))&&F("bad-field",`${t} 只能是 ${e.join("/")}（收到 ${String(n)}）`,i),n}function Lc(n,t){vt(n)||F("bad-field","fontSizes 需要对象 {title,node,edge,caption}",t);const e={};for(const o of["title","node","edge","caption"]){const s=n[o];s!==void 0&&(e[o]=Tt(s,`fontSizes.${o}`,Mc,$c,t))}const i=Object.keys(n).filter(o=>!["title","node","edge","caption"].includes(o));return i.length&&F("bad-field",`fontSizes 有未知字段 ${i.join(",")}`,t),Object.keys(e).length===0&&F("bad-field","fontSizes 是空对象",t),e}function Dc(n,t){return(!Array.isArray(n)||n.length===0)&&F("bad-field","palette 需要非空数组",t),n.length>Qn&&F("bad-field",`palette 最多 ${Qn} 色`,t),n.map((e,i)=>We(e,`palette[${i}]`,t))}function Pc(n,t){vt(n)||F("bad-field","space 需要对象（gapX/gapY/padX/padY…）",t);const e={};for(const o of Vi){const s=n[o];s!==void 0&&(e[o]=Tt(s,`space.${o}`,0,Ac,t))}const i=Object.keys(n).filter(o=>!_c.has(o));return i.length&&F("bad-field",`space 有未知字段 ${i.join(",")}`,t),Object.keys(e).length===0&&F("bad-field","space 是空对象",t),e}function Oc(n,t){vt(n)||F("bad-field","groupColor 需要对象 {mode,roles}",t);const e=Fe(n.mode,"groupColor.mode",["hash","roles"],t);if(e!=="roles")return{mode:e};const i=n.roles;vt(i)||F("bad-field","groupColor.roles 需要 {分组名:颜色}",t);const o=Object.entries(i);o.length===0&&F("bad-field","groupColor.roles 是空对象",t),o.length>ti&&F("bad-field",`groupColor.roles 最多 ${ti} 组`,t);const s={};for(const[a,r]of o){const d=a.trim().slice(0,Rc);d||F("bad-field","groupColor.roles 有空的分组名",t),s[d]=We(r,`groupColor.roles.${d}`,t)}return{mode:e,roles:s}}function Bc(n,t){return n===null?null:typeof n=="number"?{type:n}:vt(n)&&typeof n.type=="number"?{type:n.type}:F("bad-field","nodeRoundness 需要 null / {type:number}",t)}function Nc(n,t="inline",e=new Set){let i;try{i=JSON.parse(n)}catch(l){return F("bad-json",`不是合法 JSON：${l instanceof Error?l.message:String(l)}`,t)}if(!vt(i))return F("bad-pack","风格包必须是 JSON 对象",t);const o=typeof i.name=="string"&&i.name.trim()?i.name:ts(t),s=St(o);kc.test(s)||F("bad-name",`${o} → ${s||"(空)"}（要求小写字母/数字/._-，首字符字母数字，≤32）`,t);const a=i.extends===void 0||i.extends===null||i.extends===""?"pencil":St(String(i.extends));!Dr(a)&&!e.has(a)&&F("bad-extends",`${a} 不存在（内置之外可用 ${[...e].join("/")||"无"}）`,t),a===s&&F("bad-extends","不能 extends 自己",t);const r={},d=["background","ink","fill","edge","muted"];for(const l of d)i[l]!==void 0&&(r[l]=We(i[l],l,t));if(i.palette!==void 0&&(r.fillPalette=Dc(i.palette,t)),i.strokeWidth!==void 0&&(r.strokeWidth=Tt(i.strokeWidth,"strokeWidth",0,Ic,t)),i.roughness!==void 0){const l=Tt(i.roughness,"roughness",0,2,t);Cc.includes(l)||F("bad-field","roughness 只能是 0/1/2",t),r.roughness=l}i.fillStyle!==void 0&&(r.fillStyle=Fe(i.fillStyle,"fillStyle",vc,t)),i.strokeStyle!==void 0&&(r.strokeStyle=Fe(i.strokeStyle,"strokeStyle",Ec,t)),i.fontFamily!==void 0&&(r.fontFamily=Tt(i.fontFamily,"fontFamily",1,Tc,t)),i.fontSizes!==void 0&&(r.fontSizes=Lc(i.fontSizes,t)),i.nodeRoundness!==void 0&&(r.nodeRoundness=Bc(i.nodeRoundness,t)),i.space!==void 0&&(r.space=Pc(i.space,t)),i.groupColor!==void 0&&(r.groupColor=Oc(i.groupColor,t));const c=typeof i.label=="string"&&i.label.trim()?i.label.trim().slice(0,40):s;return{name:s,extendsFrom:a,label:c,diff:r}}function Fc(n,t="inline",e){const i=Nc(n,t,e);return Pr(i.name,{extendsFrom:i.extendsFrom,diff:{...i.diff,label:i.label}}),{name:i.name,extends:i.extendsFrom,label:i.label}}async function jc(n,t=Ne){Or();const e=[];let i=[];try{i=(await n.list()).filter(a=>/\.json$/i.test(a)).sort()}catch(a){return e.push(`${t} 目录读不了，只用内置风格：${a instanceof Error?a.message:String(a)}`),{loaded:[],warnings:e}}const o=new Set(i.map(a=>St(ts(a)))),s=[];for(const a of i){const r=`${t}/${a}`;let d;try{d=await n.read(a)}catch(c){e.push(`${r} 读不到，已跳过：${c instanceof Error?c.message:String(c)}`);continue}try{s.push(Fc(d,r,o))}catch(c){c instanceof Qi?e.push(c.message):e.push(`${r} 加载失败：${c instanceof Error?c.message:String(c)}`)}}for(const a of s)try{oe(a.name)}catch(r){e.push(`style:${a.name} 解析失败，绘图时不可用：${r instanceof Error?r.message:String(r)}`)}return{loaded:s,warnings:e}}function Hc(){const n=[];for(const t of Gi())try{n.push({name:t,extends:Br(t)??"-",label:oe(t).label??t})}catch{}return n}const zc=12*1024*1024,Xc="1024x1024",Uc="gpt-image-1";function Yc(n,t){const e=t.toLowerCase();for(const[i,o]of Object.entries(n??{}))if(i.toLowerCase()===e)return Array.isArray(o)?String(o[0]??""):typeof o=="string"?o:String(o??"");return""}function Gc(n){const t=String(n??"").trim().replace(/\/+$/,"");if(!t)throw new Error("未配置图像 API 地址");if(!/^https?:\/\//i.test(t))throw new Error("图像 API 地址必须以 http:// 或 https:// 开头");return/\/images\/generations$/i.test(t)?t:`${t}/images/generations`}function Wc(n,t,e={}){const i=String(t??"").trim();if(!i)throw new Error("prompt 不能为空");if(i.length>4e3)throw new Error("prompt 过长（上限 4000 字符）");const o=String(n.apiKey??"").trim();if(!o)throw new Error("未配置图像 API Key");const s=String(n.model??"").trim()||Uc,a=String(e.size??n.size??"").trim()||Xc;return{url:Gc(n.baseUrl),headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json"},payload:JSON.stringify({model:s,prompt:i,n:1,size:a}),size:a}}function re(n){const t=n.replace(/\s+/g,"").replace(/-/g,"+").replace(/_/g,"/"),e=t.length%4;return e===0?t:t+"=".repeat(4-e)}function Zc(n){const t=/^data:([^;,]+);base64,([\s\S]+)$/i.exec(n.trim());return t?{mime:t[1]||"image/png",base64:re(t[2])}:null}function qc(n){if(!n||typeof n!="object")throw new Error("图像 API 返回的不是 JSON 对象");const t=n;if(t.error){const r=t.error,d=r&&typeof r=="object"&&typeof r.message=="string"?r.message:typeof r=="string"?r:"图像 API 返回错误";throw new Error(`图像 API：${d}`)}const e=Array.isArray(t.data)?t.data[0]:t.data,i=e&&typeof e=="object"?e:t,o=typeof i.revised_prompt=="string"?i.revised_prompt:typeof t.revised_prompt=="string"?t.revised_prompt:void 0,s=typeof i.b64_json=="string"?i.b64_json:typeof t.b64_json=="string"?t.b64_json:"";if(s){const r=Zc(s);return{kind:"inline",base64:r?r.base64:re(s),...o?{revisedPrompt:o}:{}}}const a=typeof i.url=="string"?i.url:typeof t.url=="string"?t.url:"";if(a)return{kind:"url",url:a,...o?{revisedPrompt:o}:{}};throw new Error("图像 API 没有返回图片（b64_json / url 都为空）")}function es(n){const t=atob(re(n)),e=new Uint8Array(t.length);for(let i=0;i<t.length;i++)e[i]=t.charCodeAt(i)&255;return e}function $e(n,t){return n[t]<<8|n[t+1]}function ei(n,t){return(n[t]<<24|n[t+1]<<16|n[t+2]<<8|n[t+3])>>>0}function Wt(n,t){return n[t]|n[t+1]<<8}function ni(n,t){return n[t]|n[t+1]<<8|n[t+2]<<16}function ii(n,t){return(n[t]|n[t+1]<<8|n[t+2]<<16|n[t+3]<<24)>>>0}function si(n){let t;try{t=es(n.slice(0,64))}catch{return"image/png"}return t.length>=8&&t[0]===137&&t[1]===80&&t[2]===78&&t[3]===71?"image/png":t.length>=3&&t[0]===255&&t[1]===216&&t[2]===255?"image/jpeg":t.length>=4&&t[0]===71&&t[1]===73&&t[2]===70?"image/gif":t.length>=12&&t[0]===82&&t[1]===73&&t[2]===70&&t[3]===70&&t[8]===87&&t[9]===69&&t[10]===66&&t[11]===80?"image/webp":t.length>=2&&t[0]===66&&t[1]===77?"image/bmp":"image/png"}function Kc(n){let t;try{t=es(n)}catch{return null}if(t.length>=24&&t[0]===137&&t[1]===80&&t[2]===78&&t[3]===71)return{width:ei(t,16),height:ei(t,20)};if(t.length>=10&&t[0]===71&&t[1]===73&&t[2]===70)return{width:Wt(t,6),height:Wt(t,8)};if(t.length>=26&&t[0]===66&&t[1]===77){const e=ii(t,22);return{width:ii(t,18),height:e>2147483647?4294967296-e:e}}if(t.length>=30&&t[0]===82&&t[1]===73&&t[2]===70&&t[3]===70&&t[8]===87&&t[9]===69&&t[10]===66&&t[11]===80){const e=String.fromCharCode(t[12],t[13],t[14],t[15]);if(e==="VP8X"&&t.length>=30)return{width:ni(t,24)+1,height:ni(t,27)+1};if(e==="VP8 "&&t.length>=30)return{width:Wt(t,26)&16383,height:Wt(t,28)&16383};if(e==="VP8L"&&t.length>=25){const i=t[21]|t[22]<<8|t[23]<<16|t[24]<<24;return{width:(i&16383)+1,height:(i>>>14&16383)+1}}return null}if(t.length>=4&&t[0]===255&&t[1]===216){let e=2;for(;e+3<t.length;){if(t[e]!==255){e+=1;continue}const i=t[e+1];if(i===216||i===217||i===1||i>=208&&i<=215){e+=2;continue}const o=$e(t,e+2);if(o<2)break;if((i>=192&&i<=195||i>=197&&i<=199||i>=201&&i<=203||i>=205&&i<=207)&&e+8<t.length)return{width:$e(t,e+7),height:$e(t,e+5)};e+=2+o}}return null}async function Jc(n,t,e,i={}){const o=Wc(n,t,i),s=await e({url:o.url,method:"POST",headers:o.headers,payload:o.payload,contentType:"application/json",timeout:18e4});if(s.code!==0)throw new Error(`思源转发失败：${s.msg||`code ${s.code}`}`);if(s.status<200||s.status>=300)throw new Error(`图像 API HTTP ${s.status}：${String(s.body??"").slice(0,300)}`);let a;try{a=JSON.parse(s.body)}catch{throw new Error("图像 API 返回的不是 JSON")}const r=qc(a);let d,c;if(r.kind==="inline")d=r.base64,c=si(d);else{if(!/^https?:\/\//i.test(r.url))throw new Error("图像 API 返回的图片 URL 不是 http(s)");const h=await e({url:r.url,method:"GET",headers:{},payload:"",contentType:"application/octet-stream",timeout:12e4,responseEncoding:"base64"});if(h.code!==0)throw new Error(`图片下载失败：${h.msg||`code ${h.code}`}`);if(h.status<200||h.status>=300)throw new Error(`图片下载 HTTP ${h.status}`);if(d=re(h.body||""),!d)throw new Error("图片下载返回空内容");const f=Yc(h.headers,"content-type").split(";")[0].trim().toLowerCase();c=/^image\//.test(f)?f:si(d)}const l=Math.floor(d.length*3/4);if(l>zc)throw new Error(`生成的图片过大（约 ${(l/1024/1024).toFixed(1)} MiB，上限 12 MiB）`);const g=Kc(d);return{dataURL:`data:${c};base64,${d}`,mime:c,base64:d,width:g?.width&&g.width>0?g.width:1024,height:g?.height&&g.height>0?g.height:1024,...r.revisedPrompt?{revisedPrompt:r.revisedPrompt}:{}}}function Vc(){return async n=>{const t={url:n.url,method:n.method||"POST",timeout:n.timeout??12e4,contentType:n.contentType||"application/json",headers:Object.entries(n.headers??{}).map(([a,r])=>({[a]:r})),payload:n.payload??""};n.responseEncoding&&(t.responseEncoding=n.responseEncoding);const e=await fetch("/api/network/forwardProxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),i=await e.json().catch(()=>null);if(!i||typeof i!="object")throw new Error(`forwardProxy 返回异常（HTTP ${e.status}）`);const o=i.data&&typeof i.data=="object"?i.data:{},s=o.body;return{code:typeof i.code=="number"?i.code:-1,msg:typeof i.msg=="string"?i.msg:"",status:typeof o.status=="number"?o.status:0,headers:o.headers&&typeof o.headers=="object"?o.headers:{},body:typeof s=="string"?s:s!=null?JSON.stringify(s):""}}}const oi="excali-studio",Qc=8,tl=5,el={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function Y(n){return n.replace(/[&<>"']/g,t=>el[t])}function at(n){return Y(n)}class nl extends $.Plugin{constructor(){super(...arguments),this.tabs=new Map,this.settings={...z},this.recent=[],this.boardActions=new Map,this.activeCustom=null,this.dockRefresh=null,this.onloadRan=new Set,this.boardDocs=[],this.boardFiles=[],this.dirMigrated=!1,this.legacyBoards=[],this.ready=Promise.resolve(),this.boardSvgByDocId=new Map,this.libLoading=!1,this.autoOpenedDocs=new Set,this.checkupRunning=!1,this.embedClickHandler=null,this.lazyEngine=null,this.scriptPickerDialog=null,this.inputPromptChain=Promise.resolve(),this.selectOptionChain=Promise.resolve(),this.libCache=null}lazyMod(){return this.lazyEngine??=this.loadEngineModule(),this.lazyEngine}async loadEngineModule(){const t=new URL(`plugins/${Zt}/engine.js`,`${location.origin}/`).href,e=await fetch(t);if(!e.ok)throw new Error(`HTTP ${e.status} ${t}`);const i=await e.text(),o={exports:{}};return window.eval(`(function anonymous(require, module, exports){
${i}
})
//# sourceURL=plugins/${Zt}/engine.js
`)(require,o,o.exports),o.exports}async onload(){ns(this.i18n),this.ready=this.bootstrapState(),this.addIcons(rs),this.registerStudioTab(),this.registerDock(),this.addTopBar({id:"excali-studio-open",icon:rt,title:p("打开白板"),callback:()=>void this.openNew(),contextMenu:t=>this.buildTopMenu(t)}),this.protyleSlash.push({id:"excaliStudio",filter:["白板","画板","excali","excalidraw","whiteboard","bb","hb"],html:cs(p("白板")),callback:t=>{this.clearSlashHint(t),this.openNew()}}),this.addCommand({langKey:"openExcaliStudio",langText:p("打开白板"),hotkey:"⌘⌥E",customHotkey:"",callback:()=>void this.openNew()}),ss(),Ra(this),this.registerBlockIconMenu(),this.registerEmbedClick(),this.setupSetting(),this.registerAgentCapabilities(),await this.ready,this.registerBoardDocEvents(),this.refreshBoardLib(),ar().then(async t=>{t>0&&$.showMessage(p("已安装 {n} 个内置脚本到 {dir}",{n:t,dir:Z}),5e3);try{const e=await cr(this.settings.builtinSnapshot),i=this.settings.builtinSnapshot;Object.keys(i).length===Object.keys(e.snapshot).length&&Object.keys(e.snapshot).every(a=>i[a]===e.snapshot[a])||(this.settings.builtinSnapshot=e.snapshot,this.persist()),e.updated.length>0&&$.showMessage(p("内置脚本已更新到最新版（{n} 个），你自建的脚本不受影响",{n:e.updated.length}),5e3)}catch(e){console.warn("[excali-studio] 内置脚本同步失败",e)}}).catch(t=>console.warn("[excali-studio] 内置脚本安装失败",t)),this.maybeShowChangelog()}onunload(){const t=[...this.tabs.values()];t.forEach(e=>e.tab.close()),this.tabs.clear(),this.embedClickHandler&&(document.removeEventListener("click",this.embedClickHandler,!0),this.embedClickHandler=null),t.length>0&&$.showMessage(p("插件已卸载，画板未保存的改动会丢失"),3e3)}async maybeShowChangelog(){try{const t=Ga(await this.loadData(Nn),Ht);if(t==="unknown-version"||t==="up-to-date"||(await this.saveData(Nn,Ht),t!=="show"))return;const e=Va(await Ja(Wa(this.name)),Ht);if(!e)return;new $.Dialog({title:`${p("更新日志")} v${Ht}`,width:"min(640px, 92vw)",content:`<div class="exs-changelog b3-typography">${Qa(e)}</div>`}).element.classList.add("exs-changelog-dialog")}catch(t){console.warn("[excali-studio] 更新日志读取失败",t)}}registerEmbedClick(){this.embedClickHandler=t=>{const e=t.target;if(!e||e.tagName!=="IMG")return;const i=e.getAttribute("src")||"";let o=i;try{o=new URL(i,location.origin).pathname}catch{}const s=/^\/(assets\/.+\.svg)$/i.exec(o);if(!s)return;const a=s[1];this.boardFiles.some(d=>H(d.dataPath)===a)&&(t.preventDefault(),t.stopPropagation(),this.openStudioTab(C(a)))},document.addEventListener("click",this.embedClickHandler,!0)}async bootstrapState(){try{await this.loadState()}catch(t){console.error("[excali-studio] 读取设置失败，用默认值继续",t)}try{await this.migrateLegacyBoards()}catch(t){console.error("[excali-studio] 旧白板迁移失败（下次启动重试）",t)}}async migrateLegacyBoards(){if(this.dirMigrated)return;const t=Di(this.settings.saveDir);if(t!==$t&&t!==bt){this.dirMigrated=!0,this.persist();return}let e=[];try{e=(await At($t)).map(r=>r.path).filter(r=>Ma(B(r)))}catch(r){console.warn("[excali-studio] 迁移：读取旧保存目录失败（按近期/绑定继续）",r)}let i=[];try{i=await Bn()}catch(r){console.warn("[excali-studio] 迁移：查询白板文档失败（按近期/命名继续）",r)}const o=Ca({recent:this.recent,registry:this.legacyBoards,docSvgs:i.map(r=>r.svg),autoNamed:e}),s=new Map,a=[];for(const r of o)try{const d=await Dn(r,await Se(bt,B(r)));s.set(r,C(d));try{await On(H(r),H(d))}catch(c){console.warn("[excali-studio] 迁移后更新正文资源引用失败",r,c)}}catch(d){console.warn("[excali-studio] 迁移白板失败",r,d),a.push(r)}if(t===$t&&await this.migrateLibraryFile(),s.size>0){this.recent=Ta(this.recent,s);for(const r of i){const d=s.get(C(r.svg));if(d)try{await Ee(r.id,{"custom-excali-svg":H(d)})}catch(c){console.warn("[excali-studio] 迁移后更新文档绑定失败",r.id,c)}}for(const r of this.tabs.values()){const d=s.get(C(r.data.dataPath??""));d&&(r.data.dataPath=d,r.tab.updateTitle(B(d)))}}this.settings={...this.settings,saveDir:bt},this.dirMigrated=a.length===0,this.persist(),a.length>0?$.showMessage(p("白板迁移未完成：{fail} 块失败，下次启动会重试",{fail:a.length}),1e4,"error"):s.size>0&&$.showMessage(p("已把 {n} 块白板迁入 {dir}",{n:s.size,dir:bt}),6e3)}async migrateLibraryFile(){const t=C(ct($t,"excali-library.json")),e=C(ct(bt,"excali-library.json"));try{await et(t)&&!await et(e)&&(await wt(e,await q(t)),await xt(t))}catch(i){console.warn("[excali-studio] 迁移图库文件失败（忽略）",i)}}async remapBoardPath(t){const e=C(t),i=C(ct(this.settings.saveDir,B(e)));return i===e?null:await et(i)?i:null}studioHost(){const t=this;return{load:e=>this.loadScene(e),remapPath:e=>this.remapBoardPath(e),restoreFromBackup:e=>this.restoreFromBackup(e),get accent(){return t.settings.accentStroke?ha():null},onSave:(e,i)=>this.saveSvg(e,i),saveMedia:(e,i)=>this.saveBoardMedia(e,i),openDocLink:e=>this.openBoardDocLink(e),promptFileName:(e,i)=>this.promptFileName(e,i),onRename:(e,i)=>this.renameBoard(e,i),loadLibraryItems:()=>this.loadLibraryItems(),saveLibraryItems:e=>this.saveLibraryItems(e),get showWelcome(){return t.settings.showWelcome},get gridModeEnabled(){return t.settings.gridModeEnabled},onGridChange:e=>this.rememberGrid(e),onOpenExisting:()=>this.promptOpenPath(),onNewBoard:()=>void this.openNew(),onBoardActions:(e,i)=>{i?(this.boardActions.set(e,i),this.onloadRan.has(e)||(this.onloadRan.add(e),this.runOnloadScripts(e))):(this.boardActions.delete(e),this.onloadRan.delete(e)),!i&&this.activeCustom===e&&(this.activeCustom=null),this.dockRefresh?.()},onBoardActive:e=>{this.activeCustom=e},copyBoardRef:e=>t.copyBoardRefFor(e),onRunScript:()=>void this.openScriptPicker(),listPinnedScripts:()=>this.listPinnedScripts(),onRunScriptFile:(e,i)=>void this.runScriptFile(e,i),onPinScript:(e,i)=>this.rememberScriptPin(e,i),listPinnedActions:()=>this.settings.pinnedActions,onPinAction:(e,i)=>this.rememberActionPin(e,i),getAiChannels:()=>this.settings.aiChannels,onAiChannel:(e,i)=>this.setAiChannel(e,i),getPresentationSettings:()=>this.settings.presentation,onPresentationSetting:(e,i)=>this.rememberPresentationSetting(e,i),get scriptRailCollapsed(){return t.settings.scriptRailCollapsed},get scriptRailTop(){return t.settings.scriptRailTop},onScriptRailCollapsedChange:e=>this.rememberScriptRail("scriptRailCollapsed",e),onScriptRailTopChange:e=>this.rememberScriptRail("scriptRailTop",e),get highlighter(){return t.settings.highlighter},onHighlighterChange:e=>this.rememberHighlighter(e),onHelp:()=>this.openHelp(),getLibraryImportUrl:()=>t.libraryImportUrl(),get libDirAbs(){return os(as(),t.libDirRel())},get boardDir(){return t.settings.saveDir},pickBoardPath:()=>this.pickBoardRef()}}registerStudioTab(){const t=this,e=this.studioHost();this.addTab({type:Ln,init:i=>{const o=i.element;o.classList.add("exs-panel"),o.innerHTML=`<div class="exs-loading">${p("正在打开白板…")}</div>`,this.lazyMod().then(s=>{o.innerHTML="",this.tabs.set(i,s.attachStudioTab(i,e))}).catch(s=>{console.error("[excali-studio] 画板引擎加载失败",s),o.innerHTML=`<div class="exs-loaderror"><div>${p("画板引擎加载失败：{msg}",{msg:s instanceof Error?s.message:String(s)})}</div></div>`})},destroy:function(){t.tabs.get(this)?.dispose(),t.tabs.delete(this),t.boardActions.delete(this),t.activeCustom===this&&(t.activeCustom=null),t.dockRefresh?.()}})}eaHost(){const t=this;return{getDocMarkdown:async()=>{const e=Fi()?.block?.rootID;if(!e)return"";const s=(await(await fetch("/api/block/getBlockKramdown",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e})})).json().catch(()=>null))?.data;return typeof s=="string"?s:s&&typeof s=="object"&&typeof s.kramdown=="string"?s.kramdown:""},getSelectedText:()=>{const e=window.getSelection();return e?String(e.toString()??""):""},listFiles:async e=>{try{return await ve(e||t.settings.saveDir)}catch{return[]}},readFileAsDataURL:async e=>{const i=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:C(e)})});if(!i.ok)throw new Error(`getFile HTTP ${i.status}`);const o=await i.blob();return new Promise((s,a)=>{const r=new FileReader;r.onload=()=>s(String(r.result||"")),r.onerror=()=>a(r.error||new Error("读取失败")),r.readAsDataURL(o)})},save:()=>void t.activeActions()?.flush(),notify:e=>$.showMessage(e),getSettings:()=>({saveDir:t.settings.saveDir}),getScriptSetting:(e,i)=>{const o=(Mt[e]??[]).find(a=>a.key===i);if(!o)return;const s=t.settings.scriptSettings?.[e]?.[i];return s===void 0||typeof s!=typeof o.default||o.type==="number"&&typeof s=="number"&&(!Number.isFinite(s)||o.min!==void 0&&s<o.min||o.max!==void 0&&s>o.max)||o.type==="select"&&typeof s=="string"&&o.options&&!o.options.some(a=>a.value===s)?o.default:s},setScriptSetting:(e,i,o)=>{if(!(Mt[e]??[]).find(r=>r.key===i))return;const a=t.settings.scriptSettings??{};t.settings={...t.settings,scriptSettings:{...a,[e]:{...a[e]??{},[i]:o}}},t.persist()},getHighlighter:()=>Qt(t.settings.highlighter),siyuanCall:async(e,i)=>{if(!/^(block\/(getBlockKramdown|getBlockDOM|getBlockInfo|getBlockAttrs|getBlockBreadcrumb|getChildBlocks)|export\/exportMdContent|filetree\/(getDoc|getHPathByID|getHPathByPath)|query\/sql|file\/getFile)$/.test(e))throw new Error(`只读白名单外的接口不可调用：${e}`);const s=await fetch(`/api/${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i??{})}),a=await s.json().catch(()=>null);if(!s.ok||!a||a.code!==0)throw new Error(`内核 API 失败：${e} ${a?.msg||`HTTP ${s.status}`}`);return a.data},inputPrompt:(e,i,o)=>{const s=()=>new Promise(r=>{let d=!1;const c=f=>{d||(d=!0,l.destroy(),r(f))},l=new $.Dialog({title:e,width:"340px",content:`<div class="exs-picker">
  <input class="b3-text-field fn__block exs-name-input" type="${i==="number"?"number":i==="password"?"password":"text"}" value="${at(o)}" />
  <div class="exs-name-actions">
    <button class="b3-button exs-name-cancel" type="button">${p("取消")}</button>
    <button class="b3-button exs-name-ok" type="button">${p("确定")}</button>
  </div>
</div>`,destroyCallback:()=>c(null)});l.element.classList.add("exs-name-dialog");const g=l.element.querySelector(".exs-name-input");l.element.querySelector(".exs-name-cancel").addEventListener("click",()=>c(null));const h=()=>c(g.value);l.element.querySelector(".exs-name-ok").addEventListener("click",h),g.addEventListener("keydown",f=>{f.key==="Enter"?(f.preventDefault(),h()):f.key==="Escape"&&(f.preventDefault(),c(null)),f.stopPropagation()}),setTimeout(()=>{g.focus(),g.select()},50)}),a=this.inputPromptChain.then(s,s);return this.inputPromptChain=a.catch(()=>null),a},selectOption:e=>{const i=()=>new Promise(s=>{if(e.options.length===0){s(null);return}let a=!1;const r=new $.Menu("excali-select-option",()=>{a||s(null)});for(const c of e.options)r.addItem({label:c.hint?`${c.label}（${c.hint}）`:c.label,current:c.value===e.current,click:()=>{a=!0,s(c.value)}});const d=e.at??{x:window.innerWidth/2,y:window.innerHeight/3};r.open({x:d.x,y:d.y})}),o=this.selectOptionChain.then(i,i);return this.selectOptionChain=o.catch(()=>null),o}}}async agentRun(t){try{return await t()}catch(e){return console.warn("[excali-studio] 智能体能力失败",e),{error:e instanceof Error?e.message:String(e)}}}agentBoardDir(){return H(C(this.settings.saveDir)).replace(/\/+$/,"")}async resolveAgentBoard(t){const e=typeof t.board=="string"?t.board.trim():"",i=typeof t.path=="string"&&t.path.trim()?t.path.trim():/\.svg$/i.test(e)?e:"",o=typeof t.title=="string"&&t.title.trim()?t.title.trim():/\.svg$/i.test(e)?"":e;await this.ready;const s=this.agentBoardDir();if(i){const g=H(C(i));return!/\.svg$/i.test(g)||s!==""&&!g.startsWith(`${s}/`)||!await et(g)?null:{path:C(g),title:B(g).replace(/\.svg$/i,"")}}if(!o)return null;const a=await At(this.settings.saveDir),r=o.replace(/\.svg$/i,"").toLowerCase(),d=a.filter(g=>B(g.path).replace(/\.svg$/i,"").toLowerCase()===r);if(d.length===0)return null;const l=d.find(g=>B(g.path).replace(/\.svg$/i,"")===o.replace(/\.svg$/i,""))??d[0];return{path:C(l.path),title:B(l.path).replace(/\.svg$/i,"")}}async waitForAgentActions(t,e=2e4){const i=C(t),o=Date.now()+e;for(;Date.now()<o;){for(const[s,a]of this.tabs){if(a.data.dataPath!==i)continue;const r=this.boardActions.get(s);if(r?.getEaHandle())return r}await new Promise(s=>setTimeout(s,120))}return null}agentDrawOrigin(t){const e=t.getElements().filter(o=>!o.isDeleted);if(e.length===0)return{x:0,y:0};const i=kt(e);return i?{x:i.minX,y:i.maxY+80}:{x:0,y:0}}loadAgentStyles(){return jc({list:async()=>(await ve(Ne,/\.json$/i)).map(t=>t.slice(t.lastIndexOf("/")+1)),read:t=>q(`${Ne}/${t}`)})}async agentListBoards(t){await this.ready;const e=typeof t.query=="string"?t.query.trim().toLowerCase():"",i=Number(t.limit),o=Number.isFinite(i)?Math.max(1,Math.min(100,Math.floor(i))):50,s=await At(this.settings.saveDir),a=e?s.filter(l=>l.path.toLowerCase().includes(e)||B(l.path).toLowerCase().includes(e)):s,r=a.slice(0,o).map(l=>({title:B(l.path).replace(/\.svg$/i,""),path:l.path,updated:l.updated,updatedAt:l.updated?new Date(l.updated).toISOString():""})),d=await this.loadAgentStyles(),c=Hc();return{result:`白板库 ${this.agentBoardDir()}：${a.length} 块${e?`（匹配「${e}」）`:""}。可用风格：${c.map(l=>l.name).join("/")}。`,structuredContent:{dir:this.agentBoardDir(),total:a.length,boards:r,styles:c,styleWarnings:d.warnings}}}async agentOpenBoard(t){const e=await this.resolveAgentBoard(t);if(!e)return{error:`找不到白板：${String(t.board??t.path??"")}（只认 ${this.agentBoardDir()} 下的 .svg）`};await this.openStudioTab(e.path);const i=await this.waitForAgentActions(e.path,15e3);return{result:`已打开「${e.title}」${i?"":"（画布引擎仍在加载）"}。`,structuredContent:{ok:!0,path:H(e.path),title:e.title,ready:!!i}}}async agentDrawBoard(t){await this.ready;let e=t.plan;if(typeof e=="string")try{e=JSON.parse(e)}catch{return{error:"plan 是字符串但不是合法 JSON"}}if(!e||typeof e!="object"||Array.isArray(e))return{error:"缺少 plan 对象（nodes/edges/title/preset/layout）"};const i=t.append!==!1,o=[t.board,t.path].some(y=>typeof y=="string"&&y.trim()!==""),s=i?await this.resolveAgentBoard(t):null;if(i&&o&&!s)return{error:`找不到白板：${String(t.board??t.path)}（不自动改新建，避免画错板）`};let a,r,d=!1;if(s)a=s;else{const y=e.title,x=typeof t.title=="string"&&t.title.trim()||typeof y=="string"&&y.trim()||p("AI 白板"),k=await this.createBoardFile(x);r=k.docId,a={path:k.path,title:B(k.path).replace(/\.svg$/i,"")},d=!0}await this.openStudioTab(a.path,r);const c=await this.waitForAgentActions(a.path),l=c?.getEaHandle();if(!c||!l)return{error:`白板「${a.title}」已打开，但画布引擎未在 20 秒内就绪。请手动打开后重试。`};const g=d?{x:0,y:0}:this.agentDrawOrigin(l),h=await this.loadAgentStyles(),f=[t.style,t.preset].find(y=>typeof y=="string"&&y.trim()!==""),u=wc(e,{origin:g,idPrefix:Be("ai"),preset:f,layout:t.layout});l.addElements(u.specs);let w=0;for(const y of u.routes){const x=l.connectObjects(y.fromElementId,y.side1,y.toElementId,y.side2,4);x&&(w+=1,l.patchElements([x],{x:y.p1.x,y:y.p1.y,points:y.points,strokeColor:u.preset.edge,strokeWidth:u.preset.strokeWidth,strokeStyle:u.preset.strokeStyle,roughness:u.preset.roughness}))}l.selectElements(u.nodes.map(y=>y.elementId)),l.scrollToContent();let m=!1;try{m=await c.flush()}catch{m=!1}const b={ok:!0,created:d,path:H(a.path),title:a.title,nodes:u.nodes.length,edges:w,preset:u.plan.preset,layout:u.plan.layout,styleWarnings:h.warnings,saved:m,origin:g,warnings:u.plan.warnings};return{result:`${d?"已新建":"已绘制到"}「${a.title}」：${b.nodes} 个节点、${b.edges} 条连线（${b.path}）${m?"。":"；落盘失败，稍后自动保存会重试。"}`+(b.warnings.length?` 忽略 ${b.warnings.length} 条计划警告。`:""),structuredContent:b}}async agentGenerateImage(t){await this.ready;const e=typeof t.prompt=="string"?t.prompt.trim():"";if(!e)return{error:"prompt 不能为空"};const i=t.append!==!1,o=[t.board,t.path].some(x=>typeof x=="string"&&x.trim()!==""),s=i?await this.resolveAgentBoard(t):null;if(i&&o&&!s)return{error:`找不到白板：${String(t.board??t.path)}（不自动改新建，避免插错板）`};let a;try{a=await Jc({baseUrl:this.settings.imageBaseUrl,model:this.settings.imageModel,apiKey:this.settings.imageApiKey,size:this.settings.imageSize},e,Vc(),{size:typeof t.size=="string"&&t.size.trim()?t.size.trim():void 0})}catch(x){return{error:x instanceof Error?x.message:String(x)}}let r,d,c=!1;if(s)r=s;else{const x=typeof t.title=="string"&&t.title.trim()||p("AI 图片"),k=await this.createBoardFile(x);d=k.docId,r={path:k.path,title:B(k.path).replace(/\.svg$/i,"")},c=!0}await this.openStudioTab(r.path,d);const l=await this.waitForAgentActions(r.path),g=l?.getEaHandle();if(!l||!g)return{error:`图片已生成，但白板「${r.title}」的画布未在 20 秒内就绪，未插入。请手动打开后重试（会重新生成一张图）。`};const h=c?{x:0,y:0}:this.agentDrawOrigin(g),f=this.agentImageDimension(t.width)??a.width,u=this.agentImageDimension(t.height)??a.height;let w="";try{w=await g.addImage(a.dataURL,{...h,width:f,height:u})}catch(x){return{error:`图片已生成，但插入画布失败：${x instanceof Error?x.message:String(x)}`}}g.selectElements([w]),g.scrollToElement(w);let m=!1;try{m=await l.flush()}catch{m=!1}const b=Math.floor(a.base64.length*3/4),y={ok:!0,created:c,path:H(r.path),title:r.title,imageId:w,width:f,height:u,mime:a.mime,bytes:b,revisedPrompt:a.revisedPrompt??"",saved:m,origin:h};return{result:`${c?"已新建并插入":"已插入"}图片到「${r.title}」：${f}×${u}（${y.path}）${m?"。":"；落盘失败，稍后自动保存会重试。"}`+(a.revisedPrompt?` 模型改写：${a.revisedPrompt}`:""),structuredContent:y}}agentImageDimension(t){if(t==null||t==="")return;const e=Number(t);if(Number.isFinite(e))return Math.max(64,Math.min(4096,Math.round(e)))}registerAgentCapabilities(){if(typeof this.addAgentCapability=="function"&&this.settings.aiChannels.agent)try{this.addAgentCapability({name:"excali_list_boards",title:p("列出 Excali 白板"),description:p("列出白板库里的白板（标题、路径、更新时间），可按 query 过滤。只读。"),inputSchema:{type:"object",properties:{query:{type:"string",description:p("按标题/路径过滤（不区分大小写）")},limit:{type:"number",minimum:1,maximum:100,description:p("最多返回条数，默认 50")}}},effects:{localRead:!0},handler:t=>this.agentRun(()=>this.agentListBoards(t))}),this.addAgentCapability({name:"excali_open_board",title:p("打开 Excali 白板"),description:p("打开指定白板并等待画布就绪；board 传标题，path 传保存目录下的路径。"),inputSchema:{type:"object",properties:{board:{type:"string",description:p("白板标题（不含 .svg）")},path:{type:"string",description:p("白板路径，如 assets/excali/foo.svg")}}},effects:{localRead:!0},handler:t=>this.agentRun(()=>this.agentOpenBoard(t))}),this.addAgentCapability({name:"excali_draw_board",title:p("用 AI 计划绘制 Excali 白板"),description:p("把结构化计划（nodes/edges）画成白板：board 为空则新建，有值则追加到已有白板；自动布局、配色并保存。"),inputSchema:{type:"object",properties:{plan:{type:"object",description:p("绘图计划：{ title, caption, preset, layout, groups, nodes: [{id,label,shape,group,rank,order}], edges: [{from,to,label}] }"),properties:{title:{type:"string"},caption:{type:"string"},preset:{type:"string",description:p("pencil/marker/blueprint 或 data/assets/excali-styles 里的风格包名")},layout:{type:"string",enum:["lr","tb","grid","radial"]},groups:{type:["object","array"],description:p("要画框的分组：{ 组名: 框标题 }，组名对应 node.group；同组节点在层内挨着放，框包住非成员时会返回 warning")},nodes:{type:"array",description:p("节点：字符串，或 {id,label,shape,group,rank,order}。rank = lr/tb 里钉在第几层（0 起）；order = 层内先后，与位次比较（0 = 最前；grid 里是格子、radial 里是环上）。都可省略"),items:{type:["string","object"]}},edges:{type:"array",items:{type:["string","object","array"]}}},required:["nodes"]},board:{type:"string",description:p("追加到已有白板的标题或路径；省略则新建")},title:{type:"string",description:p("新建白板的文件名；省略用计划标题或「AI 白板」")},append:{type:"boolean",description:p("board 指向已有白板时是否追加，默认 true")},style:{type:"string",description:p("风格包名：内置预设，或 assets/excali-styles 目录里的 json 包；与 preset 同义，优先 style")},preset:{type:"string",description:p("覆盖计划内的风格")},layout:{type:"string",enum:["lr","tb","grid","radial"],description:p("覆盖计划内的布局")}},required:["plan"]},effects:{localRead:!0,localWrite:!0},handler:t=>this.agentRun(()=>this.agentDrawBoard(t))}),this.addAgentCapability({name:"excali_generate_image",title:p("生成图片并插入 Excali 白板"),description:p("调用设置里的 OpenAI 兼容图像 API 生成一张位图，插入已有白板或新建白板；图片不可编辑。需要先在插件设置里填 API 地址和 Key。"),inputSchema:{type:"object",properties:{prompt:{type:"string",description:p("画面描述（主体、风格、构图；上限 4000 字符）")},board:{type:"string",description:p("插入到已有白板的标题或路径；省略则新建")},title:{type:"string",description:p("新白板文件名；省略用「AI 图片」")},append:{type:"boolean",description:p("board 指向已有白板时是否插入到该板，默认 true")},width:{type:"number",minimum:64,maximum:4096,description:p("图像显示宽度；省略按原图尺寸")},height:{type:"number",minimum:64,maximum:4096,description:p("图像显示高度；省略按原图尺寸")},size:{type:"string",description:p("尺寸覆盖（如 1024x1024）；省略用设置里的值")}},required:["prompt"]},effects:{localRead:!0,localWrite:!0},handler:t=>this.agentRun(()=>this.agentGenerateImage(t))})}catch(t){console.warn("[excali-studio] 注册智能体能力失败（思源版本可能不支持）",t)}}openScriptPicker(){if(!this.settings.aiChannels.script){$.showMessage(p("脚本通道已在「AI 通道」面板里关闭"));return}this.scriptPickerDialog||(async()=>{const t=await zt();if(t.length===0){$.showMessage(p("还没有脚本：首次启用会自动安装内置脚本到 {dir}",{dir:Z}),7e3);return}const e=new Set(this.settings.pinnedScripts),i=m=>qo[m]??Cn,o=m=>`<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${m}"/></svg>`,s=m=>{const b=Mt[m.name];return!b||b.length===0?"":`<div class="exs-script-settings" data-settings hidden>${b.map(x=>{const k=this.eaHost().getScriptSetting(m.name,x.key),S=k===void 0?x.default:k,E=at(x.key),v=x.type==="select"?`<select class="b3-select" data-key="${E}">${(x.options??[]).map(I=>`<option value="${at(I.value)}"${String(I.value)===String(S)?" selected":""}>${Y(I.label)}</option>`).join("")}</select>`:x.type==="toggle"?`<input class="b3-switch" type="checkbox" data-key="${E}"${S?" checked":""} />`:`<input class="b3-text-field" type="number" data-key="${E}" value="${at(String(S))}"${x.min!==void 0?` min="${x.min}"`:""}${x.max!==void 0?` max="${x.max}"`:""} />`;return`<div class="exs-script-settings__field"><label>${Y(x.label)}</label>${v}</div>`}).join("")}<div class="exs-script-settings__tip">${p("保存即生效；脚本运行时弹窗会用它预填，仍可临时改一次。")}</div></div>`},a=`<div class="exs-picker__hint"><b>${p("脚本使用说明")}</b>${p("点一条立即对当前画布执行；先框选画布元素再跑 = 对选中操作（对齐、连线、标注类）；先打开文档页签再跑 = 读文档内容（思维导图、表格类）。行尾按钮可固定到画布右缘侧边栏 / 改脚本设置（也可右键一条固定）。脚本就是 {dir} 下的 Markdown，可直接编辑，文件头加 @excalidraw-onload 则画布打开时自动运行。",{dir:Z})}</div>`,r=new Set(this.settings.pinnedActions),d=(m,b)=>m?{do:p("固定到右上角"),done:p("已固定在右上角")}:{do:p("固定到侧边栏"),done:p("已固定到侧边栏")},c=m=>{const b=r.has(m.id),y=d(xe(m)==="top-right");return`<div class="b3-list-item exs-script-item${b?" exs-script-item--pinned":""}" data-rail-action="${at(m.id)}" title="${at(m.id)}"><div class="exs-script-item__head"><span class="b3-list-item__text"><span class="exs-script-item__icon">${o(m.icon)}</span>${Y(p(m.title))}${b?` <span class="exs-script-pin" title="${y.done}"></span>`:""}</span><span class="exs-script-item__actions"><button type="button" class="b3-button b3-button--text${b?" exs-script-item__btn--on":""}" data-act="pin" title="${b?y.done:y.do}">${o(Tn)}</button></span></div><span class="exs-script-desc">${Y(p(m.desc))}</span></div>`},l=ze.map(c).join(""),g=t.map((m,b)=>{const y=Mt[m.name]??[],x=e.has(m.name);return`<div class="b3-list-item exs-script-item${x?" exs-script-item--pinned":""}" data-idx="${b}" title="${Y(m.name)}"><div class="exs-script-item__head"><span class="b3-list-item__text"><span class="exs-script-item__icon">${o(i(m.name))}</span>${Y(m.title)}${m.onload?` <span class="exs-script-badge">${p("打开时自动运行")}</span>`:""}${x?` <span class="exs-script-pin" title="${p("已固定到侧边栏")}"></span>`:""}</span><span class="exs-script-item__actions">${y.length>0?`<button type="button" class="b3-button b3-button--text" data-act="gear" title="${p("脚本设置")}">${o(Cn)}</button>`:""}<button type="button" class="b3-button b3-button--text${x?" exs-script-item__btn--on":""}" data-act="pin" title="${p(x?"已固定到侧边栏":"固定到侧边栏")}">${o(Tn)}</button></span></div>${m.description?`<span class="exs-script-desc">${Y(m.description)}</span>`:`<span class="b3-list-item__meta">${Y(m.name)}</span>`}${s(m)}</div>`}).join(""),h=await Ui(),f=h.length>0?`<div class="exs-picker__outdated"><span>${p("{n} 个内置脚本有新版本",{n:h.length})}${p("旧版内置脚本行为可能和插件不一致，重置会覆盖你在这些脚本里的修改（自建脚本不受影响）。")}</span><button type="button" class="b3-button b3-button--text" data-act="reset">${p("重置为最新版")}</button></div>`:"",u=new $.Dialog({title:p("拓展功能"),width:"520px",content:`<div class="exs-picker">${f}${l}${a}<div class="exs-picker__group">${p("脚本库")}</div><div class="b3-list b3-list--background exs-board-list">${g}</div></div>`,destroyCallback:()=>{this.scriptPickerDialog===u&&(this.scriptPickerDialog=null),window.dispatchEvent(new CustomEvent(be,{detail:{pickerOpen:!1}}))}});u.element.classList.add("exs-picker-dialog"),this.scriptPickerDialog=u,window.dispatchEvent(new CustomEvent(be,{detail:{pickerOpen:!0}}));const w=(m,b,y=!1)=>{const x=d(y);m.classList.toggle("exs-script-item--pinned",b);const k=m.querySelector('[data-act="pin"]');k&&(k.classList.toggle("exs-script-item__btn--on",b),k.title=b?x.done:x.do);const S=m.querySelector(".exs-script-pin");if(b&&!S){const E=document.createElement("span");E.className="exs-script-pin",E.title=x.done,m.querySelector(".b3-list-item__text")?.appendChild(E)}else!b&&S&&S.remove()};u.element.addEventListener("click",m=>{if(m.target?.closest?.('[data-act="reset"]')){(async()=>{const E=await rr();$.showMessage(p("已重置 {n} 个内置脚本",{n:E}),3e3),u.destroy(),this.openScriptPicker()})();return}const b=m.target?.closest?.("[data-rail-action]");if(b){const E=b.dataset.railAction??"";if(!De(E))return;if(m.target?.closest?.('[data-act="pin"]')){const v=xe(Rn(E))==="top-right",I=this.settings.pinnedActions.includes(E);this.rememberActionPin(E,!I),w(b,!I,v);return}u.destroy(),this.runRailAction(E);return}const y=m.target?.closest?.(".exs-script-item"),x=y?.dataset?.idx;if(!y||x===void 0)return;const k=t[Number(x)];if(!k)return;const S=m.target?.closest?.("[data-act]");if(S){if(S.dataset.act==="pin"){const E=this.settings.pinnedScripts.includes(k.name);this.rememberScriptPin(k.name,!E),w(y,!E)}else if(S.dataset.act==="gear"){const E=y.querySelector(".exs-script-settings");if(E){const v=E.hasAttribute("hidden");u.element.querySelectorAll(".exs-script-settings").forEach(I=>{I!==E&&I.setAttribute("hidden","")}),u.element.querySelectorAll('[data-act="gear"]').forEach(I=>{I!==S&&I.classList.remove("exs-script-item__btn--on")}),v?E.removeAttribute("hidden"):E.setAttribute("hidden",""),S.classList.toggle("exs-script-item__btn--on",v)}}return}m.target?.closest?.(".exs-script-settings")||(u.destroy(),this.runScriptOnActiveBoard(k,{shift:m.shiftKey,at:{x:m.clientX,y:m.clientY}}))}),u.element.addEventListener("change",m=>{const b=m.target,y=b?.closest?.(".exs-script-settings");if(!y||!b?.dataset?.key)return;const k=y.closest(".exs-script-item")?.dataset?.idx;if(k===void 0)return;const S=t[Number(k)];if(!S)return;const E=b.dataset.key,v=(Mt[S.name]??[]).find(M=>M.key===E);if(!v)return;const I=v.type==="number"?Math.max(v.min??0,Math.min(v.max??Number.MAX_SAFE_INTEGER,Number(b.value)||0)):v.type==="toggle"?b.checked:b.value;this.eaHost().setScriptSetting(S.name,E,I),$.showMessage(p("已保存：{name} › {label}",{name:S.title,label:v.label}),3e3)}),u.element.addEventListener("contextmenu",m=>{const b=m.target?.closest?.("[data-rail-action]");if(b){const v=b.dataset.railAction??"";if(!De(v))return;m.preventDefault();const I=xe(Rn(v))==="top-right",M=this.settings.pinnedActions.includes(v),_=d(I),A=new $.Menu;A.addItem({label:M?_.done:_.do,click:()=>{this.rememberActionPin(v,!M),w(b,!M,I)}}),A.open({x:m.clientX,y:m.clientY});return}const y=m.target?.closest?.(".exs-script-item"),x=y?.dataset?.idx;if(!y||x===void 0)return;const k=t[Number(x)];if(!k)return;m.preventDefault();const S=this.settings.pinnedScripts.includes(k.name),E=new $.Menu;E.addItem({label:p(S?"从侧边栏取消固定":"固定到侧边栏"),click:()=>{this.rememberScriptPin(k.name,!S),w(y,!S)}}),E.open({x:m.clientX,y:m.clientY})})})()}async listPinnedScripts(){if(this.settings.pinnedScripts.length===0)return[];let t=[];try{t=await zt()}catch{return[]}return this.settings.pinnedScripts.map(e=>t.find(i=>i.name===e)).filter(e=>!!e).map(e=>({name:e.name,title:e.title}))}async runScriptFile(t,e){let i=[];try{i=await zt()}catch{i=[]}const o=i.find(s=>s.name===t);if(!o){$.showMessage(p("找不到脚本：{name}",{name:t}),7e3,"error");return}await this.runScriptOnActiveBoard(o,e)}rememberScriptPin(t,e){const i=this.settings.pinnedScripts,o=e?i.includes(t)?i:[...i,t]:i.filter(s=>s!==t);o.length===i.length&&o.every((s,a)=>s===i[a])||(this.settings={...this.settings,pinnedScripts:o},this.persist(),window.dispatchEvent(new CustomEvent($n)))}rememberActionPin(t,e){const i=this.settings.pinnedActions,o=e?i.includes(t)?i:[...i,t]:i.filter(s=>s!==t);o.length===i.length&&o.every((s,a)=>s===i[a])||(this.settings={...this.settings,pinnedActions:o},this.persist(),window.dispatchEvent(new CustomEvent($n)))}setAiChannel(t,e){this.settings.aiChannels[t]!==e&&(this.settings={...this.settings,aiChannels:{...this.settings.aiChannels,[t]:e}},this.persist(),t==="agent"&&$.showMessage(p(e?"内置智能体通道已开启：重载思源后注册生效":"内置智能体通道已关闭：重载思源后彻底摘除"),6e3))}async runRailAction(t){if(t===Ii){const o=this.activeActions();if(!o){$.showMessage(p("先打开一块白板，再改外框颜色"));return}o.openOutlinePalette();return}if(t===Ci){const o=this.activeActions();if(!o){$.showMessage(p("先打开一块白板，再转换图片"));return}o.openImageToMaterial();return}if(t===Ti){const o=this.activeActions();if(!o){$.showMessage(p("先打开一块白板，再放映"));return}o.openPresentation();return}if(t!==He)return;const e=this.activeActions();if(!e){$.showMessage(p("先打开一块白板，再往里插卡片"));return}const i=await this.pickBoardRef();i&&e.insertBoardCard(i,B(i).replace(/\.svg$/i,""))}rememberScriptRail(t,e){this.settings[t]!==e&&(this.settings={...this.settings,[t]:e},this.persist(),window.dispatchEvent(new CustomEvent(be,{detail:{[t]:e}})))}rememberHighlighter(t){const e=Qt(t),i=this.settings.highlighter;i.color===e.color&&i.width===e.width&&i.opacity===e.opacity||(this.settings={...this.settings,highlighter:e},this.persist(),window.dispatchEvent(new CustomEvent(No,{detail:e})))}rememberPresentationSetting(t,e){const i=Oi({...this.settings.presentation,[t]:e});this.settings.presentation[t]!==i[t]&&(this.settings={...this.settings,presentation:i},this.persist())}async runScriptOnActiveBoard(t,e){if(!this.settings.aiChannels.script){$.showMessage(p("脚本通道已在「AI 通道」面板里关闭"));return}const o=this.activeActions()?.getEaHandle()??null;if(!o){$.showMessage(p("没有可运行脚本的白板：请先打开一张"));return}let s;try{s=await Oe(t.path)}catch(d){$.showMessage(p("读取脚本失败：{msg}",{msg:d instanceof Error?d.message:String(d)}),7e3,"error");return}const a=zn(o,this.eaHost(),t.name,e),r=await Fn(s.code,a,a.utils);r.logs.length>0&&console.log(`[excali-studio][脚本] ${t.title}
${r.logs.join(`
`)}`),r.ok?$.showMessage(p("脚本「{title}」运行成功（{ms}ms）",{title:t.title,ms:r.durationMs})):$.showMessage(p("脚本「{title}」运行失败：{msg}",{title:t.title,msg:(r.error||"").split(`
`)[0]}),1e4,"error")}async runOnloadScripts(t){let e=[];try{e=(await zt()).filter(i=>i.onload)}catch{return}for(const i of e){const s=this.boardActions.get(t)?.getEaHandle()??null;if(s)try{const a=await Oe(i.path),r=zn(s,this.eaHost(),i.name),d=await Fn(a.code,r,r.utils);d.logs.length>0&&console.log(`[excali-studio][onload 脚本] ${i.title}
${d.logs.join(`
`)}`),d.ok||console.warn(`[excali-studio][onload 脚本失败] ${i.title}: ${(d.error||"").split(`
`)[0]}`)}catch(a){console.warn("[excali-studio][onload 脚本异常]",i.title,a)}}}activeActions(){return this.activeCustom?this.boardActions.get(this.activeCustom)??null:null}registerDock(){const t=this,e={openNew:()=>void this.openNew(),deleteActiveBoard:()=>t.deleteActiveBoard(),getBoardFiles:()=>{const i=new Set;for(const o of t.tabs.values())typeof o.data.dataPath=="string"&&i.add(o.data.dataPath);return{files:t.boardFiles,opened:i}},refreshBoardLib:()=>void t.refreshBoardLib(),openBoardFile:i=>void t.openStudioTab(i.dataPath,i.docId||void 0),openDocOf:i=>t.openDocumentById(i),renameBoardFile:i=>void t.renameFromDock(i),deleteBoardFile:i=>void t.deleteBoardFile(i),openFileMenu:(i,o,s)=>t.openFileMenu(i,o,s),hasActiveBoard:()=>t.activeCustom!==null&&t.tabs.has(t.activeCustom),onRefresh:i=>{this.dockRefresh=i}};this.addDock({id:this.name+"-dock",type:"excali_studio_dock",config:{position:"LeftBottom",size:{width:300,height:0},icon:rt,title:p("Excali 白板")},data:{name:this.name},init:i=>{const o=Ya(e),s=i.element;s.innerHTML="",s.appendChild(o.element),this.dockRefresh=o.refresh,o.refresh()},destroy:()=>{this.dockRefresh=null}})}openHelp(){const e=[["⌘⌥E",p("新建白板")],["⌘S",p("保存（已有文件静默覆盖）")],["⌘⇧E",p("导出图片…")],[p("空格 + 拖动"),p("平移画布")],[p("滚轮"),p("缩放画布")],[p("画布右键菜单"),p("只读 / 禅模式 / 网格 / 统计")]].map(([i,o])=>`<div class="exs-help__row"><span class="exs-help__key">${Y(i)}</span><span>${Y(o)}</span></div>`).join("");new $.Dialog({title:p("帮助"),width:"420px",content:`<div class="exs-help">${e}</div>`,destroyCallback:()=>{}})}async openStudioTab(t,e){const i=t?C(t):null;if(i){const a=[...this.tabs.values()].find(r=>r.data.dataPath===i);if(a){a.tab.parent.switchTab(a.tab.headElement);return}}if(sa()){this.openMobileStudio(i,e);return}const o=new Set(this.tabs.values());await $.openTab({app:this.app,openNewTab:!0,custom:{id:this.name+Ln,icon:rt,title:i?B(i):p("未命名白板"),data:{dataPath:i,docId:e}}});const s=[...this.tabs.values()].find(a=>!o.has(a));s&&s.tab.parent.switchTab(s.tab.headElement)}openMobileStudio(t,e){const i={dataPath:t,docId:e},o={custom:null},s=oa({data:i,onDispose:()=>{const d=o.custom;d&&(this.tabs.delete(d),this.boardActions.delete(d),this.onloadRan.delete(d),this.activeCustom===d&&(this.activeCustom=null),this.dockRefresh?.())}}),a=s.custom;o.custom=a;const r={tab:a.tab,data:i,requestClose:()=>s.close(),closeForDelete:()=>s.close(),dispose:()=>{}};this.tabs.set(a,r),this.dockRefresh?.(),this.lazyMod().then(d=>{if(s.isClosed())return;s.body.replaceChildren();const c=d.attachStudioTab(a,this.studioHost());if(s.isClosed()){c.dispose();return}this.tabs.set(a,c),s.mount(c),this.dockRefresh?.()}).catch(d=>{s.isClosed()||(console.error("[excali-studio] 画板引擎加载失败",d),s.showError(p("画板引擎加载失败：{msg}",{msg:d instanceof Error?d.message:String(d)})))})}async loadScene(t){if(!t)return null;await this.ready;const e=await q(t),{decodeSvgScene:i}=await this.lazyMod(),o=await i(e,s=>this.hydrateSceneFiles(s));return this.rememberRecent(t),o}async hydrateSceneFiles(t){const e={};for(const[i,o]of Object.entries(t)){const s=o??{};if(typeof s.dataURL=="string"&&s.dataURL!==""){e[i]=o;continue}if(typeof s.path!="string"||s.path===""){e[i]=o;continue}try{const a=await ia(s.path),r=typeof s.mimeType=="string"&&s.mimeType!==""?s.mimeType:"image/png";e[i]={...s,dataURL:da(a,r)}}catch(a){console.warn("[excali-studio] 白板图片读回失败（该图会显示为空框）",s.path,a),e[i]=o}}return e}async saveBoardMedia(t,e){const i=ra(t);if(!i)throw new Error(p("无法解析图片数据"));const o=await la(i.bytes,i.mime||e),s=`${aa}/${o}`;return await na(s,i.bytes,i.mime||e),s}openBoardDocLink(t){const e=Aa(t);if(e){this.openLinkedBoard(e);return}const i=ka(t);if(!i){$.showMessage(p("无法识别的文档链接：{link}",{link:t}),5e3,"error");return}this.openDocOf(i)}async openLinkedBoard(t){if(!await et(t)){$.showMessage(p("这块白板已经不在了：{path}",{path:H(t)}),5e3,"error");return}await this.openExisting(t)}async restoreFromBackup(t){const e=C(t);for(const i of Ni(e))try{const o=await q(i);if(!$o(o))continue;return await Ct(e,o),_e(e),!0}catch{}return!1}buildTopMenu(t){t.addItem({icon:"iconAdd",label:p("新建白板"),click:()=>void this.openNew()}),t.addSeparator(),this.recent.length===0?t.addItem({type:"readonly",label:p("还没有打开或保存过白板")}):(this.recent.slice(0,tl).forEach(e=>{const i=t.addItem({label:B(e),click:()=>void this.openExisting(e)});i instanceof HTMLElement&&i.setAttribute("title",e)}),t.addItem({label:p("清空最近记录"),click:()=>this.clearRecent()})),t.addSeparator(),t.addItem({icon:"iconOpen",label:p("按路径打开…"),click:()=>this.promptOpenPath()}),t.addItem({icon:"iconFolder",label:p("打开白板…"),click:()=>void this.openBoardPicker()}),t.addItem({icon:"iconSettings",label:p("设置"),click:()=>this.openSetting()})}registerBlockIconMenu(){this.eventBus.on("click-blockicon",({detail:t})=>{const e=ja(t.blockElements);e&&t.menu.addItem({icon:rt,label:p("用 Excali 白板打开"),click:()=>void this.openExisting(e)})})}async refreshBoardLib(){if(this.libLoading)return;this.libLoading=!0;let t=[];try{await this.ready;try{t=(await Bn()).map(pa),this.boardDocs=t,this.boardSvgByDocId=new Map(t.map(i=>[i.docId,i.svg]))}catch(i){t=this.boardDocs,console.warn("[excali-studio] 白板文档查询失败（沿用上次绑定）",i)}let e=null;try{e=await At(this.settings.saveDir)}catch(i){console.warn("[excali-studio] 白板库读保存目录失败",i)}e&&(this.boardFiles=ga(e,t))}finally{this.libLoading=!1}this.dockRefresh?.()}rememberBoardDoc(t,e,i){this.boardSvgByDocId.set(t,i);const o={docId:t,title:e||p("无标题"),hpath:"",svg:i,updated:Date.now(),refs:0};this.boardDocs=[o,...this.boardDocs.filter(a=>a.docId!==t)];const s=C(i);this.boardFiles=this.boardFiles.map(a=>a.dataPath===s?{...a,docId:t,docTitle:e||p("无标题")}:a)}async adoptBoardFile(t){if(t.docId)return null;const e=await Oa()??await Na();if(!e)return $.showMessage(p("找不到笔记本，无法建档"),7e3,"error"),null;const i=t.name.replace(/\.svg$/i,"")||t.name;try{const o=await La(e,ya(this.settings.boardDir,i),""),s=H(t.dataPath);await Da(o,s,i),await Ee(o,{"custom-excali-svg":s}),this.rememberBoardDoc(o,i,s);const a=[...this.tabs.values()].find(r=>r.data.dataPath===t.dataPath);return a&&!a.data.docId&&(a.data.docId=o),$.showMessage(p("已建档《{title}》",{title:i}),5e3),this.dockRefresh?.(),o}catch(o){return $.showMessage(p("建档失败：{msg}",{msg:o instanceof Error?o.message:String(o)}),1e4,"error"),null}}async autoOpenBoardForDoc(t){if(!this.settings.autoOpenBoard||this.autoOpenedDocs.has(t))return;this.autoOpenedDocs.add(t);let e=this.boardSvgByDocId.get(t);if(e===void 0){try{e=(await Ba(t))["custom-excali-svg"]||""}catch{e=""}this.boardSvgByDocId.set(t,e)}e&&await this.openStudioTab(e,t)}registerBoardDocEvents(){this.eventBus.on("switch-protyle",({detail:t})=>{const e=t?.protyle?.block?.rootID;typeof e=="string"&&e!==""&&this.autoOpenBoardForDoc(e)}),this.eventBus.on("open-menu-doctree",({detail:t})=>{const e=t.elements?.[0];if(!e||e.getAttribute("data-type")!=="navigation-file")return;const i=e.getAttribute("data-node-id")||"",o=i?this.boardSvgByDocId.get(i):void 0;o&&t.menu.addItem({icon:rt,label:p("在画板中打开"),click:()=>void this.openStudioTab(o,i)})}),this.eventBus.on("open-menu-filetab",t=>{try{const e=t.detail,i=e?.protyle?.protyle?.block?.rootID||e?.protyle?.block?.rootID||"";if(!i)return;const o=this.boardSvgByDocId.get(i);if(!o)return;e?.menu?.addItem({icon:rt,label:p("在画板中打开"),click:()=>void this.openStudioTab(o,i)})}catch(e){console.warn("[excali-studio] 文件页签菜单注入失败",e)}})}copyText(t,e){const i=()=>$.showMessage(e,3e3);try{navigator.clipboard?.writeText?navigator.clipboard.writeText(t).then(i,()=>this.fallbackCopy(t,i)):this.fallbackCopy(t,i)}catch{this.fallbackCopy(t,i)}}fallbackCopy(t,e){try{const i=document.createElement("textarea");i.value=t,i.style.position="fixed",i.style.opacity="0",document.body.appendChild(i),i.select();const o=document.execCommand("copy");i.remove(),o?e():$.showMessage(p("复制失败：{msg}",{msg:"execCommand"}),7e3,"error")}catch(i){$.showMessage(p("复制失败：{msg}",{msg:i instanceof Error?i.message:String(i)}),7e3,"error")}}openFileMenu(t,e,i){const o=new $.Menu("excali-file-menu");o.addItem({icon:"iconEdit",label:p("在画板中打开"),click:()=>void this.openBoardFile(t)}),o.addItem({icon:"iconRight",label:p("插入到当前画布"),click:()=>this.insertBoardCardToActive(t)}),t.docId?(o.addItem({icon:"iconFile",label:p("打开存档文档"),click:()=>this.openDocOf(t.docId)}),o.addItem({icon:"iconCopy",label:p("复制嵌入引用"),click:()=>this.copyText(Pn(t.docId),p("已复制嵌入引用"))}),o.addItem({icon:"iconCopy",label:p("复制行内引用"),click:()=>this.copyText(xa(t.docId,t.docTitle),p("已复制行内引用"))})):o.addItem({icon:"iconAdd",label:p("建档"),click:()=>void this.adoptBoardFile(t)}),o.addItem({icon:"iconRename",label:p("重命名"),click:()=>void this.renameFromDock(t)}),o.addSeparator(),o.addItem({icon:"iconTrash",label:p("删除…"),click:()=>void this.deleteBoardFile(t)}),o.open({x:e,y:i})}openBoardFile(t){return this.openStudioTab(t.dataPath,t.docId||void 0)}insertBoardCardToActive(t){const e=this.activeActions();if(!e){$.showMessage(p("先打开一块白板，再往里插卡片"));return}e.insertBoardCard(H(t.dataPath),Pe(t))}openDocOf(t){this.openDocumentById(t)}openDocumentById(t){const e=window,i=e.openMobileFileById??e.siyuan?.openMobileFileById;if(e.siyuan?.mobile&&typeof i=="function")try{i(this.app,t,[],"start");return}catch(o){console.warn("[excali-studio] 移动端打开文档失败，回落页签",o)}$.openTab({app:this.app,doc:{id:t}}).catch(o=>{$.showMessage(p("打开文档失败：{msg}",{msg:o instanceof Error?o.message:String(o)}),7e3)})}async deleteBoardFile(t){const e=wa(t),i=e.doc?`，以及存档文档《${e.doc.title}》`:"";$.confirm(p("删除白板"),p("将删除白板文件 {name} 及其备份（如存在）{doc}。删除不可恢复；白板开着时，画布上未保存的改动也会一并丢弃。",{name:t.name,doc:i}),()=>{(async()=>{try{for(const o of[...this.tabs.values()])o.data.dataPath===t.dataPath&&o.closeForDelete();await xt(e.svgPath);for(const o of e.bakPaths)try{await xt(o)}catch{}if(e.doc)try{await Pa(e.doc.id)}catch(o){console.warn("[excali-studio] 删除存档文档失败（文件已删）",e.doc.id,o)}this.boardFiles=this.boardFiles.filter(o=>o.dataPath!==t.dataPath),this.boardDocs=this.boardDocs.filter(o=>o.docId!==e.doc?.id),e.doc&&this.boardSvgByDocId.delete(e.doc.id),this.recent=this.recent.filter(o=>o!==t.dataPath),this.persist(),this.dockRefresh?.(),$.showMessage(p("已删除《{name}》",{name:t.name}),5e3)}catch(o){$.showMessage(p("删除失败：{msg}",{msg:o instanceof Error?o.message:String(o)}),1e4,"error")}})()})}deleteActiveBoard(){const t=this.activeCustom?this.tabs.get(this.activeCustom)?.data.dataPath:null;if(!t){$.showMessage(p("没有可删除的白板：当前没有打开已保存的白板"),7e3);return}const e=this.boardFiles.find(i=>i.dataPath===t);if(!e){this.refreshBoardLib().then(()=>{const i=this.boardFiles.find(o=>o.dataPath===t);i?this.deleteBoardFile(i):$.showMessage(p("删除失败：{msg}",{msg:t}),7e3,"error")});return}this.deleteBoardFile(e)}async renameFromDock(t){const e=await this.promptFileName(t.name,p("重命名白板"));if(e)try{const i=await this.renameBoard(t.dataPath,e);this.applyRenameToSession(t.dataPath,i),$.showMessage(p("已重命名为 {name}",{name:B(i)}),5e3)}catch(i){$.showMessage(p("重命名失败：{msg}",{msg:i instanceof Error?i.message:String(i)}),7e3,"error")}}applyRenameToSession(t,e){for(const i of this.tabs.values())i.data.dataPath===t&&(i.data.dataPath=e,i.tab.updateTitle(B(e)))}copyBoardRefFor(t){const e=this.tabs.get(t);if(!e)return;const i=e.data.dataPath,o=e.data.docId??(i?this.boardDocs.find(s=>C(s.svg)===i)?.docId:void 0);if(!o){$.showMessage(p("还没建档，复制不了引用：在白板行右键「建档」"),7e3);return}this.copyText(Pn(o),p("已复制嵌入引用"))}async runCheckup(){if(!this.checkupRunning){this.checkupRunning=!0;try{await this.refreshBoardLib();const t=[];for(const i of this.boardDocs)await et(C(i.svg))||t.push(i);if(t.length===0){$.showMessage(p("体检完成：没有断链的白板文档"),5e3);return}const e=i=>i.length===0?`<p class="exs-check__none">${p("没有")}</p>`:i.map(o=>`<div class="exs-check__row" title="${at(o.tip)}"><span class="exs-check__name">${Y(o.name)}</span><code class="exs-check__path">${Y(o.sub)}</code></div>`).join("");new $.Dialog({title:p("白板体检"),width:"560px",content:`<div class="exs-check">
          <div class="exs-check__group">${p("断链文档：{n}",{n:t.length})}</div>
          ${e(t.map(i=>({name:i.title,sub:B(i.svg),tip:C(i.svg)})))}
          <p class="exs-check__hint">${p("断链文档需手动重新保存或删除；未建档的白板文件是正常状态，不用处理")}</p>
        </div>`})}finally{this.checkupRunning=!1}}}promptOpenPath(){$.openInputDialog({title:p("按路径打开…"),label:p("工作空间内的 SVG 路径"),placeholder:"assets/excali-20261015-120000.svg",value:"",confirmText:p("打开"),onConfirm:(t,e)=>{const i=t.trim();i&&(this.openExisting(C(i)),e.destroy())}})}clearSlashHint(t){const e=t?.protyle?.toolbar?.range;!e||!e.toString().startsWith("/")||(e.deleteContents(),t.protyle?.wysiwyg?.element?.dispatchEvent(new InputEvent("input",{bubbles:!0,inputType:"deleteContentBackward"})))}async openNew(){const t=await this.promptFileName(p("未命名白板"),p("新建白板"));if(t)try{const{path:e,docId:i}=await this.createBoardFile(t);await this.openStudioTab(e,i)}catch(e){$.showMessage(p("创建白板失败：{msg}",{msg:e instanceof Error?e.message:String(e)}),7e3,"error")}}openExisting(t){return this.openStudioTab(t)}async createBoardFile(t){const e=await Se(this.settings.saveDir,ke(t,p("未命名白板"))),i=this.settings.autoCreateDoc?await this.adoptBoardFile({dataPath:e,name:B(e),docId:"",docTitle:"",updated:Date.now()}):null,{sceneToSvgText:o}=await this.lazyMod();return await Ct(e,await o({elements:[],appState:{},files:{}})),_e(e),this.rememberRecent(e),this.rememberBoardFile(e,i??void 0,B(e).replace(/\.svg$/i,"")),this.refreshBoardLib(),{path:e,docId:i??void 0}}async saveSvg(t,e){if(!e)throw new Error("saveSvg 只接受已有文件（新建走 createBoardFile）");const i=C(e);let o=null;try{o=await q(i)}catch{}if(o!==null&&Co(o,t))return{path:e};const s=await Ct(i,t);return _e(s),this.rememberRecent(s),this.rememberBoardFile(s),this.refreshBoardLib(),{path:s}}rememberBoardFile(t,e,i){const o=C(t);this.boardFiles.some(s=>s.dataPath===o)||(this.boardFiles=[{dataPath:o,name:B(o),docId:e??"",docTitle:i??"",updated:Date.now()},...this.boardFiles])}async renameBoard(t,e){const i=C(t),o=await Se(this.settings.saveDir,ke(e),i);if(C(o)===i)return i;const s=await Dn(i,o);try{await On(H(i),H(s))}catch(r){console.warn("[excali-studio] 重命名后更新正文资源引用失败",r)}const a=this.boardDocs.filter(r=>C(r.svg)===i);if(a.length>0){const r=H(s);for(const d of a)try{await Ee(d.docId,{"custom-excali-svg":r})}catch(c){console.warn("[excali-studio] 重命名后同步白板绑定失败",d.docId,c)}this.boardDocs=this.boardDocs.map(d=>a.some(c=>c.docId===d.docId)?{...d,svg:H(s)}:d),this.boardSvgByDocId=new Map(this.boardDocs.map(d=>[d.docId,d.svg]))}return this.refreshBoardLib(),this.recent=[s,...this.recent.filter(r=>r!==i&&r!==s)],this.persist(),s}libDirRel(){return ct(this.settings.saveDir,"excali-libraries")}localLibRel(){return ct(this.libDirRel(),Ro)}libraryImportUrl(){const t=encodeURIComponent(this.libDirRel());return`${location.origin}/plugins/${Zt}/library-import.html?dir=${t}`}async migrateStencilLibrary(){if(!this.settings.stencilMigrated)try{const t=this.localLibRel();if(!await et(t)){let e=[];try{e=An(await q(C(ct(this.settings.saveDir,"excali-library.json"))))}catch{e=[]}e.length>0&&(await wt(t,Mn(e)),$.showMessage(p("组件库已迁移到 {dir}",{dir:"excali-libraries"}),3500))}}catch(t){console.warn("[excali-studio] 组件库迁移失败（旧文件保留，下次不再自动尝试）",t)}finally{this.settings.stencilMigrated=!0,this.persist()}}async loadLibraryItems(){await this.migrateStencilLibrary();const t=this.localLibRel();let e=[];try{e=await ve(this.libDirRel(),/\.excalidrawlib$/i)}catch{e=[]}e.sort((o,s)=>o===t?-1:s===t?1:o.localeCompare(s));const i=[];for(const o of e)try{i.push({path:o,items:An(await q(o))})}catch(s){console.warn("[excali-studio] 模板库文件读取失败，已跳过",o,s)}return this.libCache=Oo(i),this.libCache.items}async saveLibraryItems(t){const e=this.libCache??{items:[],sourceOf:new Map,byPath:new Map},i=Bo(e,t,this.localLibRel());for(const{path:o,items:s}of i)try{if(s.length===0){await et(o)&&await xt(o);continue}await wt(o,Mn(s))}catch(a){console.error("[excali-studio] 模板库文件写入失败",o,a),$.showMessage(p("模板库保存失败：{path}",{path:B(o)}),5e3,"error")}this.libCache=null,await this.loadLibraryItems()}promptFileName(t,e){return new Promise(i=>{let o=!1;const s=c=>{o||(o=!0,a.destroy(),i(c))},a=new $.Dialog({title:e,width:"420px",content:`<div class="exs-picker">
  <input class="b3-text-field fn__block exs-name-input" value="${at(t)}" />
  <div class="exs-name-tip">${p("位置")}：${Y(this.settings.saveDir)}</div>
  <div class="exs-name-actions">
    <button class="b3-button exs-name-cancel" type="button">${p("取消")}</button>
    <button class="b3-button exs-name-ok" type="button">${p("确定")}</button>
  </div>
</div>`,destroyCallback:()=>s(null)});a.element.classList.add("exs-name-dialog");const r=a.element.querySelector(".exs-name-input");a.element.querySelector(".exs-name-cancel").addEventListener("click",()=>s(null));const d=()=>s(ke(r.value||t));a.element.querySelector(".exs-name-ok").addEventListener("click",d),r.addEventListener("keydown",c=>{c.key==="Enter"?(c.preventDefault(),d()):c.key==="Escape"&&(c.preventDefault(),s(null)),c.stopPropagation()}),setTimeout(()=>{r.focus(),r.select()},50)})}async pickBoardRef(){let t=[];try{t=await At(this.settings.saveDir)}catch(i){return $.showMessage(p("读取目录失败：{msg}",{msg:i instanceof Error?i.message:String(i)}),7e3,"error"),null}if(t.length===0)return $.showMessage(p("目录里还没有白板文件")),null;const e=new Set([...this.tabs.values()].map(i=>i.data.dataPath).filter(i=>typeof i=="string"));return await Xa(t,e)}async openBoardPicker(){const t=await this.pickBoardRef();t&&this.openExisting(t)}rememberRecent(t){const e=C(t);this.recent=[e,...this.recent.filter(i=>i!==e)].slice(0,Qc),this.persist()}clearRecent(){this.recent=[],this.persist()}setupSetting(){let t=null,e=null,i=null,o=null,s=null,a=null,r=null,d=null,c=null,l=null,g=null;this.setting=new $.Setting({confirmCallback:()=>{this.settings={...this.settings,saveDir:t?.value??this.settings.saveDir,accentStroke:e?.checked??this.settings.accentStroke,showWelcome:i?.checked??this.settings.showWelcome,gridModeEnabled:o?.checked??this.settings.gridModeEnabled,boardDir:s?.value??this.settings.boardDir,autoOpenBoard:a?.checked??this.settings.autoOpenBoard,autoCreateDoc:r?.checked??this.settings.autoCreateDoc,imageBaseUrl:d?.value??this.settings.imageBaseUrl,imageModel:c?.value??this.settings.imageModel,imageApiKey:l?.value??this.settings.imageApiKey,imageSize:g?.value??this.settings.imageSize},this.settings=yt(this.settings),this.persist()}}),this.setting.addItem({title:p("保存目录"),description:p("新白板保存的位置（工作空间相对路径，默认 assets/excali）。白板库只列这个目录里的 .svg；assets 根目录留给普通图片附件。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.saveDir,h.placeholder=z.saveDir,h.addEventListener("change",()=>{this.settings={...this.settings,saveDir:h.value},this.persist()}),t=h,h}}),this.setting.addItem({title:p("图像生成 API 地址"),description:p("OpenAI 兼容的 images API 地址（如 https://api.openai.com/v1）；留空 = 关闭生图。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.imageBaseUrl,h.placeholder="https://api.openai.com/v1",h.addEventListener("change",()=>{this.settings=yt({...this.settings,imageBaseUrl:h.value}),this.persist()}),d=h,h}}),this.setting.addItem({title:p("图像生成模型"),description:p("模型名（如 gpt-image-1、dall-e-3）；按服务商支持的型号填写。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.imageModel,h.placeholder=z.imageModel,h.addEventListener("change",()=>{this.settings=yt({...this.settings,imageModel:h.value}),this.persist()}),c=h,h}}),this.setting.addItem({title:p("图像生成 API Key"),description:p("只保存在插件数据里，不写日志、不写白板文件。"),createActionElement:()=>{const h=document.createElement("input");return h.type="password",h.className="b3-text-field fn__block",h.autocomplete="off",h.spellcheck=!1,h.value=this.settings.imageApiKey,h.placeholder="sk-...",h.addEventListener("change",()=>{this.settings=yt({...this.settings,imageApiKey:h.value}),this.persist()}),l=h,h}}),this.setting.addItem({title:p("图像生成尺寸"),description:p("传给 images API 的 size（如 1024x1024）；不同模型支持的尺寸不同，按服务商文档填写。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.imageSize,h.placeholder=z.imageSize,h.addEventListener("change",()=>{this.settings=yt({...this.settings,imageSize:h.value}),this.persist()}),g=h,h}}),this.setting.addItem({title:p("画笔颜色跟随思源强调色"),description:p("新画板把第一笔的默认颜色设成当前主题强调色；只影响默认值，不覆盖已有图。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.accentStroke,h.addEventListener("change",()=>{this.settings={...this.settings,accentStroke:h.checked},this.persist()}),e=h,h}}),this.setting.addItem({title:p("空画板显示引导画面"),description:p("空白板中央显示手绘纸飞机和上手提示；落第一笔就消失，只影响新建的白板。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.showWelcome,h.addEventListener("change",()=>{this.settings={...this.settings,showWelcome:h.checked},this.persist()}),i=h,h}}),this.setting.addItem({title:p("默认显示网格"),description:p("在任意白板里切换网格都会记住这个值，之后所有白板（含还没保存过的空白板）打开时都按它显示。改这里只影响之后打开的页签。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.gridModeEnabled,h.addEventListener("change",()=>{this.settings={...this.settings,gridModeEnabled:h.checked},this.persist()}),o=h,h}}),this.setting.addItem({title:p("白板文档目录"),description:p("白板建档的落点（当前笔记本内的路径，默认 /Excali 白板）。只影响「建档」动作，SVG 工程文件不受它影响，仍存上面的保存目录。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.boardDir,h.placeholder=z.boardDir,h.addEventListener("change",()=>{this.settings={...this.settings,boardDir:h.value},this.persist()}),s=h,h}}),this.setting.addItem({title:p("新建时自动建档"),description:p("关：新建只落 SVG 工程文件，白板库按文件列，文档树保持干净。开：新建白板时顺带建一篇文档绑定（可反链、可搜索、可文档树管理）。关着也能补建——Dock 白板行右键「建档」。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.autoCreateDoc,h.addEventListener("change",()=>{this.settings={...this.settings,autoCreateDoc:h.checked},this.persist()}),r=h,h}}),this.setting.addItem({title:p("打开白板文档时自动进入画板"),description:p("切到绑定了白板的文档会自动打开对应画板页签；每篇文档每次会话只自动开一次，已开着则直接聚焦。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.autoOpenBoard,h.addEventListener("change",()=>{this.settings={...this.settings,autoOpenBoard:h.checked},this.persist()}),a=h,h}}),this.setting.addItem({title:p("白板体检"),description:p("检查存档文档绑定的工程文件是否还存在（断链）。白板文件本身即白板，未建档是正常状态，不用处理。"),createActionElement:()=>{const h=document.createElement("button");return h.type="button",h.className="b3-button b3-button--outline fn__flex-center",h.textContent=p("开始体检"),h.addEventListener("click",()=>void this.runCheckup()),h}})}async loadState(){const t=await this.loadData(oi),e=t&&typeof t=="object"?t:{};this.settings=yt(e.settings),this.recent=Array.isArray(e.recent)?e.recent.filter(i=>typeof i=="string"&&i!==""):[],this.dirMigrated=e.dirMigrated===!0,this.legacyBoards=Array.isArray(e.boards)?e.boards.filter(i=>typeof i=="string"):[]}rememberGrid(t){this.settings.gridModeEnabled!==t&&(this.settings={...this.settings,gridModeEnabled:t},this.persist())}persist(){this.saveData(oi,{settings:this.settings,recent:this.recent,dirMigrated:this.dirMigrated}).catch(t=>console.error("[excali-studio] 保存设置失败",t))}}module.exports=nl;
