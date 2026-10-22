"use strict";const k=require("siyuan");let Nn={};function Ri(n){Nn=n&&typeof n=="object"?n:{}}function f(n,e){const t=Nn[n],i=typeof t=="string"?t:n;return e?i.replace(/\{(\w+)\}/g,(a,s)=>s in e?String(e[s]):a):i}const Rt="siyuan-excali-studio";function Li(){return new URL(`plugins/${Rt}/`,`${location.origin}/`).href}function Di(){const n=Li();return window.EXCALIDRAW_ASSET_PATH=n,n}function Oi(...n){return n.map(t=>String(t??"").trim()).filter(t=>t!=="").join("/").replace(/\/{2,}/g,"/")}function Pi(){try{const e=window.siyuan?.config?.system?.dataDir;return typeof e=="string"?e.trim():""}catch{return""}}const K="iconExcaliStudio",Bi=`<symbol id="${K}" viewBox="0 0 1024 1024"><g fill="none" stroke="currentColor" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"><rect x="128" y="168" width="768" height="588" rx="56"/><path d="M272 616c72-152 148 92 224-56 44-88 96-36 152-72"/></g></symbol>`;function Ni(n){return`<div class="b3-list-item__first"><svg class="b3-list-item__graphic"><use xlink:href="#${K}"></use></svg><span class="b3-list-item__text">${n}</span></div>`}function dt(n){let e=n.length;for(;--e>=0;)n[e]=0}const Fi=3,ji=258,Fn=29,Hi=256,zi=Hi+1+Fn,jn=30,Ui=512,Wi=new Array((zi+2)*2);dt(Wi);const Xi=new Array(jn*2);dt(Xi);const Gi=new Array(Ui);dt(Gi);const Yi=new Array(ji-Fi+1);dt(Yi);const Zi=new Array(Fn);dt(Zi);const qi=new Array(jn);dt(qi);const Ki=(n,e,t,i)=>{let a=n&65535|0,s=n>>>16&65535|0,o=0;for(;t!==0;){o=t>2e3?2e3:t,t-=o;do a=a+e[i++]|0,s=s+a|0;while(--o);a%=65521,s%=65521}return a|s<<16|0};var fe=Ki;const Ji=()=>{let n,e=[];for(var t=0;t<256;t++){n=t;for(var i=0;i<8;i++)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n}return e},Vi=new Uint32Array(Ji()),Qi=(n,e,t,i)=>{const a=Vi,s=i+t;n^=-1;for(let o=i;o<s;o++)n=n>>>8^a[(n^e[o])&255];return n^-1};var z=Qi,pe={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},Hn={Z_NO_FLUSH:0,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_DEFLATED:8};const ts=(n,e)=>Object.prototype.hasOwnProperty.call(n,e);var es=function(n){const e=Array.prototype.slice.call(arguments,1);for(;e.length;){const t=e.shift();if(t){if(typeof t!="object")throw new TypeError(t+"must be non-object");for(const i in t)ts(t,i)&&(n[i]=t[i])}}return n},ns=n=>{let e=0;for(let i=0,a=n.length;i<a;i++)e+=n[i].length;const t=new Uint8Array(e);for(let i=0,a=0,s=n.length;i<s;i++){let o=n[i];t.set(o,a),a+=o.length}return t},zn={assign:es,flattenChunks:ns};let Un=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch{Un=!1}const bt=new Uint8Array(256);for(let n=0;n<256;n++)bt[n]=n>=252?6:n>=248?5:n>=240?4:n>=224?3:n>=192?2:1;bt[254]=bt[254]=1;var is=n=>{let e,t,i,a,s,o=n.length,r=0;for(a=0;a<o;a++)t=n.charCodeAt(a),(t&64512)===55296&&a+1<o&&(i=n.charCodeAt(a+1),(i&64512)===56320&&(t=65536+(t-55296<<10)+(i-56320),a++)),r+=t<128?1:t<2048?2:t<65536?3:4;for(e=new Uint8Array(r),s=0,a=0;s<r;a++)t=n.charCodeAt(a),(t&64512)===55296&&a+1<o&&(i=n.charCodeAt(a+1),(i&64512)===56320&&(t=65536+(t-55296<<10)+(i-56320),a++)),t<128?e[s++]=t:t<2048?(e[s++]=192|t>>>6,e[s++]=128|t&63):t<65536?(e[s++]=224|t>>>12,e[s++]=128|t>>>6&63,e[s++]=128|t&63):(e[s++]=240|t>>>18,e[s++]=128|t>>>12&63,e[s++]=128|t>>>6&63,e[s++]=128|t&63);return e};const ss=(n,e)=>{if(e<65534&&n.subarray&&Un)return String.fromCharCode.apply(null,n.length===e?n:n.subarray(0,e));let t="";for(let i=0;i<e;i++)t+=String.fromCharCode(n[i]);return t};var as=(n,e)=>{let t,i;const a=e||n.length,s=new Array(a*2);for(i=0,t=0;t<a;){let o=n[t++];if(o<128){s[i++]=o;continue}let r=bt[o];if(r>4){s[i++]=65533,t+=r-1;continue}for(o&=r===2?31:r===3?15:7;r>1&&t<a;)o=o<<6|n[t++]&63,r--;if(r>1){s[i++]=65533;continue}o<65536?s[i++]=o:(o-=65536,s[i++]=55296|o>>10&1023,s[i++]=56320|o&1023)}return ss(s,i)},os=(n,e)=>{e=e||n.length,e>n.length&&(e=n.length);let t=e-1;for(;t>=0&&(n[t]&192)===128;)t--;return t<0||t===0?e:t+bt[n[t]]>e?t:e},ue={string2buf:is,buf2string:as,utf8border:os};function rs(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}var ls=rs;const Et=30,cs=12;var ds=function(e,t){let i,a,s,o,r,d,l,c,u,h,p,b,_,g,m,x,w,y,v,A,S,$,C,I;const M=e.state;i=e.next_in,C=e.input,a=i+(e.avail_in-5),s=e.next_out,I=e.output,o=s-(t-e.avail_out),r=s+(e.avail_out-257),d=M.dmax,l=M.wsize,c=M.whave,u=M.wnext,h=M.window,p=M.hold,b=M.bits,_=M.lencode,g=M.distcode,m=(1<<M.lenbits)-1,x=(1<<M.distbits)-1;t:do{b<15&&(p+=C[i++]<<b,b+=8,p+=C[i++]<<b,b+=8),w=_[p&m];e:for(;;){if(y=w>>>24,p>>>=y,b-=y,y=w>>>16&255,y===0)I[s++]=w&65535;else if(y&16){v=w&65535,y&=15,y&&(b<y&&(p+=C[i++]<<b,b+=8),v+=p&(1<<y)-1,p>>>=y,b-=y),b<15&&(p+=C[i++]<<b,b+=8,p+=C[i++]<<b,b+=8),w=g[p&x];n:for(;;){if(y=w>>>24,p>>>=y,b-=y,y=w>>>16&255,y&16){if(A=w&65535,y&=15,b<y&&(p+=C[i++]<<b,b+=8,b<y&&(p+=C[i++]<<b,b+=8)),A+=p&(1<<y)-1,A>d){e.msg="invalid distance too far back",M.mode=Et;break t}if(p>>>=y,b-=y,y=s-o,A>y){if(y=A-y,y>c&&M.sane){e.msg="invalid distance too far back",M.mode=Et;break t}if(S=0,$=h,u===0){if(S+=l-y,y<v){v-=y;do I[s++]=h[S++];while(--y);S=s-A,$=I}}else if(u<y){if(S+=l+u-y,y-=u,y<v){v-=y;do I[s++]=h[S++];while(--y);if(S=0,u<v){y=u,v-=y;do I[s++]=h[S++];while(--y);S=s-A,$=I}}}else if(S+=u-y,y<v){v-=y;do I[s++]=h[S++];while(--y);S=s-A,$=I}for(;v>2;)I[s++]=$[S++],I[s++]=$[S++],I[s++]=$[S++],v-=3;v&&(I[s++]=$[S++],v>1&&(I[s++]=$[S++]))}else{S=s-A;do I[s++]=I[S++],I[s++]=I[S++],I[s++]=I[S++],v-=3;while(v>2);v&&(I[s++]=I[S++],v>1&&(I[s++]=I[S++]))}}else if(y&64){e.msg="invalid distance code",M.mode=Et;break t}else{w=g[(w&65535)+(p&(1<<y)-1)];continue n}break}}else if(y&64)if(y&32){M.mode=cs;break t}else{e.msg="invalid literal/length code",M.mode=Et;break t}else{w=_[(w&65535)+(p&(1<<y)-1)];continue e}break}}while(i<a&&s<r);v=b>>3,i-=v,b-=v<<3,p&=(1<<b)-1,e.next_in=i,e.next_out=s,e.avail_in=i<a?5+(a-i):5-(i-a),e.avail_out=s<r?257+(r-s):257-(s-r),M.hold=p,M.bits=b};const et=15,Le=852,De=592,Oe=0,Xt=1,Pe=2,hs=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),fs=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),ps=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),us=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]),gs=(n,e,t,i,a,s,o,r)=>{const d=r.bits;let l=0,c=0,u=0,h=0,p=0,b=0,_=0,g=0,m=0,x=0,w,y,v,A,S,$=null,C=0,I;const M=new Uint16Array(et+1),V=new Uint16Array(et+1);let St=null,Te=0,Re,kt,vt;for(l=0;l<=et;l++)M[l]=0;for(c=0;c<i;c++)M[e[t+c]]++;for(p=d,h=et;h>=1&&M[h]===0;h--);if(p>h&&(p=h),h===0)return a[s++]=1<<24|64<<16|0,a[s++]=1<<24|64<<16|0,r.bits=1,0;for(u=1;u<h&&M[u]===0;u++);for(p<u&&(p=u),g=1,l=1;l<=et;l++)if(g<<=1,g-=M[l],g<0)return-1;if(g>0&&(n===Oe||h!==1))return-1;for(V[1]=0,l=1;l<et;l++)V[l+1]=V[l]+M[l];for(c=0;c<i;c++)e[t+c]!==0&&(o[V[e[t+c]]++]=c);if(n===Oe?($=St=o,I=19):n===Xt?($=hs,C-=257,St=fs,Te-=257,I=256):($=ps,St=us,I=-1),x=0,c=0,l=u,S=s,b=p,_=0,v=-1,m=1<<p,A=m-1,n===Xt&&m>Le||n===Pe&&m>De)return 1;for(;;){Re=l-_,o[c]<I?(kt=0,vt=o[c]):o[c]>I?(kt=St[Te+o[c]],vt=$[C+o[c]]):(kt=96,vt=0),w=1<<l-_,y=1<<b,u=y;do y-=w,a[S+(x>>_)+y]=Re<<24|kt<<16|vt|0;while(y!==0);for(w=1<<l-1;x&w;)w>>=1;if(w!==0?(x&=w-1,x+=w):x=0,c++,--M[l]===0){if(l===h)break;l=e[t+o[c]]}if(l>p&&(x&A)!==v){for(_===0&&(_=p),S+=u,b=l-_,g=1<<b;b+_<h&&(g-=M[b+_],!(g<=0));)b++,g<<=1;if(m+=1<<b,n===Xt&&m>Le||n===Pe&&m>De)return 1;v=x&A,a[v]=p<<24|b<<16|S-s|0}}return x!==0&&(a[S+x]=l-_<<24|64<<16|0),r.bits=p,0};var ut=gs;const ms=0,Wn=1,Xn=2,{Z_FINISH:Be,Z_BLOCK:bs,Z_TREES:_t,Z_OK:Q,Z_STREAM_END:ys,Z_NEED_DICT:ws,Z_STREAM_ERROR:H,Z_DATA_ERROR:Gn,Z_MEM_ERROR:Yn,Z_BUF_ERROR:xs,Z_DEFLATED:Ne}=Hn,Zn=1,Fe=2,je=3,He=4,ze=5,Ue=6,We=7,Xe=8,Ge=9,Ye=10,Pt=11,W=12,Gt=13,Ze=14,Yt=15,qe=16,Ke=17,Je=18,Ve=19,At=20,$t=21,Qe=22,tn=23,en=24,nn=25,sn=26,Zt=27,an=28,on=29,R=30,qn=31,Ss=32,ks=852,vs=592,Es=15,_s=Es,rn=n=>(n>>>24&255)+(n>>>8&65280)+((n&65280)<<8)+((n&255)<<24);function As(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}const Kn=n=>{if(!n||!n.state)return H;const e=n.state;return n.total_in=n.total_out=e.total=0,n.msg="",e.wrap&&(n.adler=e.wrap&1),e.mode=Zn,e.last=0,e.havedict=0,e.dmax=32768,e.head=null,e.hold=0,e.bits=0,e.lencode=e.lendyn=new Int32Array(ks),e.distcode=e.distdyn=new Int32Array(vs),e.sane=1,e.back=-1,Q},Jn=n=>{if(!n||!n.state)return H;const e=n.state;return e.wsize=0,e.whave=0,e.wnext=0,Kn(n)},Vn=(n,e)=>{let t;if(!n||!n.state)return H;const i=n.state;return e<0?(t=0,e=-e):(t=(e>>4)+1,e<48&&(e&=15)),e&&(e<8||e>15)?H:(i.window!==null&&i.wbits!==e&&(i.window=null),i.wrap=t,i.wbits=e,Jn(n))},Qn=(n,e)=>{if(!n)return H;const t=new As;n.state=t,t.window=null;const i=Vn(n,e);return i!==Q&&(n.state=null),i},$s=n=>Qn(n,_s);let ln=!0,qt,Kt;const Is=n=>{if(ln){qt=new Int32Array(512),Kt=new Int32Array(32);let e=0;for(;e<144;)n.lens[e++]=8;for(;e<256;)n.lens[e++]=9;for(;e<280;)n.lens[e++]=7;for(;e<288;)n.lens[e++]=8;for(ut(Wn,n.lens,0,288,qt,0,n.work,{bits:9}),e=0;e<32;)n.lens[e++]=5;ut(Xn,n.lens,0,32,Kt,0,n.work,{bits:5}),ln=!1}n.lencode=qt,n.lenbits=9,n.distcode=Kt,n.distbits=5},ti=(n,e,t,i)=>{let a;const s=n.state;return s.window===null&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new Uint8Array(s.wsize)),i>=s.wsize?(s.window.set(e.subarray(t-s.wsize,t),0),s.wnext=0,s.whave=s.wsize):(a=s.wsize-s.wnext,a>i&&(a=i),s.window.set(e.subarray(t-i,t-i+a),s.wnext),i-=a,i?(s.window.set(e.subarray(t-i,t),0),s.wnext=i,s.whave=s.wsize):(s.wnext+=a,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=a))),0},Ms=(n,e)=>{let t,i,a,s,o,r,d,l,c,u,h,p,b,_,g=0,m,x,w,y,v,A,S,$;const C=new Uint8Array(4);let I,M;const V=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(!n||!n.state||!n.output||!n.input&&n.avail_in!==0)return H;t=n.state,t.mode===W&&(t.mode=Gt),o=n.next_out,a=n.output,d=n.avail_out,s=n.next_in,i=n.input,r=n.avail_in,l=t.hold,c=t.bits,u=r,h=d,$=Q;t:for(;;)switch(t.mode){case Zn:if(t.wrap===0){t.mode=Gt;break}for(;c<16;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if(t.wrap&2&&l===35615){t.check=0,C[0]=l&255,C[1]=l>>>8&255,t.check=z(t.check,C,2,0),l=0,c=0,t.mode=Fe;break}if(t.flags=0,t.head&&(t.head.done=!1),!(t.wrap&1)||(((l&255)<<8)+(l>>8))%31){n.msg="incorrect header check",t.mode=R;break}if((l&15)!==Ne){n.msg="unknown compression method",t.mode=R;break}if(l>>>=4,c-=4,S=(l&15)+8,t.wbits===0)t.wbits=S;else if(S>t.wbits){n.msg="invalid window size",t.mode=R;break}t.dmax=1<<t.wbits,n.adler=t.check=1,t.mode=l&512?Ye:W,l=0,c=0;break;case Fe:for(;c<16;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if(t.flags=l,(t.flags&255)!==Ne){n.msg="unknown compression method",t.mode=R;break}if(t.flags&57344){n.msg="unknown header flags set",t.mode=R;break}t.head&&(t.head.text=l>>8&1),t.flags&512&&(C[0]=l&255,C[1]=l>>>8&255,t.check=z(t.check,C,2,0)),l=0,c=0,t.mode=je;case je:for(;c<32;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}t.head&&(t.head.time=l),t.flags&512&&(C[0]=l&255,C[1]=l>>>8&255,C[2]=l>>>16&255,C[3]=l>>>24&255,t.check=z(t.check,C,4,0)),l=0,c=0,t.mode=He;case He:for(;c<16;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}t.head&&(t.head.xflags=l&255,t.head.os=l>>8),t.flags&512&&(C[0]=l&255,C[1]=l>>>8&255,t.check=z(t.check,C,2,0)),l=0,c=0,t.mode=ze;case ze:if(t.flags&1024){for(;c<16;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}t.length=l,t.head&&(t.head.extra_len=l),t.flags&512&&(C[0]=l&255,C[1]=l>>>8&255,t.check=z(t.check,C,2,0)),l=0,c=0}else t.head&&(t.head.extra=null);t.mode=Ue;case Ue:if(t.flags&1024&&(p=t.length,p>r&&(p=r),p&&(t.head&&(S=t.head.extra_len-t.length,t.head.extra||(t.head.extra=new Uint8Array(t.head.extra_len)),t.head.extra.set(i.subarray(s,s+p),S)),t.flags&512&&(t.check=z(t.check,i,p,s)),r-=p,s+=p,t.length-=p),t.length))break t;t.length=0,t.mode=We;case We:if(t.flags&2048){if(r===0)break t;p=0;do S=i[s+p++],t.head&&S&&t.length<65536&&(t.head.name+=String.fromCharCode(S));while(S&&p<r);if(t.flags&512&&(t.check=z(t.check,i,p,s)),r-=p,s+=p,S)break t}else t.head&&(t.head.name=null);t.length=0,t.mode=Xe;case Xe:if(t.flags&4096){if(r===0)break t;p=0;do S=i[s+p++],t.head&&S&&t.length<65536&&(t.head.comment+=String.fromCharCode(S));while(S&&p<r);if(t.flags&512&&(t.check=z(t.check,i,p,s)),r-=p,s+=p,S)break t}else t.head&&(t.head.comment=null);t.mode=Ge;case Ge:if(t.flags&512){for(;c<16;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if(l!==(t.check&65535)){n.msg="header crc mismatch",t.mode=R;break}l=0,c=0}t.head&&(t.head.hcrc=t.flags>>9&1,t.head.done=!0),n.adler=t.check=0,t.mode=W;break;case Ye:for(;c<32;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}n.adler=t.check=rn(l),l=0,c=0,t.mode=Pt;case Pt:if(t.havedict===0)return n.next_out=o,n.avail_out=d,n.next_in=s,n.avail_in=r,t.hold=l,t.bits=c,ws;n.adler=t.check=1,t.mode=W;case W:if(e===bs||e===_t)break t;case Gt:if(t.last){l>>>=c&7,c-=c&7,t.mode=Zt;break}for(;c<3;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}switch(t.last=l&1,l>>>=1,c-=1,l&3){case 0:t.mode=Ze;break;case 1:if(Is(t),t.mode=At,e===_t){l>>>=2,c-=2;break t}break;case 2:t.mode=Ke;break;case 3:n.msg="invalid block type",t.mode=R}l>>>=2,c-=2;break;case Ze:for(l>>>=c&7,c-=c&7;c<32;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if((l&65535)!==(l>>>16^65535)){n.msg="invalid stored block lengths",t.mode=R;break}if(t.length=l&65535,l=0,c=0,t.mode=Yt,e===_t)break t;case Yt:t.mode=qe;case qe:if(p=t.length,p){if(p>r&&(p=r),p>d&&(p=d),p===0)break t;a.set(i.subarray(s,s+p),o),r-=p,s+=p,d-=p,o+=p,t.length-=p;break}t.mode=W;break;case Ke:for(;c<14;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if(t.nlen=(l&31)+257,l>>>=5,c-=5,t.ndist=(l&31)+1,l>>>=5,c-=5,t.ncode=(l&15)+4,l>>>=4,c-=4,t.nlen>286||t.ndist>30){n.msg="too many length or distance symbols",t.mode=R;break}t.have=0,t.mode=Je;case Je:for(;t.have<t.ncode;){for(;c<3;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}t.lens[V[t.have++]]=l&7,l>>>=3,c-=3}for(;t.have<19;)t.lens[V[t.have++]]=0;if(t.lencode=t.lendyn,t.lenbits=7,I={bits:t.lenbits},$=ut(ms,t.lens,0,19,t.lencode,0,t.work,I),t.lenbits=I.bits,$){n.msg="invalid code lengths set",t.mode=R;break}t.have=0,t.mode=Ve;case Ve:for(;t.have<t.nlen+t.ndist;){for(;g=t.lencode[l&(1<<t.lenbits)-1],m=g>>>24,x=g>>>16&255,w=g&65535,!(m<=c);){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if(w<16)l>>>=m,c-=m,t.lens[t.have++]=w;else{if(w===16){for(M=m+2;c<M;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if(l>>>=m,c-=m,t.have===0){n.msg="invalid bit length repeat",t.mode=R;break}S=t.lens[t.have-1],p=3+(l&3),l>>>=2,c-=2}else if(w===17){for(M=m+3;c<M;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}l>>>=m,c-=m,S=0,p=3+(l&7),l>>>=3,c-=3}else{for(M=m+7;c<M;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}l>>>=m,c-=m,S=0,p=11+(l&127),l>>>=7,c-=7}if(t.have+p>t.nlen+t.ndist){n.msg="invalid bit length repeat",t.mode=R;break}for(;p--;)t.lens[t.have++]=S}}if(t.mode===R)break;if(t.lens[256]===0){n.msg="invalid code -- missing end-of-block",t.mode=R;break}if(t.lenbits=9,I={bits:t.lenbits},$=ut(Wn,t.lens,0,t.nlen,t.lencode,0,t.work,I),t.lenbits=I.bits,$){n.msg="invalid literal/lengths set",t.mode=R;break}if(t.distbits=6,t.distcode=t.distdyn,I={bits:t.distbits},$=ut(Xn,t.lens,t.nlen,t.ndist,t.distcode,0,t.work,I),t.distbits=I.bits,$){n.msg="invalid distances set",t.mode=R;break}if(t.mode=At,e===_t)break t;case At:t.mode=$t;case $t:if(r>=6&&d>=258){n.next_out=o,n.avail_out=d,n.next_in=s,n.avail_in=r,t.hold=l,t.bits=c,ds(n,h),o=n.next_out,a=n.output,d=n.avail_out,s=n.next_in,i=n.input,r=n.avail_in,l=t.hold,c=t.bits,t.mode===W&&(t.back=-1);break}for(t.back=0;g=t.lencode[l&(1<<t.lenbits)-1],m=g>>>24,x=g>>>16&255,w=g&65535,!(m<=c);){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if(x&&!(x&240)){for(y=m,v=x,A=w;g=t.lencode[A+((l&(1<<y+v)-1)>>y)],m=g>>>24,x=g>>>16&255,w=g&65535,!(y+m<=c);){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}l>>>=y,c-=y,t.back+=y}if(l>>>=m,c-=m,t.back+=m,t.length=w,x===0){t.mode=sn;break}if(x&32){t.back=-1,t.mode=W;break}if(x&64){n.msg="invalid literal/length code",t.mode=R;break}t.extra=x&15,t.mode=Qe;case Qe:if(t.extra){for(M=t.extra;c<M;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}t.length+=l&(1<<t.extra)-1,l>>>=t.extra,c-=t.extra,t.back+=t.extra}t.was=t.length,t.mode=tn;case tn:for(;g=t.distcode[l&(1<<t.distbits)-1],m=g>>>24,x=g>>>16&255,w=g&65535,!(m<=c);){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if(!(x&240)){for(y=m,v=x,A=w;g=t.distcode[A+((l&(1<<y+v)-1)>>y)],m=g>>>24,x=g>>>16&255,w=g&65535,!(y+m<=c);){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}l>>>=y,c-=y,t.back+=y}if(l>>>=m,c-=m,t.back+=m,x&64){n.msg="invalid distance code",t.mode=R;break}t.offset=w,t.extra=x&15,t.mode=en;case en:if(t.extra){for(M=t.extra;c<M;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}t.offset+=l&(1<<t.extra)-1,l>>>=t.extra,c-=t.extra,t.back+=t.extra}if(t.offset>t.dmax){n.msg="invalid distance too far back",t.mode=R;break}t.mode=nn;case nn:if(d===0)break t;if(p=h-d,t.offset>p){if(p=t.offset-p,p>t.whave&&t.sane){n.msg="invalid distance too far back",t.mode=R;break}p>t.wnext?(p-=t.wnext,b=t.wsize-p):b=t.wnext-p,p>t.length&&(p=t.length),_=t.window}else _=a,b=o-t.offset,p=t.length;p>d&&(p=d),d-=p,t.length-=p;do a[o++]=_[b++];while(--p);t.length===0&&(t.mode=$t);break;case sn:if(d===0)break t;a[o++]=t.length,d--,t.mode=$t;break;case Zt:if(t.wrap){for(;c<32;){if(r===0)break t;r--,l|=i[s++]<<c,c+=8}if(h-=d,n.total_out+=h,t.total+=h,h&&(n.adler=t.check=t.flags?z(t.check,a,h,o-h):fe(t.check,a,h,o-h)),h=d,(t.flags?l:rn(l))!==t.check){n.msg="incorrect data check",t.mode=R;break}l=0,c=0}t.mode=an;case an:if(t.wrap&&t.flags){for(;c<32;){if(r===0)break t;r--,l+=i[s++]<<c,c+=8}if(l!==(t.total&4294967295)){n.msg="incorrect length check",t.mode=R;break}l=0,c=0}t.mode=on;case on:$=ys;break t;case R:$=Gn;break t;case qn:return Yn;case Ss:default:return H}return n.next_out=o,n.avail_out=d,n.next_in=s,n.avail_in=r,t.hold=l,t.bits=c,(t.wsize||h!==n.avail_out&&t.mode<R&&(t.mode<Zt||e!==Be))&&ti(n,n.output,n.next_out,h-n.avail_out),u-=n.avail_in,h-=n.avail_out,n.total_in+=u,n.total_out+=h,t.total+=h,t.wrap&&h&&(n.adler=t.check=t.flags?z(t.check,a,h,n.next_out-h):fe(t.check,a,h,n.next_out-h)),n.data_type=t.bits+(t.last?64:0)+(t.mode===W?128:0)+(t.mode===At||t.mode===Yt?256:0),(u===0&&h===0||e===Be)&&$===Q&&($=xs),$},Cs=n=>{if(!n||!n.state)return H;let e=n.state;return e.window&&(e.window=null),n.state=null,Q},Ts=(n,e)=>{if(!n||!n.state)return H;const t=n.state;return t.wrap&2?(t.head=e,e.done=!1,Q):H},Rs=(n,e)=>{const t=e.length;let i,a,s;return!n||!n.state||(i=n.state,i.wrap!==0&&i.mode!==Pt)?H:i.mode===Pt&&(a=1,a=fe(a,e,t,0),a!==i.check)?Gn:(s=ti(n,e,t,t),s?(i.mode=qn,Yn):(i.havedict=1,Q))};var Ls=Jn,Ds=Vn,Os=Kn,Ps=$s,Bs=Qn,Ns=Ms,Fs=Cs,js=Ts,Hs=Rs,zs="pako inflate (from Nodeca project)",G={inflateReset:Ls,inflateReset2:Ds,inflateResetKeep:Os,inflateInit:Ps,inflateInit2:Bs,inflate:Ns,inflateEnd:Fs,inflateGetHeader:js,inflateSetDictionary:Hs,inflateInfo:zs};function Us(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}var Ws=Us;const ei=Object.prototype.toString,{Z_NO_FLUSH:Xs,Z_FINISH:Gs,Z_OK:yt,Z_STREAM_END:Jt,Z_NEED_DICT:Vt,Z_STREAM_ERROR:Ys,Z_DATA_ERROR:cn,Z_MEM_ERROR:Zs}=Hn;function jt(n){this.options=zn.assign({chunkSize:1024*64,windowBits:15,to:""},n||{});const e=this.options;e.raw&&e.windowBits>=0&&e.windowBits<16&&(e.windowBits=-e.windowBits,e.windowBits===0&&(e.windowBits=-15)),e.windowBits>=0&&e.windowBits<16&&!(n&&n.windowBits)&&(e.windowBits+=32),e.windowBits>15&&e.windowBits<48&&(e.windowBits&15||(e.windowBits|=15)),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new ls,this.strm.avail_out=0;let t=G.inflateInit2(this.strm,e.windowBits);if(t!==yt)throw new Error(pe[t]);if(this.header=new Ws,G.inflateGetHeader(this.strm,this.header),e.dictionary&&(typeof e.dictionary=="string"?e.dictionary=ue.string2buf(e.dictionary):ei.call(e.dictionary)==="[object ArrayBuffer]"&&(e.dictionary=new Uint8Array(e.dictionary)),e.raw&&(t=G.inflateSetDictionary(this.strm,e.dictionary),t!==yt)))throw new Error(pe[t])}jt.prototype.push=function(n,e){const t=this.strm,i=this.options.chunkSize,a=this.options.dictionary;let s,o,r;if(this.ended)return!1;for(e===~~e?o=e:o=e===!0?Gs:Xs,ei.call(n)==="[object ArrayBuffer]"?t.input=new Uint8Array(n):t.input=n,t.next_in=0,t.avail_in=t.input.length;;){for(t.avail_out===0&&(t.output=new Uint8Array(i),t.next_out=0,t.avail_out=i),s=G.inflate(t,o),s===Vt&&a&&(s=G.inflateSetDictionary(t,a),s===yt?s=G.inflate(t,o):s===cn&&(s=Vt));t.avail_in>0&&s===Jt&&t.state.wrap>0&&n[t.next_in]!==0;)G.inflateReset(t),s=G.inflate(t,o);switch(s){case Ys:case cn:case Vt:case Zs:return this.onEnd(s),this.ended=!0,!1}if(r=t.avail_out,t.next_out&&(t.avail_out===0||s===Jt))if(this.options.to==="string"){let d=ue.utf8border(t.output,t.next_out),l=t.next_out-d,c=ue.buf2string(t.output,d);t.next_out=l,t.avail_out=i-l,l&&t.output.set(t.output.subarray(d,d+l),0),this.onData(c)}else this.onData(t.output.length===t.next_out?t.output:t.output.subarray(0,t.next_out));if(!(s===yt&&r===0)){if(s===Jt)return s=G.inflateEnd(this.strm),this.onEnd(s),this.ended=!0,!0;if(t.avail_in===0)break}}return!0};jt.prototype.onData=function(n){this.chunks.push(n)};jt.prototype.onEnd=function(n){n===yt&&(this.options.to==="string"?this.result=this.chunks.join(""):this.result=zn.flattenChunks(this.chunks)),this.chunks=[],this.err=n,this.msg=this.strm.msg};function qs(n,e){const t=new jt(e);if(t.push(n),t.err)throw t.msg||pe[t.err];return t.result}var Ks=qs,Js={inflate:Ks};const{inflate:Vs}=Js;var ni=Vs;const Qs="svg-source:excalidraw",ta="application/vnd.excalidraw+json",ii=/<!-- payload-start -->\s*([\s\S]+?)\s*<!-- payload-end -->/,ea=/<!-- payload-version:(\d+) -->/;class N extends Error{constructor(e,t){super(`scene:${e}${t?` (${t})`:""}`),this.reason=e,this.detail=t,this.name="SceneError"}}function ve(n){const e=new Uint8Array(n.length);for(let t=0;t<n.length;t++)e[t]=n.charCodeAt(t)&255;return e}function si(n){return new TextDecoder("utf-8").decode(ve(n))}function na(n,e){const t=atob(n);return e?ni(ve(t),{to:"string"}):si(t)}function ai(n){return n.includes(Qs)&&ii.test(n)}function ia(n){if(!ai(n))return!1;try{return oi(n).elements.length>0}catch{return!1}}function oi(n){if(!n.includes(ta))throw new N("no-payload");const e=ea.exec(n),t=e?Number(e[1]):1,i=ii.exec(n);if(!i)throw new N("no-payload","缺 payload-start/end 标记");let a;try{a=t===1?na(i[1],!1):atob(i[1])}catch(d){throw new N("bad-payload",d instanceof Error?d.message:String(d))}let s;try{s=JSON.parse(a)}catch{throw new N("bad-payload","载荷不是合法 JSON")}if(!s||typeof s!="object")throw new N("bad-payload","载荷不是对象");const o=sa(s);if(o.type!=="excalidraw")throw new N("wrong-type",String(o.type));if(!Array.isArray(o.elements))throw new N("bad-payload","scene 缺 elements 数组");return{elements:o.elements,appState:o.appState&&typeof o.appState=="object"?o.appState:{},files:o.files&&typeof o.files=="object"?o.files:{}}}function sa(n){if(!("encoded"in n)){if(n.type==="excalidraw")return n;throw new N("wrong-type",typeof n.type=="string"?n.type:"unknown")}const e=n.encoding;if(e!=="bstring")throw new N("unsupported-encoding",String(e));const t=n.encoded;if(typeof t!="string")throw new N("bad-payload","encoded 字段不是字符串");const i=n.compressed===!0;let a;try{a=i?ni(ve(t),{to:"string"}):si(t)}catch(o){throw new N("bad-payload",o instanceof Error?o.message:String(o))}let s;try{s=JSON.parse(a)}catch{throw new N("bad-payload","scene JSON 解析失败")}if(!s||typeof s!="object")throw new N("bad-payload","scene 不是对象");return s}function ge(n){if(Array.isArray(n))return n.map(ge);if(n&&typeof n=="object"){const e={},t=n;for(const i of Object.keys(t).sort()){const a=t[i];a!=null&&(i==="boundElements"&&Array.isArray(a)&&a.length===0||(e[i]=ge(a)))}return e}return n}function dn(n){if(!ai(n))return null;try{const e=oi(n);return JSON.stringify(ge({elements:e.elements,appState:e.appState,files:e.files}))}catch{return null}}function aa(n,e){if(n===e)return!0;const t=dn(n),i=dn(e);return t!==null&&t===i}const oa=".excalidrawlib",ra=`local${oa}`;function hn(n){let e=[];try{const t=JSON.parse(n);if(Array.isArray(t))e=t;else if(t&&typeof t=="object"){const i=t;Array.isArray(i.libraryItems)?e=i.libraryItems:Array.isArray(i.library)&&(e=i.library)}}catch{}return da(e)}function la(n){if(!n||typeof n!="object")return"";const e=n;return`${typeof e.id=="string"?e.id:""}:${typeof e.versionNonce=="number"?e.versionNonce:""}`}function Qt(n){const e=n.map(la).sort().join("|");let t=2166136261,i=2166136261;for(let a=0;a<e.length;a++){const s=e.charCodeAt(a);t=Math.imul(t^s,16777619)>>>0,i=Math.imul(i^s,2246822507)>>>0}return`lib-${t.toString(16).padStart(8,"0")}${i.toString(16).padStart(8,"0")}`}function me(n){return!!n&&typeof n=="object"&&typeof n.type=="string"}function ca(n){return Object.keys(n).filter(e=>/^\d+$/.test(e)).sort((e,t)=>Number(e)-Number(t)).map(e=>n[e]).filter(me)}function da(n,e="published"){const t=[];for(const i of n){if(Array.isArray(i)){const a=i.filter(me);if(a.length===0)continue;t.push({id:Qt(a),status:e,elements:a,created:Date.now()});continue}if(i&&typeof i=="object"){const a=i;if(Array.isArray(a.elements)){const o=a.elements.filter(me);if(o.length===0)continue;t.push({...a,elements:o,id:typeof a.id=="string"&&a.id!==""?a.id:Qt(o),status:typeof a.status=="string"?a.status:e,created:typeof a.created=="number"?a.created:Date.now()});continue}const s=ca(a);s.length>0&&t.push({id:Qt(s),status:e,elements:s,created:Date.now()});continue}}return t}function fn(n,e="siyuan-excali-studio"){return JSON.stringify({type:"excalidrawlib",version:2,source:e,libraryItems:n},null,2)}function Lt(n){if(n&&typeof n=="object"){const e=n.id;if(typeof e=="string"&&e!=="")return e}return null}function ha(n){const e=[],t=new Map,i=new Map,a=n[0]?.path??"";for(const s of n){i.set(s.path,s.items);const o=s.path===a;for(const r of s.items){const d=Lt(r);if(d!==null&&t.has(d)){console.warn(`[excali-studio] 模板库条目 id 重复（${d}，来自 ${s.path}），保留先到的一份`);continue}d!==null&&t.set(d,s.path),e.push(o?r:{...r,status:"published"})}}return{items:e,sourceOf:t,byPath:i}}function fa(n,e,t){const i=new Map,a=[];for(const r of e){const d=Lt(r);if(d===null){a.push(r);continue}n.sourceOf.has(d)||a.push(r),i.set(d,r)}const s=new Set;for(const r of n.items){const d=Lt(r),l=d!==null&&n.sourceOf.get(d)||t,c=d!==null?i.get(d):void 0;(!c||JSON.stringify(c)!==JSON.stringify(r))&&s.add(l)}a.length>0&&s.add(t);const o=[];for(const r of[...s].sort()){const d=n.byPath.get(r)??[],l=[];for(const c of d){const u=Lt(c);if(u!==null&&n.sourceOf.get(u)!==r){l.push(c);continue}const h=u!==null?i.get(u):void 0;h&&l.push(r===t?h:{...h,status:"published"})}if(r===t)for(const c of a)l.unshift(c);o.push({path:r,items:l})}return o}const pn="exs:script-pin-changed",te="exs:rail-view-changed",pa="exs:highlighter-changed",ua=0,Dt={color:"#ffd43b",width:4,opacity:45},ga=/^#[0-9a-fA-F]{6}$/;function un(n,e,t,i){return Number.isFinite(n)?Math.min(t,Math.max(e,n)):i}function Bt(n){const e=n&&typeof n=="object"?n:{};return{color:typeof e.color=="string"&&ga.test(e.color.trim())?e.color.trim().toLowerCase():Dt.color,width:un(Number(e.width),1,12,Dt.width),opacity:un(Number(e.opacity),10,100,Dt.opacity)}}const ma="M4,7L4,17A2,2 0 0 0 6,19L18,19A2,2 0 0 0 20,17L20,7A2,2 0 0 0 18,5L6,5A2,2 0 0 0 4,7ZM12,9.5L12,14.5M9.5,12L14.5,12",ba="M3.5,6A2.5,2.5 0 0 1 6,3.5L12,3.5A2.5,2.5 0 0 1 14.5,6L14.5,12A2.5,2.5 0 0 1 12,14.5L6,14.5A2.5,2.5 0 0 1 3.5,12ZM22,18A3.5,3.5 0 1 1 15,18A3.5,3.5 0 1 1 22,18",ya="M4,9L4,6A2,2 0 0 1 6,4L9,4M20,15L20,18A2,2 0 0 1 18,20L15,20M15.6,6.4L19.6,10.4L11,19L6.4,20L7.4,15.4ZM13.6,8.4L17.6,12.4",gn="M8.4,12A3.6,3.6 0 1 0 15.6,12A3.6,3.6 0 1 0 8.4,12M12,3.5L12,6M12,18L12,20.5M3.5,12L6,12M18,12L20.5,12M5.9,5.9L7.7,7.7M16.3,16.3L18.1,18.1M18.1,5.9L16.3,7.7M7.7,16.3L5.9,18.1",wa="M4.5,19.5L4.5,16.3L12.8,8.0L16.2,11.4L8.0,19.5ZM10.2,10.6L13.6,14.0",xa="M5,6L7.5,6M10.5,6L19,6M5,12L7.5,12M10.5,12L19,12M5,18L7.5,18M10.5,18L19,18",Sa="M3.5,5.5L20.5,5.5L20.5,18.5L3.5,18.5ZM7,9.5L11,9.5L11,13.5L7,13.5ZM13.5,11L17,11L17,15L13.5,15Z",ka="M3.5,5L20.5,5L20.5,19L3.5,19ZM9,9.8L12,12.8L15,9.8",va="M4.5,5.8L7.6,7L4.5,8.2ZM9.8,7L20,7M9.8,11.5L16.5,11.5M9.8,16L18.5,16",Ea={"text-numbering.md":xa,"box-selection.md":Sa,"highlighter.md":wa,"frame-collapse.md":ka,"selection-fold.md":va},mn="M9.5,3.5L14.5,3.5L16,7L8,7ZM10,7L10.8,14L13.2,14L14,7M12,14L12,20.5",_a="M3.5,4L20.5,4L20.5,14.5L3.5,14.5ZM12,14.5L12,19M8.5,20.5L15.5,20.5M10.5,7L15,9.25L10.5,11.5Z",Ee="insert-board-card",ri="outline-color",li="image-to-material",ci="presentation";function ee(n){return n.mount??"rail"}const _e=[{id:Ee,title:"插入白板卡片",titleEn:"Insert board card",desc:"从白板库挑一块，在当前画布中心插一张能点开的卡片",icon:ma},{id:ri,title:"仅外框颜色",titleEn:"Outline color",desc:"只改选中图形的边框色，文字颜色保持不变",icon:ba},{id:li,title:"图片转笔画素材",titleEn:"Image to strokes",desc:"把选中的图片描成可改色的原生笔画，可替换到画布或加入素材库",icon:ya},{id:ci,title:"演示模式",titleEn:"Presentation mode",desc:"把画布里的画框当幻灯片，逐页放映；点图钉固定到画布右上角",icon:_a,mount:"top-right"}],di=[Ee];function be(n){return typeof n=="string"&&_e.some(e=>e.id===n)}function bn(n){return _e.find(e=>e.id===n)??null}function Aa(n){if(!Array.isArray(n))return[...di];const e=[];for(const t of n)be(t)&&!e.includes(t)&&e.push(t);return e}const $a=["agent","mcp","cli","script"],hi={agent:!0,mcp:!0,cli:!0,script:!0};function Ia(n){const e=n&&typeof n=="object"?n:{},t={...hi};for(const i of $a)e[i]===!1?t[i]=!1:e[i]===!0&&(t[i]=!0);return t}const st="assets/excali";function fi(n){return String(n??"").trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/^data\//i,"").replace(/\/+$/,"")}const pi={scrim:!0,reveal:!0,typewriter:!1,cursor:!1,speed:28,fit:.95,autoAdvance:0,fullscreen:!0,directional:!1};function nt(n,e){return typeof n=="boolean"?n:e}function ne(n,e,t,i){return typeof n!="number"||!Number.isFinite(n)?i:Math.min(t,Math.max(e,n))}function ui(n){const e=n&&typeof n=="object"?n:{},t=pi;return{scrim:nt(e.scrim,t.scrim),reveal:nt(e.reveal,t.reveal),typewriter:nt(e.typewriter,t.typewriter),cursor:nt(e.cursor,t.cursor),speed:Math.round(ne(e.speed,8,200,t.speed)),fit:ne(e.fit,.5,1,t.fit),autoAdvance:Math.round(ne(e.autoAdvance,0,300,t.autoAdvance)),fullscreen:nt(e.fullscreen,t.fullscreen),directional:nt(e.directional,t.directional)}}const O={saveDir:st,accentStroke:!0,showWelcome:!0,gridModeEnabled:!1,boardDir:"/Excali 白板",autoOpenBoard:!1,autoCreateDoc:!1,stencilMigrated:!1,pinnedScripts:[],pinnedActions:[...di],scriptRailCollapsed:!1,scriptRailTop:.09,scriptSettings:{},builtinSnapshot:{},highlighter:{...Dt},imageBaseUrl:"",imageModel:"gpt-image-1",imageApiKey:"",imageSize:"1024x1024",aiChannels:{...hi},presentation:{...pi}};function it(n){const e=n&&typeof n=="object"?n:{},t=typeof e.saveDir=="string"?fi(e.saveDir):"",i=t!==""?t:O.saveDir,a=typeof e.boardDir=="string"&&e.boardDir.trim()!==""?e.boardDir.trim():O.boardDir,s={};if(e.scriptSettings&&typeof e.scriptSettings=="object")for(const[r,d]of Object.entries(e.scriptSettings).slice(0,50)){if(!d||typeof d!="object")continue;const l={};for(const[c,u]of Object.entries(d).slice(0,20))(typeof u=="string"||typeof u=="number"||typeof u=="boolean")&&(l[c]=u);s[r]=l}const o={};if(e.builtinSnapshot&&typeof e.builtinSnapshot=="object")for(const[r,d]of Object.entries(e.builtinSnapshot).slice(0,100))r!==""&&typeof d=="number"&&Number.isFinite(d)&&(o[r]=d);return{saveDir:i,accentStroke:typeof e.accentStroke=="boolean"?e.accentStroke:O.accentStroke,showWelcome:typeof e.showWelcome=="boolean"?e.showWelcome:O.showWelcome,gridModeEnabled:typeof e.gridModeEnabled=="boolean"?e.gridModeEnabled:O.gridModeEnabled,boardDir:a,autoOpenBoard:typeof e.autoOpenBoard=="boolean"?e.autoOpenBoard:O.autoOpenBoard,autoCreateDoc:typeof e.autoCreateDoc=="boolean"?e.autoCreateDoc:O.autoCreateDoc,stencilMigrated:typeof e.stencilMigrated=="boolean"?e.stencilMigrated:O.stencilMigrated,pinnedScripts:Array.isArray(e.pinnedScripts)?e.pinnedScripts.filter(r=>typeof r=="string"&&r!==""):O.pinnedScripts,pinnedActions:Aa(e.pinnedActions),scriptRailCollapsed:typeof e.scriptRailCollapsed=="boolean"?e.scriptRailCollapsed:O.scriptRailCollapsed,scriptRailTop:typeof e.scriptRailTop=="number"&&Number.isFinite(e.scriptRailTop)&&e.scriptRailTop>=0&&e.scriptRailTop<=.85?e.scriptRailTop:O.scriptRailTop,scriptSettings:s,builtinSnapshot:o,highlighter:Bt(e.highlighter),imageBaseUrl:typeof e.imageBaseUrl=="string"?e.imageBaseUrl.trim().replace(/\/+$/,"").slice(0,500):O.imageBaseUrl,imageModel:typeof e.imageModel=="string"&&e.imageModel.trim()!==""?e.imageModel.trim().slice(0,100):O.imageModel,imageApiKey:typeof e.imageApiKey=="string"?e.imageApiKey.trim().slice(0,500):O.imageApiKey,imageSize:typeof e.imageSize=="string"&&e.imageSize.trim()!==""?e.imageSize.trim().slice(0,32):O.imageSize,aiChannels:Ia(e.aiChannels),presentation:ui(e.presentation)}}const yn="board";function E(n){const e=n.replace(/^\/+/,"");return e==="data"||e.startsWith("data/")?`/${e}`:`/data/${e}`}function D(n){return n.replace(/^\/+/,"").replace(/^data\//,"")}function Ma(n){return E(n)}function Ca(n){return`/${D(n)}`}function T(n){return D(n).split("/").pop()||n}function J(n,e){const t=n.trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+$/,"");return`${t===""?"assets":t}/${e}`}function ie(n,e="excali-board.svg"){return`${(String(n??"").replace(/[\\/:*?"<>|\u0000-\u001f]/g,"").replace(/^\.+/,"").trim().replace(/\.svg$/i,"")||e.replace(/\.svg$/i,"")).slice(0,80)}.svg`}const gi=3;function Ot(n,e=1){const t=n.replace(/\.svg$/i,"");return e<=1?`${t}.svg.bak.svg`:`${t}.svg.bak${e}.svg`}function mi(n){const e=E(n);return Array.from({length:gi},(t,i)=>Ot(e,i+1))}function Ae(n){return/\.bak\d*\.svg$/i.test(n)}async function se(n,e,t){const i=e.replace(/\.svg$/i,"");for(let a=0;a<50;a++){const s=E(J(n,a===0?e:`${i}_${a-1}.svg`));if(t&&s===t||!await X(s))return s}return E(J(n,e))}async function gt(n,e){const t=E(n),i=new FormData;i.append("path",t),i.append("isDir","false"),i.append("file",new Blob([e],{type:"image/svg+xml;charset=utf-8"}),t.split("/").pop()||"x.svg");const a=await fetch("/api/file/putFile",{method:"POST",body:i}),s=await a.json().catch(()=>null);if(!a.ok||!s||s.code!==0)throw new Error(s?.msg||`putFile HTTP ${a.status}`);return t}async function j(n){const e=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:E(n)})});if(!e.ok)throw new Error(`getFile HTTP ${e.status}`);const t=await e.text();if((e.headers.get("content-type")||"").includes("application/json")){let i=null;try{i=JSON.parse(t)}catch{return t}if(i&&typeof i=="object"&&"code"in i&&i.code!==0){const a=i.msg;throw new Error(a||`getFile code ${i.code}`)}}return t}async function X(n){try{const e=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:E(n)})});if(!e.ok)return!1;if((e.headers.get("content-type")||"").includes("application/json")){const t=await e.json().catch(()=>null);return!t||t.code===0}return!0}catch{return!1}}async function $e(n,e){const t=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}),i=await t.json().catch(()=>null);if(!t.ok||!i||i.code!==0)throw new Error(i?.msg||`${n} HTTP ${t.status}`);return i.data}function Ta(n){return typeof n!="number"||!Number.isFinite(n)||n<=0?0:n<1e12?n*1e3:n}async function ht(n){const e=n.trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+$/,""),t=e===""?"assets":e,i=await $e("/api/file/readDir",{path:E(t)});return(Array.isArray(i)?i.filter(s=>s&&s.isDir!==!0&&typeof s.name=="string"&&/\.svg$/i.test(s.name)&&!Ae(s.name)):[]).map(s=>({path:`${t}/${s.name}`,updated:Ta(s.updated)})).sort((s,o)=>o.updated-s.updated)}async function ae(n,e){const t=n.trim().replace(/\\/g,"/").replace(/^\/+/,"").replace(/\/+$/,""),i=t===""?"assets":t,a=await $e("/api/file/readDir",{path:E(i)});return Array.isArray(a)?a.filter(s=>s&&s.isDir!==!0&&typeof s.name=="string"&&(!e||e.test(s.name))).map(s=>`${i}/${s.name}`):[]}async function at(n){await $e("/api/file/removeFile",{path:E(n)})}async function wn(n,e){const t=E(n),i=E(e),a=await j(t),s=await gt(i,a);if(s!==t){await at(t);for(let o=1;o<=gi;o++)try{const r=await j(Ot(t,o));await gt(Ot(s,o),r),await at(Ot(t,o))}catch{}}return s}async function ot(n,e){const t=E(n),i=new FormData;i.append("path",t),i.append("isDir","false"),i.append("file",new Blob([e],{type:"application/json;charset=utf-8"}),t.split("/").pop()||"x.json");const a=await fetch("/api/file/putFile",{method:"POST",body:i}),s=await a.json().catch(()=>null);if(!a.ok||!s||s.code!==0)throw new Error(s?.msg||`putFile HTTP ${a.status}`);return t}async function Ra(n,e,t){const i=E(n),a=new FormData;a.append("path",i),a.append("isDir","false"),a.append("file",new Blob([e],{type:t}),i.split("/").pop()||"x.bin");const s=await fetch("/api/file/putFile",{method:"POST",body:a}),o=await s.json().catch(()=>null);if(!s.ok||!o||o.code!==0)throw new Error(o?.msg||`putFile HTTP ${s.status}`);return i}async function La(n){const e=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:E(n)})});if(!e.ok)throw new Error(`getFile HTTP ${e.status}`);if((e.headers.get("content-type")||"").includes("application/json")){const t=await e.json().catch(()=>null);throw new Error(t?.msg||`getFile code ${t?.code??"?"}`)}return new Uint8Array(await e.arrayBuffer())}function Da(){return!!window.siyuan?.mobile}function Oa(n){const e=document.createElement("div");e.className="exs-mobile-shell";const t=document.createElement("div");t.className="exs-mobile-header";const i=document.createElement("div");i.className="exs-mobile-title",i.textContent=n.data.dataPath?T(n.data.dataPath):f("未命名白板");const a=document.createElement("button");a.type="button",a.className="exs-mobile-close",a.setAttribute("aria-label",f("关闭")),a.textContent="✕",t.append(i,a);const s=document.createElement("div");s.className="exs-mobile-body exs-panel";const o=document.createElement("div");o.className="exs-loading",o.textContent=f("正在打开白板…"),s.appendChild(o),e.append(t,s),document.body.appendChild(e),document.body.classList.add("exs-mobile-open");const r=()=>{document.querySelectorAll(".exs-mobile-shell").forEach(p=>{p!==e&&(p.style.display="none")}),e.style.display="flex"};r();let d=null,l=!1;const c=()=>{if(!l){l=!0;try{d?.dispose()}finally{d=null,e.remove(),document.querySelector(".exs-mobile-shell")||document.body.classList.remove("exs-mobile-open"),n.onDispose()}}},u={headElement:t,updateTitle:p=>{i.textContent=p},close:c,parent:{switchTab:()=>r()}},h={element:s,data:n.data,tab:u};return a.addEventListener("click",p=>{d||(p.preventDefault(),p.stopPropagation(),c())}),{custom:h,body:s,mount:p=>{d=p},showError:p=>{s.replaceChildren();const b=document.createElement("div");b.className="exs-loaderror";const _=document.createElement("div");_.textContent=p,b.appendChild(_),s.appendChild(b)},close:c,isClosed:()=>l}}const Pa="assets/excali-media";function Ba(n){const e=/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]+)$/.exec(n.trim());if(!e)return null;const t=atob(e[2]),i=new Uint8Array(t.length);for(let a=0;a<t.length;a++)i[a]=t.charCodeAt(a)&255;return{mime:e[1]||"application/octet-stream",bytes:i}}function Na(n){return{"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/svg+xml":"svg","image/bmp":"bmp","image/avif":"avif"}[n]||"bin"}async function Fa(n,e){const t=await crypto.subtle.digest("SHA-1",n);return`${Array.from(new Uint8Array(t.slice(0,8))).map(a=>a.toString(16).padStart(2,"0")).join("")}.${Na(e)}`}function ja(n,e){let t="";for(let a=0;a<n.length;a+=32768)t+=String.fromCharCode(...n.subarray(a,a+32768));return`data:${e};base64,${btoa(t)}`}function Ha(){let n="";try{n=getComputedStyle(document.documentElement).getPropertyValue("--b3-theme-primary").trim()}catch{return null}return n&&/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(n)?n:null}function za(n){const e=String(n??"");if(!/^\d{8}(\d{6})?$/.test(e))return 0;const t=Number(e.slice(0,4)),i=Number(e.slice(4,6)),a=Number(e.slice(6,8)),s=e.length>=12?Number(e.slice(8,10)):0,o=e.length>=12?Number(e.slice(10,12)):0,r=e.length>=14?Number(e.slice(12,14)):0,d=new Date(t,i-1,a,s,o,r).getTime();return Number.isFinite(d)?d:0}function Ua(n){if(typeof n!="string"||n==="")return 0;let e;try{e=JSON.parse(n)}catch{return 0}const t=e?.blocks;if(!t||typeof t!="object")return 0;const i=new Set;for(const a of Object.values(t)){const s=a?.root_id;typeof s=="string"&&s&&i.add(s)}return i.size}function Wa(n){return{docId:n.id,title:n.content||f("无标题"),hpath:n.hpath||"",svg:n.svg||"",updated:za(n.updated),refs:Ua(n.refs)}}function Xa(n,e){const t=new Map(e.map(i=>[E(i.svg),i]));return n.map(i=>{const a=E(i.path),s=t.get(a);return{dataPath:a,name:T(i.path),docId:s?.docId??"",docTitle:s?.title??"",updated:i.updated}})}function ye(n){return n.docTitle||n.name.replace(/\.svg$/i,"")}function Ga(n,e){return n.map(t=>`${t.dataPath}\0${t.name}\0${t.docId}\0${t.docTitle}\0${t.updated}\0${e.has(t.dataPath)?1:0}`).join("")}function Ya(n,e){let t=String(n??"").trim().replace(/\\/g,"/").replace(/\/+$/,"");t!==""&&!t.startsWith("/")&&(t=`/${t}`);const i=String(e??"").trim()||f("未命名白板");return`${t}/${i}`}function xn(n){return`![[${n}]]`}function Za(n){return String(n??"").replace(/["\r\n]/g," ").replace(/\s+/g," ").trim()}function qa(n,e){return`((${n} "${Za(e)}"))`}function Ka(n){return{svgPath:n.dataPath,bakPaths:mi(n.dataPath),doc:n.docId?{id:n.docId,title:n.docTitle}:null}}function Ja(n){if(typeof n!="string")return null;const e=/^siyuan:(?:\/\/)?doc\/([A-Za-z0-9-]{10,})$/.exec(n.trim());return e?e[1]??null:null}const Va="application/x-siyuan-excali-board";function Qa(n){return n.split("/").map(e=>{try{return decodeURIComponent(e)}catch{return e}}).join("/")}function to(n){const e=String(n??"").trim().replace(/\\/g,"/");if(e==="")return null;const t=D(E(e));return!/\.svg$/i.test(t)||Ae(t)||t.split("/").some(i=>i===".."||i==="")?null:t}function eo(n){if(typeof n!="string")return null;const e=n.trim(),t=/^siyuan:(?:\/\/)?excali\/(.+)$/.exec(e);return t?to(Qa(t[1]??"")):null}function no(n){const e=eo(n);return e?E(e):null}const pt="assets";function io(n){return/^excali-\d{8}-\d{6}\.svg$/i.test(n)}function so(n){const e=E(n).replace(/^\/data\//,""),t=e.lastIndexOf("/");return t<0?"":e.slice(0,t)}function ao(n,e){return so(n)===e.replace(/^\/+|\/+$/g,"")}function oo(n,e=pt){const t=e.replace(/^\/+|\/+$/g,""),i=[],a=new Set;for(const s of[...n.recent,...n.registry,...n.docSvgs,...n.autoNamed]){if(typeof s!="string"||!/\.svg$/i.test(s)||Ae(s))continue;const o=E(s);!ao(o,t)||a.has(o)||(a.add(o),i.push(o))}return i}function ro(n,e){const t=[],i=new Set;for(const a of n){const s=E(a),o=e.get(s)??s;i.has(o)||(i.add(o),t.push(o))}return t}let Nt=null;function lo(n){n.eventBus.on("switch-protyle",({detail:e})=>{Nt=e.protyle}),n.eventBus.on("click-editorcontent",({detail:e})=>{Nt=e.protyle})}function bi(){if(Nt?.wysiwyg?.element?.isConnected)return Nt;const n=k.getAllEditor();for(let e=n.length-1;e>=0;e--){const t=n[e].protyle;if(t?.wysiwyg?.element?.isConnected)return t}return null}function yi(n){return n.replace(/'/g,"''")}async function Z(n,e){const t=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}),i=await t.json().catch(()=>null);if(!t.ok||!i||i.code!==0)throw new Error(i?.msg||`${n} HTTP ${t.status}`);return i}async function co(n,e,t){const a=(await Z("/api/filetree/createDocWithMd",{notebook:n,path:e,markdown:t})).data;if(!a?.blockID)throw new Error("createDocWithMd 未返回 blockID");return a.blockID}async function Ie(n){const e=await Z("/api/query/sql",{stmt:n});return Array.isArray(e.data)?e.data:[]}async function ho(n,e,t){const i=`![${t}](${e})`;return(await Z("/api/block/appendBlock",{dataType:"markdown",data:i,parentID:n})).data?.[0]?.doOperations?.find(o=>o.action==="insert")?.id??""}async function oe(n,e){await Z("/api/attr/setBlockAttrs",{id:n,attrs:e})}async function Sn(n,e){if(!n||!e||n===e)return 0;const t=`%${n.replace(/[\\%_]/g,"\\$&")}%`,i=await Ie(`SELECT id FROM blocks WHERE content LIKE '${yi(t)}' ESCAPE '\\'`);let a=0;for(const s of i)try{const r=(await Z("/api/block/getBlockKramdown",{id:s.id})).data?.kramdown;if(typeof r!="string"||!r.includes(n))continue;await Z("/api/block/updateBlock",{id:s.id,dataType:"markdown",data:r.split(n).join(e)}),a++}catch(o){console.warn("[excali-studio] 更新资源引用失败（忽略）",s.id,o)}return a}async function fo(n){await Z("/api/filetree/removeDoc",{id:n})}async function po(){const e=bi()?.block?.rootID;return e&&(await Ie(`SELECT box FROM blocks WHERE id = '${yi(e)}' LIMIT 1`))[0]?.box||null}async function kn(){return(await Ie(`SELECT b.id, b.content, b.hpath, b.updated, a.value AS svg
     FROM blocks b
     INNER JOIN attributes a ON a.block_id = b.id AND a.name = 'custom-excali-svg'
     WHERE b.type = 'd'
     ORDER BY b.updated DESC`)).map(e=>({id:e.id,content:e.content||"",hpath:e.hpath||"",updated:Number(e.updated)||0,refs:"",svg:typeof e.svg=="string"?e.svg:""}))}async function uo(n){const t=(await Z("/api/attr/getBlockAttrs",{id:n})).data?.attrs;return t&&typeof t=="object"?t:{}}async function go(){const e=(await Z("/api/notebook?listNotebooks",{})).data,t=Array.isArray(e)?e.find(i=>typeof i?.id=="string"&&i.id!==""):void 0;return typeof t?.id=="string"?t.id:null}function re(n){const e=Ca(n);let t=0;return document.querySelectorAll("img").forEach(i=>{let a;try{a=new URL(i.src,location.href)}catch{return}decodeURIComponent(a.pathname)===e&&(a.searchParams.set("t",String(Date.now())),i.src=a.href,t++)}),t}function mo(n){let e;try{e=new URL(n,location.href)}catch{return null}const t=decodeURIComponent(e.pathname);return t.startsWith("/assets/")?Ma(t.replace(/^\/+/,"")):null}function bo(n){for(const e of n){const t=e.tagName==="IMG"?e:e.querySelector("img");if(!t)continue;const i=mo(t.getAttribute("src")||t.dataset.src||"");if(i&&/\.svg$/i.test(i))return i}return null}function wi(n,e=new Date){if(!n)return"";const t=new Date(n),i=d=>String(d).padStart(2,"0"),a=`${i(t.getHours())}:${i(t.getMinutes())}`,s=d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;if(s(t)===s(e))return`${f("今天")} ${a}`;const o=new Date(e);if(o.setDate(e.getDate()-1),s(t)===s(o))return`${f("昨天")} ${a}`;const r=`${i(t.getMonth()+1)}-${i(t.getDate())}`;return t.getFullYear()===e.getFullYear()?`${r} ${a}`:`${t.getFullYear()}-${r}`}function yo(n,e){const t=e.trim().toLowerCase();return t===""?n:n.filter(i=>T(i.path).toLowerCase().includes(t))}const wo={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function le(n){return n.replace(/[&<>"']/g,e=>wo[e])}function xo(n,e){return new Promise(t=>{let i=!1,a=!1,s,o=n,r=-1;const d=g=>{i||(i=!0,s!==void 0&&window.clearTimeout(s),l.destroy(),t(g))},l=new k.Dialog({title:f("打开白板…"),width:"520px",content:`<div class="exs-picker">
  <input class="b3-text-field fn__block exs-picker__search" placeholder="${f("搜索文件名…")}" />
  <div class="exs-picker__list b3-list b3-list--background"></div>
</div>`,destroyCallback:()=>d(null)}),c=l.element.querySelector(".exs-picker__search"),u=l.element.querySelector(".exs-picker__list"),h=()=>{if(o.length===0){u.innerHTML=`<div class="exs-picker__empty">${f("没有匹配的白板")}</div>`;return}u.innerHTML=o.map((g,m)=>{const x=`b3-list-item exs-picker__item${m===r?" b3-list-item--focus":""}`,w=e.has(E(g.path))?`<span class="exs-picker__badge">${f("已打开")}</span>`:"",y=wi(g.updated),v=w||y?`<span class="b3-list-item__meta">${w}${le(y)}</span>`:"";return`<div class="${x}" data-idx="${m}" title="${le(g.path)}"><span class="b3-list-item__text">${le(T(g.path))}</span>${v}</div>`}).join("")},p=g=>{const m=o[g];m&&d(m.path)},b=g=>{o.length!==0&&(r=r<0?g>0?0:o.length-1:(r+g+o.length)%o.length,h(),u.querySelector(".b3-list-item--focus")?.scrollIntoView({block:"nearest"}))},_=()=>{s!==void 0&&window.clearTimeout(s),s=window.setTimeout(()=>{s=void 0,o=yo(n,c.value),r=-1,h()},120)};c.addEventListener("compositionstart",()=>{a=!0}),c.addEventListener("compositionend",()=>{a=!1,_()}),c.addEventListener("input",()=>{a||_()}),c.addEventListener("keydown",g=>{g.isComposing||g.keyCode===229||(g.key==="ArrowDown"?(g.preventDefault(),b(1)):g.key==="ArrowUp"?(g.preventDefault(),b(-1)):g.key==="Enter"?(g.preventDefault(),p(r>=0?r:0)):g.key==="Escape"&&(g.preventDefault(),d(null)))}),u.addEventListener("click",g=>{const m=g.target?.closest(".exs-picker__item");m&&p(Number(m.dataset.idx))}),c.focus(),h()})}const So={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},It=n=>n.replace(/[&<>"']/g,e=>So[e]);function ko(n){const e=document.createElement("div");e.className="exs-dock",e.innerHTML=`
  <div class="block__icons exs-dock__head">
    <div class="block__logo fn__flex-1"><span class="fn__ellipsis">${f("白板库")}</span><span class="exs-dock__count" data-role="libcount"></span></div>
    <span class="fn__space"></span>
    <button class="block__icon block__icon--show ariaLabel" data-act="new" aria-label="${f("新建白板")}" data-position="north" title="${f("新建白板")}" type="button"><svg aria-hidden="true" focusable="false"><use xlink:href="#iconAdd"></use></svg></button>
    <button class="block__icon block__icon--show ariaLabel" data-act="delete-active" data-role="del-active" aria-label="${f("删除当前白板")}" data-position="north" title="${f("删除当前白板")}" type="button" disabled><svg aria-hidden="true" focusable="false"><use xlink:href="#iconTrashcan"></use></svg></button>
    <button class="block__icon block__icon--show ariaLabel" data-act="lib-refresh" aria-label="${f("刷新")}" data-position="north" title="${f("刷新")}" type="button"><svg aria-hidden="true" focusable="false"><use xlink:href="#iconRefresh"></use></svg></button>
  </div>
  <ul class="b3-list b3-list--background exs-dock__liblist" data-role="liblist"></ul>`;const t=e.querySelector('[data-role="libcount"]'),i=e.querySelector('[data-role="liblist"]'),a=e.querySelector('[data-role="del-active"]');let s="",o=[];const r=()=>{const c=n.getBoardFiles(),u=Ga(c.files,c.opened);if(u!==s){if(s=u,o=c.files,t.textContent=c.files.length>0?String(c.files.length):"",c.files.length===0){i.innerHTML=`<li class="exs-lib__hint">${f("还没有白板")}</li>`;return}i.innerHTML=c.files.map(h=>{const p=c.opened.has(h.dataPath),b=h.docId!=="",_=wi(h.updated),g=(p?`<span class="exs-lib__badge">${f("已打开")}</span>`:"")+(b?`<span class="exs-lib__badge exs-lib__badge--doc">${f("已建档")}</span>`:"");return`<li class="b3-list-item b3-list-item--narrow b3-list-item--hide-action exs-lib__item${p?" is-open":""}" data-file="${It(h.dataPath)}" title="${It(h.dataPath)}" draggable="true">
          <button class="b3-list-item__text exs-lib__text" type="button">${It(ye(h))}</button>${g}
          <span class="fn__space"></span>
          <span class="exs-lib__meta">${It(_)}</span>
          <button class="b3-list-item__action b3-tooltips b3-tooltips__w" data-act="row-rename" title="${f("重命名")}" type="button"><svg aria-hidden="true"><use xlink:href="#iconEdit"></use></svg></button>
          <button class="b3-list-item__action b3-tooltips b3-tooltips__w exs-lib__act--danger" data-act="row-delete" title="${f("删除…")}" type="button"><svg aria-hidden="true"><use xlink:href="#iconTrashcan"></use></svg></button>
        </li>`}).join("")}},d=()=>{r(),a.disabled=!n.hasActiveBoard()},l=c=>{const u=c.closest(".exs-lib__item");return u?o.find(p=>p.dataPath===u.dataset.file):void 0};return e.addEventListener("click",c=>{const u=c.target,h=u.closest("[data-act]");if(h&&!h.disabled)switch(h.dataset.act){case"new":n.openNew();return;case"delete-active":n.deleteActiveBoard();return;case"lib-refresh":n.refreshBoardLib();return;case"row-rename":{const b=l(h);b&&n.renameBoardFile(b);return}case"row-delete":{const b=l(h);b&&n.deleteBoardFile(b);return}}const p=u.closest(".exs-lib__item");if(p){const b=o.find(_=>_.dataPath===p.dataset.file);b&&n.openBoardFile(b)}}),e.addEventListener("dblclick",c=>{const u=c.target.closest(".exs-lib__item");if(!u)return;const h=o.find(p=>p.dataPath===u.dataset.file)?.docId;h&&n.openDocOf(h)}),e.addEventListener("dragstart",c=>{const u=c.target.closest(".exs-lib__item");if(!u)return;const h=o.find(_=>_.dataPath===u.dataset.file),p=c.dataTransfer;if(!h||!p)return;const b=D(h.dataPath);p.effectAllowed="copy",p.setData("text/plain",b),p.setData(Va,JSON.stringify({ref:b,title:ye(h)}))}),e.addEventListener("contextmenu",c=>{const u=c.target.closest(".exs-lib__item");if(!u)return;const h=o.find(p=>p.dataPath===u.dataset.file);h&&(c.preventDefault(),n.openFileMenu(h,c.clientX,c.clientY))}),n.onRefresh(d),d(),{element:e,refresh:d}}const Mt="0.3.0",vn="excali-studio-version";function vo(n,e){const t=e.trim();if(!t)return"unknown-version";const i=(typeof n=="string"?n:"").trim();return i?i===t?"up-to-date":"show":"first-install"}function Eo(n){return`/data/plugins/${n}/CHANGELOG.md`}const _o={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function Ao(n){return n.replace(/[&<>"']/g,e=>_o[e])}function $o(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}async function Io(n){const e=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:n})});if(!e.ok)throw new Error(`getFile HTTP ${e.status}`);const t=await e.text();if((e.headers.get("content-type")||"").includes("application/json")||/"code"\s*:\s*404/.test(t))throw new Error(`getFile 读不到文件：${n}`);return t}function Mo(n,e){const t=e.trim();if(!t)return"";const i=new RegExp(`^##\\s+v?${$o(t)}(?![0-9.])`,"m").exec(n);if(!i)return"";const a=(()=>{const l=n.indexOf(`
`,i.index);return l<0?n.length:l+1})(),o=n.slice(a).search(/^##[ \t]/m),r=o<0?n.length:a+o;return n.slice(i.index,r).replace(/\s+$/,"").replace(/\n-{3,}$/,"").replace(/\s+$/,"")}function Co(n){const e=globalThis.Lute;if(e?.New)try{const t=e.New().Md2HTML?.(n);if(t)return t}catch{}return`<pre class="exs-changelog__plain">${Ao(n)}</pre>`}function To(n){const e=[];let t=!1;for(const i of(n||"").split(/\r?\n/)){if(/^\s*```/.test(i)){t=!t;continue}if(t)continue;const a=i.match(/^(#{1,6})\s+(.+?)\s*$/);a&&e.push({level:a[1].length,text:a[2]})}return e}function Ro(n){const e=(n||"").split(/\r?\n/);let t=-1;for(let a=0;a<e.length;a++)if(/^\s*\|.*\|\s*$/.test(e[a])){t=a;break}if(t<0)return null;const i=[];for(let a=t;a<e.length;a++){const s=e[a];if(!/^\s*\|.*\|\s*$/.test(s))break;const o=s.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(r=>r.trim());o.every(r=>/^:?-{2,}:?$/.test(r))||i.push(o)}return i.length===0?null:{headers:i[0],rows:i.slice(1)}}function Lo(n){const e=(n||"").split(/\r?\n/),t=[],i=[];for(const a of e){const s=a.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+?)\s*$/);if(!s){if(a.trim()===""||i.length===0)continue;continue}const o=Math.floor(s[1].replace(/\t/g,"  ").length/2),r={text:s[2],depth:o,children:[]};for(;i.length>o+1;)i.pop();if(o===0||i.length===0){if(o>0&&t.length===0){t.push(r),i.length=0,i.push(r);continue}t.push(r),i.length=0,i.push(r)}else(i[o-1]??i[i.length-1]).children.push(r),i[o]=r}return t}function Do(n){const e=(n||"").match(/```[a-zA-Z0-9]*\r?\n([\s\S]*?)```/);return e?e[1]:null}function Oo(n){const e=(n||"").match(/^#\s+(.+?)\s*$/m)?.[1]??"",t=/@excalidraw-onload/.test(n||""),i=(Do(n)??(n||"").replace(/^#.*$/gm,"").replace(/@excalidraw-onload/g,"")).trim(),s=((n||"").split(/```/)[0]??"").split(`
`).filter(o=>!/^#\s/.test(o)&&!o.includes("@excalidraw-onload")).join(" ").replace(/\s+/g," ").trim();return{title:e,onload:t,code:i,description:s}}const F="assets/excali-scripts",Po=50,ft={"text-numbering.md":[{key:"format",label:f("默认编号格式"),type:"select",default:"1",options:[{value:"1",label:f("数字（1. 2. 3.）")},{value:"2",label:f("罗马大写（I. II. III.）")},{value:"3",label:f("罗马小写（i. ii. iii.）")},{value:"4",label:f("字母大写（A. B. C.）")},{value:"5",label:f("字母小写（a. b. c.）")},{value:"6",label:f("无序列表（• • •）")}]}],"box-selection.md":[{key:"padding",label:f("外框边距（像素）"),type:"number",default:20,min:0,max:200}]};async function xi(n){const e=await fetch("/api/file/readDir",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:E(n)})}),t=await e.json().catch(()=>null);return!e.ok||!t||t.code!==0?[]:Array.isArray(t.data)?t.data.filter(i=>i&&i.isDir!==!0&&typeof i.name=="string").map(i=>i.name):[]}async function we(n){const e=await j(E(n));return Oo(e)}async function Ct(){let n=[];try{n=await xi(F)}catch{return[]}const e=[];for(const t of n.filter(i=>/\.md$/i.test(i)).sort().slice(0,Po)){const i=`${F}/${t}`;try{const a=await we(i);e.push({path:i,name:t,title:a.title||t.replace(/\.md$/i,""),description:a.description,onload:a.onload,builtin:ar.has(t)})}catch{}}return e}async function Si(n){const e=new FormData;e.append("path",E(n)),e.append("isDir","true"),await fetch("/api/file/putFile",{method:"POST",body:e}).catch(()=>{})}async function Bo(){let n=[];try{n=await xi(F)}catch{n=[]}const e=xt.filter(i=>!n.includes(i.file));if(e.length===0)return 0;await Si(F);let t=0;for(const i of e)try{await ot(E(`${F}/${i.file}`),i.content),t++}catch(a){console.warn("[excali-studio] 内置脚本写入失败",i.file,a)}return t}async function ki(){const n=[];for(const e of xt)try{(await j(E(`${F}/${e.file}`))).trim()!==e.content.trim()&&n.push(e.file)}catch{}return n}async function No(){const n=new Set(await ki());if(n.size===0)return 0;await Si(F);let e=0;for(const t of xt)if(n.has(t.file))try{await ot(E(`${F}/${t.file}`),t.content),e++}catch(i){console.warn("[excali-studio] 内置脚本重置失败",t.file,i)}return e}function ce(n){let e=5381;for(let t=0;t<n.length;t++)e=e*33^n.charCodeAt(t);return e>>>0}async function Fo(n){const e={...n},t=[],i=[];for(const a of xt){let s;try{s=await j(E(`${F}/${a.file}`))}catch{continue}if(s.trim()===a.content.trim()){e[a.file]=ce(s);continue}const o=e[a.file];if(o===void 0||o===ce(s))try{await ot(E(`${F}/${a.file}`),a.content),e[a.file]=ce(a.content),t.push(a.file)}catch(r){console.warn("[excali-studio] 内置脚本自动更新失败",a.file,r),i.push(a.file)}else i.push(a.file)}return{updated:t,drifted:i,snapshot:e}}const jo=`# 笔记标题 → 思维导图

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
`,Ho=`# Markdown 表格 → 渲染表格

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
`,zo=`# 缩进列表 → 流程图

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
`,Uo=`# 批量导入图片

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
`,Wo=`# 对齐与分布

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
`,Xo=`# 序号标注

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
`,Go=`# 智能连线

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
`,Yo=`# 任务清单 → 三列看板

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
`,Zo=`# 导出分步图

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
`,qo=`# 重复补间（选中 2 个）

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
`,Ko=`# 选区加外框

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
`,Jo=`# 统一尺寸（选中 2 个以上）

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
`,Vo=`# 反转箭头

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
`,Qo=`# 形状互转

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
`,tr=`# 文字编号（按选择顺序）

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
`,er=`# 荧光笔

把笔刷切到荧光笔并进入手绘工具，之后直接在画布上拖拽就行——对标 Obsidian Excalidraw
的 Highlighter tool。

颜色 / 粗细 / 透明度读的是插件设置里那一份，和右缘竖条色板**同一个配置**（在色板改完
这里立刻跟着变）。脚本侧刻意不带参数：两处各存一套迟早打架，竖向色板是唯一的调色入口。

\`\`\`js
ea.highlighter();
const p = ea.getPen();
ea.notify("荧光笔：" + p.color + " · 约 " + Math.round(p.width * 4.25) + "px · " + p.opacity + "%");
\`\`\`
`,nr=`# 素材配方（改色 / 重新生成）

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
`,ir=`# 选区折叠为列表

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
`,sr=`# 画框折叠 / 展开

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
`,xt=[{file:"mindmap-from-headings.md",content:jo},{file:"table-from-markdown.md",content:Ho},{file:"flowchart-from-list.md",content:zo},{file:"batch-import-images.md",content:Uo},{file:"align-and-distribute.md",content:Wo},{file:"number-badges.md",content:Xo},{file:"smart-connect.md",content:Go},{file:"kanban-from-list.md",content:Yo},{file:"export-steps.md",content:Zo},{file:"repeat-tween.md",content:qo},{file:"box-selection.md",content:Ko},{file:"uniform-size.md",content:Jo},{file:"reverse-arrows.md",content:Vo},{file:"change-shape.md",content:Qo},{file:"text-numbering.md",content:tr},{file:"highlighter.md",content:er},{file:"material-recipe.md",content:nr},{file:"selection-fold.md",content:ir},{file:"frame-collapse.md",content:sr}],ar=new Set(xt.map(n=>n.file));async function En(n,e,t){const i=[],a=r=>(...d)=>{try{i.push(`[${r}] ${d.map(l=>typeof l=="string"?l:JSON.stringify(l)).join(" ")}`)}catch{i.push(`[${r}] <无法序列化的输出>`)}},s={log:a("log"),warn:a("warn"),error:a("error"),info:a("log"),debug:a("log")},o=Date.now();try{return await new Function("ea","utils","console",`"use strict";
return (async () => {
${n}
})();`)(e,t,s),{ok:!0,logs:i,durationMs:Date.now()-o}}catch(r){const d=r instanceof Error?`${r.message}
${r.stack??""}`:String(r);return{ok:!1,logs:i,error:d,durationMs:Date.now()-o}}}let _n=0;function xe(n="ea"){return _n+=1,`${n}-${Date.now().toString(36)}-${_n.toString(36)}`}function rt(n,e){let t=0;for(const i of n)t+=/[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(i)?1:.56;return Math.ceil(t*e)}function or(n){let e=n.x,t=n.y,i=n.x+n.width,a=n.y+n.height;if(n.points&&n.points.length>0){e=t=1/0,i=a=-1/0;for(const[o,r]of n.points)e=Math.min(e,n.x+o),t=Math.min(t,n.y+r),i=Math.max(i,n.x+o),a=Math.max(a,n.y+r)}const s=n.angle??0;if(s!==0){const o=(e+i)/2,r=(t+a)/2,d=Math.cos(s),l=Math.sin(s),c=[[e,t],[i,t],[e,a],[i,a]];let u=1/0,h=1/0,p=-1/0,b=-1/0;for(const[_,g]of c){const m=_-o,x=g-r,w=o+m*d-x*l,y=r+m*l+x*d;u=Math.min(u,w),h=Math.min(h,y),p=Math.max(p,w),b=Math.max(b,y)}e=u,t=h,i=p,a=b}return{minX:e,minY:t,maxX:i,maxY:a,width:i-e,height:a-t,cx:(e+i)/2,cy:(t+a)/2}}function Ht(n){if(n.length===0)return null;const e=n.map(or),t=Math.min(...e.map(o=>o.minX)),i=Math.min(...e.map(o=>o.minY)),a=Math.max(...e.map(o=>o.maxX)),s=Math.max(...e.map(o=>o.maxY));return{minX:t,minY:i,maxX:a,maxY:s,width:a-t,height:s-i,cx:(t+a)/2,cy:(i+s)/2}}function An(n,e){if((n.angle??0)!==0)return{x:n.x+n.width/2,y:n.y+n.height/2};switch(e){case"top":return{x:n.x+n.width/2,y:n.y};case"bottom":return{x:n.x+n.width/2,y:n.y+n.height};case"left":return{x:n.x,y:n.y+n.height/2};case"right":return{x:n.x+n.width,y:n.y+n.height/2}}}function $n(n,e){const t=e.x+e.width/2-(n.x+n.width/2),i=e.y+e.height/2-(n.y+n.height/2);return Math.abs(t)>=Math.abs(i)?t>=0?"right":"left":i>=0?"bottom":"top"}function vi(n,e,t){const i=[];for(const a of n.split(`
`)){let s="",o=0;for(const r of a){const d=/[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(r)?1:.56;s!==""&&o+d>e/t?(i.push(s),s=r,o=d):(s+=r,o+=d)}i.push(s)}return i}function In(n,e,t="",i={}){const a=o=>n.addElements([o])[0]??"";return{addRect:o=>a({...o,type:"rectangle"}),addDiamond:o=>a({...o,type:"diamond"}),addEllipse:o=>a({...o,type:"ellipse"}),addArrow:o=>a({...o,type:"arrow"}),addLine:o=>a({...o,type:"line"}),addText:o=>a({...o,type:"text"}),addFrame:o=>a({...o,type:"frame"}),addImage:(o,r)=>n.addImage(o,r),getElements:()=>n.getElements(),getElement:o=>n.getElements().find(r=>r.id===o),addElements:o=>n.addElements(o.map(r=>({...r,type:r.type??"rectangle"}))),deleteElements:o=>n.deleteElements(o),clear:()=>n.clear(),selectElements:o=>n.selectElements(o),setStyle:(o,r)=>{const d=o==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):o;d.length!==0&&n.patchElements(d,r)},setText:(o,r)=>{const d=n.getElements().find(h=>h.id===o);if(!d||d.type!=="text")return;const l=d.fontSize??20,c=d.lineHeight??1.25,u=String(r).split(`
`);n.patchElements([o],{text:r,originalText:r,width:Math.max(1,...u.map(h=>rt(h,l))),height:Math.ceil(l*c*u.length)})},zoomToFit:()=>n.scrollToContent(),scrollToElement:o=>n.scrollToElement(o),getViewMode:()=>!!n.getAppState().viewModeEnabled,setViewMode:o=>n.setViewMode(o),getBackground:()=>n.getAppState().viewBackgroundColor??"",setBackground:o=>n.updateScene({viewBackgroundColor:o}),setLink:(o,r)=>{const d=o==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):o;d.length!==0&&n.patchElements(d,{link:r})},getLink:o=>{const r=n.getElements().find(d=>d.id===o);return r&&typeof r.link=="string"?r.link:null},exportSVG:(o,r)=>n.exportImage("svg",o,r),exportPNG:(o,r)=>n.exportImage("png",o,r),save:()=>e.save(),notify:o=>e.notify(o),getDocMarkdown:()=>e.getDocMarkdown(),getSelectedText:()=>e.getSelectedText(),listFiles:o=>e.listFiles(o),addImageFromFile:async(o,r)=>{const d=await e.readFileAsDataURL(o);return n.addImage(d,r)},settings:e.getSettings(),targetView:{getTitle:()=>"board"},getSelectedElements:()=>Object.keys(n.getAppState().selectedElementIds??{}),getBoundingBox:o=>{const r=o==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):o;if(r.length===0)return null;const d=new Set(r),l=n.getElements().filter(c=>d.has(c.id));return Ht(l)},connectObjects:(o,r,d,l,c)=>n.connectObjects(o,r,d,l,c),group:o=>{if(o.length<2)return null;const r=xe("group");return n.patchElements(o,{groupIds:[r]}),r},unGroup:o=>{n.patchElements(o,{groupIds:[]})},toFront:o=>Mn(n,o,"front"),toBack:o=>Mn(n,o,"back"),setPosition:(o,r,d)=>n.patchElements([o],{x:r,y:d}),moveBy:(o,r,d)=>{const l=o==="selection"?Object.keys(n.getAppState().selectedElementIds??{}):o;for(const c of l){const u=n.getElements().find(h=>h.id===c);u&&n.patchElements([c],{x:u.x+r,y:u.y+d})}},measureText:(o,r=20)=>({width:rt(o,r),height:Math.ceil(r*1.25)}),wrapText:(o,r,d=20)=>vi(o,r,d),addEmbeddable:(o,r)=>n.addEmbeddable(o,r),addLibraryItem:o=>n.addLibraryItem(o),getTheme:()=>n.getTheme(),setTheme:o=>n.setTheme(o),getPen:()=>n.getPen(),setPen:o=>{const r=n.getPen(),d={color:o.color??r.color,width:o.width??r.width,opacity:o.opacity??r.opacity,roughness:o.roughness??r.roughness};n.applyPen({...Bt(d),roughness:d.roughness},o.tool)},highlighter:()=>n.applyPen({...e.getHighlighter(),roughness:ua},"freedraw"),siyuan:{call:(o,r)=>e.siyuanCall(o,r??{})},getModifiers:()=>({shift:!!i.shift}),getScriptSetting:(o,r)=>{const d=e.getScriptSetting(t,o);return d===void 0?r:d},setScriptSetting:(o,r)=>e.setScriptSetting(t,o,r),utils:{uuid:()=>xe("uuid"),now:()=>Date.now(),parseHeadings:To,parseList:Lo,parseTable:Ro,inputPrompt:async(o,r="text",d="")=>await e.inputPrompt(o,r,d)??"",selectOption:o=>e.selectOption({...o,at:o.at??i.at})}}}function Mn(n,e,t){const i=[...n.getElements()].sort((d,l)=>String(d.index??"").localeCompare(String(l.index??"")));if(i.length===0)return;const a=new Set(e),s=i.filter(d=>a.has(d.id)),o=i.filter(d=>!a.has(d.id));if(s.length===0||o.length===0)return;(t==="front"?[...o,...s]:[...s,...o]).forEach((d,l)=>{const c=String(i[l].index??"");String(d.index??"")!==c&&n.patchElements([d.id],{index:c})})}const zt={pencil:{background:"#fffdf7",ink:"#1e1e1e",fill:"#ffffff",edge:"#495057",muted:"#868e96",strokeWidth:2,roughness:1,fillStyle:"solid",strokeStyle:"solid",fontFamily:5,fontSizes:{title:28,node:16,edge:14,caption:14},nodeRoundness:{type:3}},marker:{background:"#ffffff",ink:"#1e1e1e",fill:"#ffec99",fillPalette:["#ffec99","#b2f2bb","#a5d8ff","#ffc9c9","#d0bfff","#ffd8a8","#c3fae8","#e9fac8"],edge:"#e03131",muted:"#868e96",strokeWidth:2,roughness:1,fillStyle:"solid",strokeStyle:"solid",fontFamily:5,fontSizes:{title:28,node:16,edge:14,caption:14},nodeRoundness:{type:3}},blueprint:{background:"#f8fbff",ink:"#1971c2",fill:"#e7f5ff",edge:"#1971c2",muted:"#4dabf7",strokeWidth:1,roughness:0,fillStyle:"solid",strokeStyle:"solid",fontFamily:3,fontSizes:{title:26,node:15,edge:13,caption:12},nodeRoundness:{type:3}}},rr=Object.keys(zt),tt=new Map,Ft=new Map,lr=8,cr={hand:"pencil",handdrawn:"pencil","hand-drawn":"pencil",sketch:"pencil",ink:"pencil",color:"marker",colour:"marker",crayon:"marker",vivid:"marker",highlight:"marker",technical:"blueprint",line:"blueprint",wireframe:"blueprint",mono:"blueprint"};function lt(n){return n.trim().toLowerCase().replace(/[\s_]+/g,"-").replace(/[^a-z0-9._-]/g,"").replace(/^-+|-+$/g,"")}function dr(n){if(typeof n!="string")return null;const e=lt(n);if(e in zt)return e;const t=cr[e];return t||(tt.has(e)?e:null)}function hr(n){return lt(n)in zt||tt.has(lt(n))}function fr(n,e){tt.set(n,e),Ft.clear()}function pr(){tt.clear(),Ft.clear()}function ur(n){return tt.get(n)?.extendsFrom??null}function Ei(){return[...rr,...[...tt.keys()].sort()]}function _i(n,e){const t=Ft.get(n);if(t)return t;const i=zt[n];if(i)return i;const a=tt.get(n);if(!a)throw new Error(`style:unknown-style (${n})`);if(e.includes(n)||e.length>=lr)throw new Error(`style:circular-extends (${[...e,n].join(" <- ")})`);const s=_i(a.extendsFrom,[...e,n]),o=a.diff.fontSizes,r={...s,...a.diff,fontSizes:{title:o?.title??s.fontSizes.title,node:o?.node??s.fontSizes.node,edge:o?.edge??s.fontSizes.edge,caption:o?.caption??s.fontSizes.caption},...a.diff.space?{space:{...s.space,...a.diff.space}}:{},...a.diff.fillPalette?{fillPalette:a.diff.fillPalette.slice()}:{}};return Ft.set(n,r),r}function Ut(n){return _i(n,[])}function gr(n){let e=2166136261;for(let t=0;t<n.length;t++)e^=n.charCodeAt(t),e=Math.imul(e,16777619);return e>>>0}function mr(n,e,t){const i=n.groupColor?.roles;if(n.groupColor?.mode==="roles"&&t&&i){const o=i[t]??i[t.toLowerCase()];if(o)return o}const a=n.fillPalette;if(!a||a.length===0)return n.fill;const s=t&&t!==""?`g:${t}`:`i:${e}`;return a[gr(s)%a.length]}const br={minW:160,minH:90,padX:64,padY:40,gapX:110,gapY:64,gridGapX:90,gridGapY:72,radialMinRadius:240,radialGap:120,maxGridCols:4,textWrap:200};function yr(n){return{...br,...n.space}}function wr(n,e,t,i){const a=e.fontSizes.node,s=vi(n.label,i.textWrap,a),o=Math.max(1,...s.map(c=>rt(c,a))),r=Math.ceil(s.length*a*1.25);let d,l;return n.shape==="text"?(d=Math.max(o,24),l=Math.max(r,a)):(d=Math.max(i.minW,o+i.padX),l=Math.max(i.minH,r+i.padY)),n.shape==="ellipse"?(d=Math.ceil(d*1.1),l=Math.ceil(l*1.12)):n.shape==="diamond"&&(d=Math.ceil(d*1.24),l=Math.ceil(l*1.32)),{id:n.id,label:n.label,shape:n.shape,...n.group?{group:n.group}:{},index:t,fill:n.shape==="text"?"transparent":mr(e,t,n.group),lines:s,x:0,y:0,width:d,height:l}}function xr(n,e){const t=new Map(n.map(d=>[d.id,d.index])),i=new Map(n.map(d=>[d.id,0])),a=new Map(n.map(d=>[d.id,[]]));for(const d of e)a.get(d.from)?.push(d.to),i.set(d.to,(i.get(d.to)??0)+1);const s=new Map(n.map(d=>[d.id,0])),o=new Set,r=n.filter(d=>(i.get(d.id)??0)===0).map(d=>d.id);for(;o.size<n.length;){if(r.length===0){const c=n.filter(h=>!o.has(h.id)).sort((h,p)=>(t.get(h.id)??0)-(t.get(p.id)??0))[0];let u=0;for(const h of e)h.to===c.id&&o.has(h.from)&&(u=Math.max(u,(s.get(h.from)??0)+1));s.set(c.id,u),r.push(c.id)}const d=r.shift();if(!(!d||o.has(d))){o.add(d);for(const l of a.get(d)??[]){if(o.has(l))continue;s.set(l,Math.max(s.get(l)??0,(s.get(d)??0)+1));const c=(i.get(l)??1)-1;i.set(l,c),c<=0&&r.push(l)}}}return s}function Ai(n,e){const t=xr(n,e),i=new Map;for(const a of n){const s=t.get(a.id)??0,o=i.get(s)??[];o.push(a),i.set(s,o)}return i}function Sr(n,e,t){const i=Ai(n,e),a=[...i.keys()].sort((l,c)=>l-c),s=a.map(l=>Math.max(...(i.get(l)??[]).map(c=>c.width))),o=a.map(l=>{const c=i.get(l)??[];return c.reduce((u,h)=>u+h.height,0)+t.gapY*Math.max(0,c.length-1)}),r=Math.max(0,...o);let d=0;a.forEach((l,c)=>{const u=i.get(l)??[];let h=Math.max(0,(r-o[c])/2);for(const p of u)p.x=d+(s[c]-p.width)/2,p.y=h,h+=p.height+t.gapY;d+=s[c]+t.gapX})}function kr(n,e,t){const i=Ai(n,e),a=[...i.keys()].sort((l,c)=>l-c),s=a.map(l=>Math.max(...(i.get(l)??[]).map(c=>c.height))),o=a.map(l=>{const c=i.get(l)??[];return c.reduce((u,h)=>u+h.width,0)+t.gapX*Math.max(0,c.length-1)}),r=Math.max(0,...o);let d=0;a.forEach((l,c)=>{const u=i.get(l)??[];let h=Math.max(0,(r-o[c])/2);for(const p of u)p.x=h,p.y=d+(s[c]-p.height)/2,h+=p.width+t.gapX;d+=s[c]+t.gapY})}function vr(n,e){const t=Math.max(1,Math.min(e.maxGridCols,Math.ceil(Math.sqrt(n.length)))),i=Math.ceil(n.length/t),a=Array.from({length:t},(c,u)=>Math.max(0,...n.filter((h,p)=>p%t===u).map(h=>h.width))),s=Array.from({length:i},(c,u)=>Math.max(0,...n.slice(u*t,u*t+t).map(h=>h.height))),o=[];let r=0;for(let c=0;c<t;c++)o.push(r),r+=a[c]+e.gridGapX;const d=[];let l=0;for(let c=0;c<i;c++)d.push(l),l+=s[c]+e.gridGapY;n.forEach((c,u)=>{const h=u%t,p=Math.floor(u/t);c.x=o[h]+(a[h]-c.width)/2,c.y=d[p]+(s[p]-c.height)/2})}function Er(n,e,t){if(n.length===1){n[0].x=0,n[0].y=0;return}const i=new Map(n.map(p=>[p.id,0]));for(const p of e)i.set(p.from,(i.get(p.from)??0)+1),i.set(p.to,(i.get(p.to)??0)+1);const a=[...n].sort((p,b)=>(i.get(b.id)??0)-(i.get(p.id)??0)||p.index-b.index)[0],s=n.filter(p=>p.id!==a.id),o=Math.max(...s.map(p=>p.width)),r=Math.max(...s.map(p=>p.height)),d=Math.max(t.radialMinRadius,a.width/2+o/2+t.radialGap,a.height/2+r/2+t.radialGap);a.x=-a.width/2,a.y=-a.height/2;const l=s.length<=2?0:-Math.PI/2,c=Math.PI*2/s.length;s.forEach((p,b)=>{const _=l+c*b;p.x=Math.cos(_)*d-p.width/2,p.y=Math.sin(_)*d-p.height/2});const u=Math.min(...n.map(p=>p.x)),h=Math.min(...n.map(p=>p.y));n.forEach(p=>{p.x-=u,p.y-=h})}function _r(n){const e=[];for(const t of n){const i=e[e.length-1];(!i||Math.abs(i[0]-t[0])>.01||Math.abs(i[1]-t[1])>.01)&&e.push(t)}return e.length>=2?e:[[0,0],[0,0]]}function Ar(n,e,t){const i=new Map(n.map(s=>[s.id,s])),a=[];for(const s of e){const o=i.get(s.from),r=i.get(s.to);if(!o||!r)continue;const d=$n(o,r),l=$n(r,o),c=An(o,d),u=An(r,l),h=u.x-c.x,p=u.y-c.y,_=d==="left"||d==="right"?[[0,0],[h/2,0],[h/2,p],[h,p]]:[[0,0],[0,p/2],[h,p/2],[h,p]],g=_r(_);let m;if(s.label){const x=t.fontSizes.edge,w=rt(s.label,x),y=Math.ceil(x*1.25),v=(c.x+u.x)/2,A=(c.y+u.y)/2;m=Math.abs(h)>=Math.abs(p)?{x:v-w/2,y:A-y-8}:{x:v+10,y:A-y/2}}a.push({from:s.from,to:s.to,...s.label?{label:s.label}:{},side1:d,side2:l,p1:c,p2:u,points:g,...m?{labelAt:m}:{}})}return a}function $r(n,e){const t=n.split(`
`),i=Math.max(1,...t.map(s=>rt(s,e))),a=Math.max(1,Math.ceil(t.length*e*1.25));return{minX:0,minY:0,maxX:i,maxY:a,width:i,height:a,cx:i/2,cy:a/2}}function Ir(n){const e=Ut(n.preset),t=yr(e),i=n.nodes.map((o,r)=>wr(o,e,r,t));switch(n.layout){case"tb":kr(i,n.edges,t);break;case"grid":vr(i,t);break;case"radial":Er(i,n.edges,t);break;case"lr":default:Sr(i,n.edges,t);break}const a=Ar(i,n.edges,e),s=Ht(i)??{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,cx:0,cy:0};return{nodes:i,routes:a,titleBox:n.title?$r(n.title,e.fontSizes.title):null,contentBox:s,preset:e}}class U extends Error{constructor(e,t){super(`plan:${e}${t?` (${t})`:""}`),this.reason=e,this.detail=t,this.name="PlanError"}}const Y={maxNodes:40,maxEdges:80,maxLabel:200,maxNote:120,maxTitle:120,maxCaption:300,maxEdgeLabel:60},Mr={lr:"lr",horizontal:"lr","left-right":"lr",tb:"tb",vertical:"tb","top-down":"tb",grid:"grid",matrix:"grid",radial:"radial",mindmap:"radial",circle:"radial"},Cr={rounded:"rounded",round:"rounded",card:"rounded",rectangle:"rectangle",rect:"rectangle",square:"rectangle",box:"rectangle",ellipse:"ellipse",oval:"ellipse",circle:"ellipse",diamond:"diamond",decision:"diamond",rhombus:"diamond",text:"text",plain:"text"};function Me(n){return typeof n=="object"&&n!==null&&!Array.isArray(n)}function P(n){return typeof n=="string"?n:typeof n=="number"&&Number.isFinite(n)?String(n):""}function wt(n,e){const t=n.trim().replace(/\r\n?/g,`
`);return t.length>e?`${t.slice(0,e-1)}…`:t}function Tr(n){if(typeof n!="string")return null;const e=n.trim().toLowerCase();return Mr[e]??null}function Rr(n){return n===""?"rounded":Cr[n.trim().toLowerCase()]??null}function $i(n){return n.trim().replace(/[^\w.-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,48)}function Lr(n,e){const t=[],i=new Set;for(let a=0;a<n.length;a++){const s=n[a];let o="",r="",d="",l="";if(typeof s=="string")r=s;else if(Me(s)){o=P(s.id),r=P(s.label??s.text??s.title),d=P(s.shape),l=P(s.group);const u=P(s.note??s.description);u&&(r=r?`${r}
${u}`:u)}else{e.push(`nodes[${a}] 不是字符串或对象，已忽略`);continue}if(r=wt(r,Y.maxLabel+Y.maxNote+1),!r.trim()){e.push(`nodes[${a}] 没有 label，已忽略`);continue}const c=Rr(d);if(!c)throw new U("bad-shape",`nodes[${a}].shape=${d}`);if(o=$i(o)||`n${a+1}`,i.has(o))throw new U("duplicate-node-id",o);i.add(o),t.push({id:o,label:r,shape:c,...l.trim()?{group:wt(l,40)}:{}})}return t}function Cn(n,e){const t=n.trim();if(!t)return null;const i=e.find(o=>o.id===t||o.id===$i(t));if(i)return i.id;const a=t.toLowerCase(),s=e.filter(o=>o.label.toLowerCase()===a);return s.length===1?s[0].id:null}function Dr(n,e,t){const i=[],a=new Set;for(let s=0;s<n.length;s++){const o=n[s];let r="",d="",l="";if(typeof o=="string"){const p=o.split(/\s*->\s*/);if(p.length!==2){t.push(`edges[${s}] 不是 "a->b" 形式，已忽略`);continue}[r,d]=p}else if(Array.isArray(o))r=P(o[0]),d=P(o[1]),l=P(o[2]);else if(Me(o))r=P(o.from??o.source??o.start),d=P(o.to??o.target??o.end),l=P(o.label??o.text);else{t.push(`edges[${s}] 不是字符串/数组/对象，已忽略`);continue}const c=Cn(r,e),u=Cn(d,e);if(!c||!u){t.push(`edges[${s}] 端点不存在（${r||"?"} -> ${d||"?"}），已忽略`);continue}if(c===u){t.push(`edges[${s}] 是自环（${c}），已忽略`);continue}l=wt(l,Y.maxEdgeLabel);const h=`${c}\0${u}\0${l}`;if(a.has(h)){t.push(`edges[${s}] 与前面的边重复，已忽略`);continue}a.add(h),i.push({from:c,to:u,...l?{label:l}:{}})}return i}function Or(n,e={}){if(!Me(n))throw new U("bad-plan","计划必须是 JSON 对象");const t=[],i=n.nodes;if(!Array.isArray(i))throw new U("bad-plan","缺少 nodes 数组");if(i.length>Y.maxNodes)throw new U("too-many-nodes",`${i.length} > ${Y.maxNodes}，请拆成多张白板`);const a=Lr(i,t);if(a.length===0)throw new U("empty-plan","没有可用节点");const s=n.edges??[];if(!Array.isArray(s))throw new U("bad-plan","edges 必须是数组");if(s.length>Y.maxEdges)throw new U("too-many-edges",`${s.length} > ${Y.maxEdges}`);const o=Dr(s,a,t),r=e.preset!==void 0&&e.preset!==""?e.preset:n.preset;let d="pencil";if(r!=null&&r!==""){const b=dr(r);if(!b)throw new U("bad-preset",`${P(r)}（可选 ${Ei().join("/")}）`);d=b}const l=e.layout!==void 0&&e.layout!==""?e.layout:n.layout;let c=o.length>0?"lr":"grid";if(l!=null&&l!==""){const b=Tr(l);if(!b)throw new U("bad-layout",`${P(l)}（可选 lr/tb/grid/radial）`);c=b}const u=e.title!==void 0&&e.title!==""?e.title:n.title,h=wt(P(u),Y.maxTitle)||void 0,p=wt(P(n.caption),Y.maxCaption)||void 0;return{...h?{title:h}:{},...p?{caption:p}:{},preset:d,layout:c,nodes:a,edges:o,warnings:t}}function Pr(n){return(n??"ai").trim().replace(/[^\w.-]+/g,"_").replace(/^_+|_+$/g,"")||"ai"}function de(n,e,t,i,a,s,o,r){const d=e.split(`
`);return{type:"text",id:n,x:t,y:i,width:Math.max(1,...d.map(l=>rt(l,a))),height:Math.max(1,Math.ceil(d.length*a*1.25)),text:e,fontSize:a,fontFamily:s,strokeColor:o,textAlign:r}}function Br(n,e,t,i,a,s){const r={type:n.shape==="ellipse"?"ellipse":n.shape==="diamond"?"diamond":n.shape==="text"?"text":"rectangle",id:e,x:a+n.x,y:s+n.y,width:n.width,height:n.height,text:n.label,fontSize:i.fontSizes.node,fontFamily:i.fontFamily,strokeColor:i.ink,textAlign:n.shape==="text"?"left":"center"};return n.shape!=="text"&&(r.backgroundColor=n.fill,r.fillStyle=i.fillStyle,r.strokeWidth=i.strokeWidth,r.strokeStyle=i.strokeStyle,r.roughness=i.roughness,n.shape==="rectangle"?r.roundness=null:i.nodeRoundness&&(r.roundness=i.nodeRoundness)),n.group&&(r.groupIds=[`${t}-group-${n.group.replace(/[^\w.-]+/g,"_")}`]),r}function Nr(n,e={}){const t=Or(n,e),i=Ut(t.preset),a=Ir(t),s=Pr(e.idPrefix),o={x:e.origin?.x??0,y:e.origin?.y??0},r=o.x+40,d=o.y+(t.title?96:40),l=[],c=a.nodes.map(m=>{const x=`${s}-${m.id}`;return l.push(Br(m,x,s,i,r,d)),{...m,elementId:x}}),u=a.routes.map(m=>({...m,fromElementId:`${s}-${m.from}`,toElementId:`${s}-${m.to}`,p1:{x:r+m.p1.x,y:d+m.p1.y},p2:{x:r+m.p2.x,y:d+m.p2.y},...m.labelAt?{labelAt:{x:r+m.labelAt.x,y:d+m.labelAt.y}}:{}})),h=t.title?[de(`${s}-title`,t.title,o.x+40,o.y+24,i.fontSizes.title,i.fontFamily,i.ink,"left")]:[],p=[];u.forEach((m,x)=>{!m.label||!m.labelAt||p.push(de(`${s}-edge-${x+1}`,m.label,m.labelAt.x,m.labelAt.y,i.fontSizes.edge,i.fontFamily,i.muted,"center"))});const b=t.caption?[de(`${s}-caption`,t.caption,r,d+a.contentBox.maxY+44,i.fontSizes.caption,i.fontFamily,i.muted,"left")]:[],_=[...h,...l,...p,...b],g=Ht(_.map(m=>({x:m.x,y:m.y,width:m.width??0,height:m.height??0})))??{minX:0,minY:0,maxX:0,maxY:0,width:0,height:0,cx:0,cy:0};return{plan:t,preset:i,specs:_,nodes:c,routes:u,bbox:g,background:i.background,idPrefix:s}}const Se="assets/excali-styles",Fr=/^[a-z0-9][a-z0-9._-]{0,31}$/,jr=/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,Hr=["solid","hachure","cross-hatch"],zr=["solid","dashed","dotted"],Ii=["minW","minH","padX","padY","gapX","gapY","gridGapX","gridGapY","radialMinRadius","radialGap","maxGridCols","textWrap"],Ur=new Set(Ii),Wr=4e3,Xr=8,Gr=96,Yr=20,Zr=[0,1,2],qr=20,Tn=32,Rn=64,Kr=40;class Mi extends Error{constructor(e,t,i){super(`style:${e} (${i}) ${t}`),this.reason=e,this.source=i,this.name="StylePackError"}}function ct(n){return typeof n=="object"&&n!==null&&!Array.isArray(n)}function Ci(n){return(n.replace(/\\/g,"/").split("/").pop()??"").replace(/\.json$/i,"")}function L(n,e,t){throw new Mi(n,e,t)}function Ce(n,e,t){return(typeof n!="string"||!jr.test(n.trim()))&&L("bad-field",`${e} 需要 #rgb/#rrggbb 形式的颜色`,t),n.trim()}function mt(n,e,t,i,a){const s=typeof n=="number"?n:Number(n);return(!Number.isFinite(s)||!Number.isInteger(s)||s<t||s>i)&&L("bad-field",`${e} 需要 ${t}..${i} 的整数（收到 ${String(n)}）`,a),s}function ke(n,e,t,i){return(typeof n!="string"||!t.includes(n))&&L("bad-field",`${e} 只能是 ${t.join("/")}（收到 ${String(n)}）`,i),n}function Jr(n,e){ct(n)||L("bad-field","fontSizes 需要对象 {title,node,edge,caption}",e);const t={};for(const a of["title","node","edge","caption"]){const s=n[a];s!==void 0&&(t[a]=mt(s,`fontSizes.${a}`,Xr,Gr,e))}const i=Object.keys(n).filter(a=>!["title","node","edge","caption"].includes(a));return i.length&&L("bad-field",`fontSizes 有未知字段 ${i.join(",")}`,e),Object.keys(t).length===0&&L("bad-field","fontSizes 是空对象",e),t}function Vr(n,e){return(!Array.isArray(n)||n.length===0)&&L("bad-field","palette 需要非空数组",e),n.length>Tn&&L("bad-field",`palette 最多 ${Tn} 色`,e),n.map((t,i)=>Ce(t,`palette[${i}]`,e))}function Qr(n,e){ct(n)||L("bad-field","space 需要对象（gapX/gapY/padX/padY…）",e);const t={};for(const a of Ii){const s=n[a];s!==void 0&&(t[a]=mt(s,`space.${a}`,0,Wr,e))}const i=Object.keys(n).filter(a=>!Ur.has(a));return i.length&&L("bad-field",`space 有未知字段 ${i.join(",")}`,e),Object.keys(t).length===0&&L("bad-field","space 是空对象",e),t}function tl(n,e){ct(n)||L("bad-field","groupColor 需要对象 {mode,roles}",e);const t=ke(n.mode,"groupColor.mode",["hash","roles"],e);if(t!=="roles")return{mode:t};const i=n.roles;ct(i)||L("bad-field","groupColor.roles 需要 {分组名:颜色}",e);const a=Object.entries(i);a.length===0&&L("bad-field","groupColor.roles 是空对象",e),a.length>Rn&&L("bad-field",`groupColor.roles 最多 ${Rn} 组`,e);const s={};for(const[o,r]of a){const d=o.trim().slice(0,Kr);d||L("bad-field","groupColor.roles 有空的分组名",e),s[d]=Ce(r,`groupColor.roles.${d}`,e)}return{mode:t,roles:s}}function el(n,e){return n===null?null:typeof n=="number"?{type:n}:ct(n)&&typeof n.type=="number"?{type:n.type}:L("bad-field","nodeRoundness 需要 null / {type:number}",e)}function nl(n,e="inline",t=new Set){let i;try{i=JSON.parse(n)}catch(c){return L("bad-json",`不是合法 JSON：${c instanceof Error?c.message:String(c)}`,e)}if(!ct(i))return L("bad-pack","风格包必须是 JSON 对象",e);const a=typeof i.name=="string"&&i.name.trim()?i.name:Ci(e),s=lt(a);Fr.test(s)||L("bad-name",`${a} → ${s||"(空)"}（要求小写字母/数字/._-，首字符字母数字，≤32）`,e);const o=i.extends===void 0||i.extends===null||i.extends===""?"pencil":lt(String(i.extends));!hr(o)&&!t.has(o)&&L("bad-extends",`${o} 不存在（内置之外可用 ${[...t].join("/")||"无"}）`,e),o===s&&L("bad-extends","不能 extends 自己",e);const r={},d=["background","ink","fill","edge","muted"];for(const c of d)i[c]!==void 0&&(r[c]=Ce(i[c],c,e));if(i.palette!==void 0&&(r.fillPalette=Vr(i.palette,e)),i.strokeWidth!==void 0&&(r.strokeWidth=mt(i.strokeWidth,"strokeWidth",0,Yr,e)),i.roughness!==void 0){const c=mt(i.roughness,"roughness",0,2,e);Zr.includes(c)||L("bad-field","roughness 只能是 0/1/2",e),r.roughness=c}i.fillStyle!==void 0&&(r.fillStyle=ke(i.fillStyle,"fillStyle",Hr,e)),i.strokeStyle!==void 0&&(r.strokeStyle=ke(i.strokeStyle,"strokeStyle",zr,e)),i.fontFamily!==void 0&&(r.fontFamily=mt(i.fontFamily,"fontFamily",1,qr,e)),i.fontSizes!==void 0&&(r.fontSizes=Jr(i.fontSizes,e)),i.nodeRoundness!==void 0&&(r.nodeRoundness=el(i.nodeRoundness,e)),i.space!==void 0&&(r.space=Qr(i.space,e)),i.groupColor!==void 0&&(r.groupColor=tl(i.groupColor,e));const l=typeof i.label=="string"&&i.label.trim()?i.label.trim().slice(0,40):s;return{name:s,extendsFrom:o,label:l,diff:r}}function il(n,e="inline",t){const i=nl(n,e,t);return fr(i.name,{extendsFrom:i.extendsFrom,diff:{...i.diff,label:i.label}}),{name:i.name,extends:i.extendsFrom,label:i.label}}async function sl(n,e=Se){pr();const t=[];let i=[];try{i=(await n.list()).filter(o=>/\.json$/i.test(o)).sort()}catch(o){return t.push(`${e} 目录读不了，只用内置风格：${o instanceof Error?o.message:String(o)}`),{loaded:[],warnings:t}}const a=new Set(i.map(o=>lt(Ci(o)))),s=[];for(const o of i){const r=`${e}/${o}`;let d;try{d=await n.read(o)}catch(l){t.push(`${r} 读不到，已跳过：${l instanceof Error?l.message:String(l)}`);continue}try{s.push(il(d,r,a))}catch(l){l instanceof Mi?t.push(l.message):t.push(`${r} 加载失败：${l instanceof Error?l.message:String(l)}`)}}for(const o of s)try{Ut(o.name)}catch(r){t.push(`style:${o.name} 解析失败，绘图时不可用：${r instanceof Error?r.message:String(r)}`)}return{loaded:s,warnings:t}}function al(){const n=[];for(const e of Ei())try{n.push({name:e,extends:ur(e)??"-",label:Ut(e).label??e})}catch{}return n}const ol=12*1024*1024,rl="1024x1024",ll="gpt-image-1";function cl(n,e){const t=e.toLowerCase();for(const[i,a]of Object.entries(n??{}))if(i.toLowerCase()===t)return Array.isArray(a)?String(a[0]??""):typeof a=="string"?a:String(a??"");return""}function dl(n){const e=String(n??"").trim().replace(/\/+$/,"");if(!e)throw new Error("未配置图像 API 地址");if(!/^https?:\/\//i.test(e))throw new Error("图像 API 地址必须以 http:// 或 https:// 开头");return/\/images\/generations$/i.test(e)?e:`${e}/images/generations`}function hl(n,e,t={}){const i=String(e??"").trim();if(!i)throw new Error("prompt 不能为空");if(i.length>4e3)throw new Error("prompt 过长（上限 4000 字符）");const a=String(n.apiKey??"").trim();if(!a)throw new Error("未配置图像 API Key");const s=String(n.model??"").trim()||ll,o=String(t.size??n.size??"").trim()||rl;return{url:dl(n.baseUrl),headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},payload:JSON.stringify({model:s,prompt:i,n:1,size:o}),size:o}}function Wt(n){const e=n.replace(/\s+/g,"").replace(/-/g,"+").replace(/_/g,"/"),t=e.length%4;return t===0?e:e+"=".repeat(4-t)}function fl(n){const e=/^data:([^;,]+);base64,([\s\S]+)$/i.exec(n.trim());return e?{mime:e[1]||"image/png",base64:Wt(e[2])}:null}function pl(n){if(!n||typeof n!="object")throw new Error("图像 API 返回的不是 JSON 对象");const e=n;if(e.error){const r=e.error,d=r&&typeof r=="object"&&typeof r.message=="string"?r.message:typeof r=="string"?r:"图像 API 返回错误";throw new Error(`图像 API：${d}`)}const t=Array.isArray(e.data)?e.data[0]:e.data,i=t&&typeof t=="object"?t:e,a=typeof i.revised_prompt=="string"?i.revised_prompt:typeof e.revised_prompt=="string"?e.revised_prompt:void 0,s=typeof i.b64_json=="string"?i.b64_json:typeof e.b64_json=="string"?e.b64_json:"";if(s){const r=fl(s);return{kind:"inline",base64:r?r.base64:Wt(s),...a?{revisedPrompt:a}:{}}}const o=typeof i.url=="string"?i.url:typeof e.url=="string"?e.url:"";if(o)return{kind:"url",url:o,...a?{revisedPrompt:a}:{}};throw new Error("图像 API 没有返回图片（b64_json / url 都为空）")}function Ti(n){const e=atob(Wt(n)),t=new Uint8Array(e.length);for(let i=0;i<e.length;i++)t[i]=e.charCodeAt(i)&255;return t}function he(n,e){return n[e]<<8|n[e+1]}function Ln(n,e){return(n[e]<<24|n[e+1]<<16|n[e+2]<<8|n[e+3])>>>0}function Tt(n,e){return n[e]|n[e+1]<<8}function Dn(n,e){return n[e]|n[e+1]<<8|n[e+2]<<16}function On(n,e){return(n[e]|n[e+1]<<8|n[e+2]<<16|n[e+3]<<24)>>>0}function Pn(n){let e;try{e=Ti(n.slice(0,64))}catch{return"image/png"}return e.length>=8&&e[0]===137&&e[1]===80&&e[2]===78&&e[3]===71?"image/png":e.length>=3&&e[0]===255&&e[1]===216&&e[2]===255?"image/jpeg":e.length>=4&&e[0]===71&&e[1]===73&&e[2]===70?"image/gif":e.length>=12&&e[0]===82&&e[1]===73&&e[2]===70&&e[3]===70&&e[8]===87&&e[9]===69&&e[10]===66&&e[11]===80?"image/webp":e.length>=2&&e[0]===66&&e[1]===77?"image/bmp":"image/png"}function ul(n){let e;try{e=Ti(n)}catch{return null}if(e.length>=24&&e[0]===137&&e[1]===80&&e[2]===78&&e[3]===71)return{width:Ln(e,16),height:Ln(e,20)};if(e.length>=10&&e[0]===71&&e[1]===73&&e[2]===70)return{width:Tt(e,6),height:Tt(e,8)};if(e.length>=26&&e[0]===66&&e[1]===77){const t=On(e,22);return{width:On(e,18),height:t>2147483647?4294967296-t:t}}if(e.length>=30&&e[0]===82&&e[1]===73&&e[2]===70&&e[3]===70&&e[8]===87&&e[9]===69&&e[10]===66&&e[11]===80){const t=String.fromCharCode(e[12],e[13],e[14],e[15]);if(t==="VP8X"&&e.length>=30)return{width:Dn(e,24)+1,height:Dn(e,27)+1};if(t==="VP8 "&&e.length>=30)return{width:Tt(e,26)&16383,height:Tt(e,28)&16383};if(t==="VP8L"&&e.length>=25){const i=e[21]|e[22]<<8|e[23]<<16|e[24]<<24;return{width:(i&16383)+1,height:(i>>>14&16383)+1}}return null}if(e.length>=4&&e[0]===255&&e[1]===216){let t=2;for(;t+3<e.length;){if(e[t]!==255){t+=1;continue}const i=e[t+1];if(i===216||i===217||i===1||i>=208&&i<=215){t+=2;continue}const a=he(e,t+2);if(a<2)break;if((i>=192&&i<=195||i>=197&&i<=199||i>=201&&i<=203||i>=205&&i<=207)&&t+8<e.length)return{width:he(e,t+7),height:he(e,t+5)};t+=2+a}}return null}async function gl(n,e,t,i={}){const a=hl(n,e,i),s=await t({url:a.url,method:"POST",headers:a.headers,payload:a.payload,contentType:"application/json",timeout:18e4});if(s.code!==0)throw new Error(`思源转发失败：${s.msg||`code ${s.code}`}`);if(s.status<200||s.status>=300)throw new Error(`图像 API HTTP ${s.status}：${String(s.body??"").slice(0,300)}`);let o;try{o=JSON.parse(s.body)}catch{throw new Error("图像 API 返回的不是 JSON")}const r=pl(o);let d,l;if(r.kind==="inline")d=r.base64,l=Pn(d);else{if(!/^https?:\/\//i.test(r.url))throw new Error("图像 API 返回的图片 URL 不是 http(s)");const h=await t({url:r.url,method:"GET",headers:{},payload:"",contentType:"application/octet-stream",timeout:12e4,responseEncoding:"base64"});if(h.code!==0)throw new Error(`图片下载失败：${h.msg||`code ${h.code}`}`);if(h.status<200||h.status>=300)throw new Error(`图片下载 HTTP ${h.status}`);if(d=Wt(h.body||""),!d)throw new Error("图片下载返回空内容");const p=cl(h.headers,"content-type").split(";")[0].trim().toLowerCase();l=/^image\//.test(p)?p:Pn(d)}const c=Math.floor(d.length*3/4);if(c>ol)throw new Error(`生成的图片过大（约 ${(c/1024/1024).toFixed(1)} MiB，上限 12 MiB）`);const u=ul(d);return{dataURL:`data:${l};base64,${d}`,mime:l,base64:d,width:u?.width&&u.width>0?u.width:1024,height:u?.height&&u.height>0?u.height:1024,...r.revisedPrompt?{revisedPrompt:r.revisedPrompt}:{}}}function ml(){return async n=>{const e={url:n.url,method:n.method||"POST",timeout:n.timeout??12e4,contentType:n.contentType||"application/json",headers:Object.entries(n.headers??{}).map(([o,r])=>({[o]:r})),payload:n.payload??""};n.responseEncoding&&(e.responseEncoding=n.responseEncoding);const t=await fetch("/api/network/forwardProxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}),i=await t.json().catch(()=>null);if(!i||typeof i!="object")throw new Error(`forwardProxy 返回异常（HTTP ${t.status}）`);const a=i.data&&typeof i.data=="object"?i.data:{},s=a.body;return{code:typeof i.code=="number"?i.code:-1,msg:typeof i.msg=="string"?i.msg:"",status:typeof a.status=="number"?a.status:0,headers:a.headers&&typeof a.headers=="object"?a.headers:{},body:typeof s=="string"?s:s!=null?JSON.stringify(s):""}}}const Bn="excali-studio",bl=8,yl=5,wl={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function B(n){return n.replace(/[&<>"']/g,e=>wl[e])}function q(n){return B(n)}class xl extends k.Plugin{constructor(){super(...arguments),this.tabs=new Map,this.settings={...O},this.recent=[],this.boardActions=new Map,this.activeCustom=null,this.dockRefresh=null,this.onloadRan=new Set,this.boardDocs=[],this.boardFiles=[],this.dirMigrated=!1,this.legacyBoards=[],this.ready=Promise.resolve(),this.boardSvgByDocId=new Map,this.libLoading=!1,this.autoOpenedDocs=new Set,this.checkupRunning=!1,this.embedClickHandler=null,this.lazyEngine=null,this.scriptPickerDialog=null,this.inputPromptChain=Promise.resolve(),this.selectOptionChain=Promise.resolve(),this.libCache=null}lazyMod(){return this.lazyEngine??=this.loadEngineModule(),this.lazyEngine}async loadEngineModule(){const e=new URL(`plugins/${Rt}/engine.js`,`${location.origin}/`).href,t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`HTTP ${t.status} ${e}`);const i=await t.text(),a={exports:{}};return window.eval(`(function anonymous(require, module, exports){
${i}
})
//# sourceURL=plugins/${Rt}/engine.js
`)(require,a,a.exports),a.exports}async onload(){Ri(this.i18n),this.ready=this.bootstrapState(),this.addIcons(Bi),this.registerStudioTab(),this.registerDock(),this.addTopBar({id:"excali-studio-open",icon:K,title:f("打开白板"),callback:()=>void this.openNew(),contextMenu:e=>this.buildTopMenu(e)}),this.protyleSlash.push({id:"excaliStudio",filter:["白板","画板","excali","excalidraw","whiteboard","bb","hb"],html:Ni(f("白板")),callback:e=>{this.clearSlashHint(e),this.openNew()}}),this.addCommand({langKey:"openExcaliStudio",langText:f("打开白板"),hotkey:"⌘⌥E",customHotkey:"",callback:()=>void this.openNew()}),Di(),lo(this),this.registerBlockIconMenu(),this.registerEmbedClick(),this.setupSetting(),this.registerAgentCapabilities(),await this.ready,this.registerBoardDocEvents(),this.refreshBoardLib(),Bo().then(async e=>{e>0&&k.showMessage(f("已安装 {n} 个内置脚本到 {dir}",{n:e,dir:F}),5e3);try{const t=await Fo(this.settings.builtinSnapshot),i=this.settings.builtinSnapshot;Object.keys(i).length===Object.keys(t.snapshot).length&&Object.keys(t.snapshot).every(o=>i[o]===t.snapshot[o])||(this.settings.builtinSnapshot=t.snapshot,this.persist()),t.updated.length>0&&k.showMessage(f("内置脚本已更新到最新版（{n} 个），你自建的脚本不受影响",{n:t.updated.length}),5e3)}catch(t){console.warn("[excali-studio] 内置脚本同步失败",t)}}).catch(e=>console.warn("[excali-studio] 内置脚本安装失败",e)),this.maybeShowChangelog()}onunload(){const e=[...this.tabs.values()];e.forEach(t=>t.tab.close()),this.tabs.clear(),this.embedClickHandler&&(document.removeEventListener("click",this.embedClickHandler,!0),this.embedClickHandler=null),e.length>0&&k.showMessage(f("插件已卸载，画板未保存的改动会丢失"),3e3)}async maybeShowChangelog(){try{const e=vo(await this.loadData(vn),Mt);if(e==="unknown-version"||e==="up-to-date"||(await this.saveData(vn,Mt),e!=="show"))return;const t=Mo(await Io(Eo(this.name)),Mt);if(!t)return;new k.Dialog({title:`${f("更新日志")} v${Mt}`,width:"min(640px, 92vw)",content:`<div class="exs-changelog b3-typography">${Co(t)}</div>`}).element.classList.add("exs-changelog-dialog")}catch(e){console.warn("[excali-studio] 更新日志读取失败",e)}}registerEmbedClick(){this.embedClickHandler=e=>{const t=e.target;if(!t||t.tagName!=="IMG")return;const i=t.getAttribute("src")||"";let a=i;try{a=new URL(i,location.origin).pathname}catch{}const s=/^\/(assets\/.+\.svg)$/i.exec(a);if(!s)return;const o=s[1];this.boardFiles.some(d=>D(d.dataPath)===o)&&(e.preventDefault(),e.stopPropagation(),this.openStudioTab(E(o)))},document.addEventListener("click",this.embedClickHandler,!0)}async bootstrapState(){try{await this.loadState()}catch(e){console.error("[excali-studio] 读取设置失败，用默认值继续",e)}try{await this.migrateLegacyBoards()}catch(e){console.error("[excali-studio] 旧白板迁移失败（下次启动重试）",e)}}async migrateLegacyBoards(){if(this.dirMigrated)return;const e=fi(this.settings.saveDir);if(e!==pt&&e!==st){this.dirMigrated=!0,this.persist();return}let t=[];try{t=(await ht(pt)).map(r=>r.path).filter(r=>io(T(r)))}catch(r){console.warn("[excali-studio] 迁移：读取旧保存目录失败（按近期/绑定继续）",r)}let i=[];try{i=await kn()}catch(r){console.warn("[excali-studio] 迁移：查询白板文档失败（按近期/命名继续）",r)}const a=oo({recent:this.recent,registry:this.legacyBoards,docSvgs:i.map(r=>r.svg),autoNamed:t}),s=new Map,o=[];for(const r of a)try{const d=await wn(r,await se(st,T(r)));s.set(r,E(d));try{await Sn(D(r),D(d))}catch(l){console.warn("[excali-studio] 迁移后更新正文资源引用失败",r,l)}}catch(d){console.warn("[excali-studio] 迁移白板失败",r,d),o.push(r)}if(e===pt&&await this.migrateLibraryFile(),s.size>0){this.recent=ro(this.recent,s);for(const r of i){const d=s.get(E(r.svg));if(d)try{await oe(r.id,{"custom-excali-svg":D(d)})}catch(l){console.warn("[excali-studio] 迁移后更新文档绑定失败",r.id,l)}}for(const r of this.tabs.values()){const d=s.get(E(r.data.dataPath??""));d&&(r.data.dataPath=d,r.tab.updateTitle(T(d)))}}this.settings={...this.settings,saveDir:st},this.dirMigrated=o.length===0,this.persist(),o.length>0?k.showMessage(f("白板迁移未完成：{fail} 块失败，下次启动会重试",{fail:o.length}),1e4,"error"):s.size>0&&k.showMessage(f("已把 {n} 块白板迁入 {dir}",{n:s.size,dir:st}),6e3)}async migrateLibraryFile(){const e=E(J(pt,"excali-library.json")),t=E(J(st,"excali-library.json"));try{await X(e)&&!await X(t)&&(await ot(t,await j(e)),await at(e))}catch(i){console.warn("[excali-studio] 迁移图库文件失败（忽略）",i)}}async remapBoardPath(e){const t=E(e),i=E(J(this.settings.saveDir,T(t)));return i===t?null:await X(i)?i:null}studioHost(){const e=this;return{load:t=>this.loadScene(t),remapPath:t=>this.remapBoardPath(t),restoreFromBackup:t=>this.restoreFromBackup(t),get accent(){return e.settings.accentStroke?Ha():null},onSave:(t,i)=>this.saveSvg(t,i),saveMedia:(t,i)=>this.saveBoardMedia(t,i),openDocLink:t=>this.openBoardDocLink(t),promptFileName:(t,i)=>this.promptFileName(t,i),onRename:(t,i)=>this.renameBoard(t,i),loadLibraryItems:()=>this.loadLibraryItems(),saveLibraryItems:t=>this.saveLibraryItems(t),get showWelcome(){return e.settings.showWelcome},get gridModeEnabled(){return e.settings.gridModeEnabled},onGridChange:t=>this.rememberGrid(t),onOpenExisting:()=>this.promptOpenPath(),onNewBoard:()=>void this.openNew(),onBoardActions:(t,i)=>{i?(this.boardActions.set(t,i),this.onloadRan.has(t)||(this.onloadRan.add(t),this.runOnloadScripts(t))):(this.boardActions.delete(t),this.onloadRan.delete(t)),!i&&this.activeCustom===t&&(this.activeCustom=null),this.dockRefresh?.()},onBoardActive:t=>{this.activeCustom=t},copyBoardRef:t=>e.copyBoardRefFor(t),onRunScript:()=>void this.openScriptPicker(),listPinnedScripts:()=>this.listPinnedScripts(),onRunScriptFile:(t,i)=>void this.runScriptFile(t,i),onPinScript:(t,i)=>this.rememberScriptPin(t,i),listPinnedActions:()=>this.settings.pinnedActions,onPinAction:(t,i)=>this.rememberActionPin(t,i),getAiChannels:()=>this.settings.aiChannels,onAiChannel:(t,i)=>this.setAiChannel(t,i),getPresentationSettings:()=>this.settings.presentation,onPresentationSetting:(t,i)=>this.rememberPresentationSetting(t,i),get scriptRailCollapsed(){return e.settings.scriptRailCollapsed},get scriptRailTop(){return e.settings.scriptRailTop},onScriptRailCollapsedChange:t=>this.rememberScriptRail("scriptRailCollapsed",t),onScriptRailTopChange:t=>this.rememberScriptRail("scriptRailTop",t),get highlighter(){return e.settings.highlighter},onHighlighterChange:t=>this.rememberHighlighter(t),onHelp:()=>this.openHelp(),getLibraryImportUrl:()=>e.libraryImportUrl(),get libDirAbs(){return Oi(Pi(),e.libDirRel())},get boardDir(){return e.settings.saveDir},pickBoardPath:()=>this.pickBoardRef()}}registerStudioTab(){const e=this,t=this.studioHost();this.addTab({type:yn,init:i=>{const a=i.element;a.classList.add("exs-panel"),a.innerHTML=`<div class="exs-loading">${f("正在打开白板…")}</div>`,this.lazyMod().then(s=>{a.innerHTML="",this.tabs.set(i,s.attachStudioTab(i,t))}).catch(s=>{console.error("[excali-studio] 画板引擎加载失败",s),a.innerHTML=`<div class="exs-loaderror"><div>${f("画板引擎加载失败：{msg}",{msg:s instanceof Error?s.message:String(s)})}</div></div>`})},destroy:function(){e.tabs.get(this)?.dispose(),e.tabs.delete(this),e.boardActions.delete(this),e.activeCustom===this&&(e.activeCustom=null),e.dockRefresh?.()}})}eaHost(){const e=this;return{getDocMarkdown:async()=>{const t=bi()?.block?.rootID;if(!t)return"";const s=(await(await fetch("/api/block/getBlockKramdown",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:t})})).json().catch(()=>null))?.data;return typeof s=="string"?s:s&&typeof s=="object"&&typeof s.kramdown=="string"?s.kramdown:""},getSelectedText:()=>{const t=window.getSelection();return t?String(t.toString()??""):""},listFiles:async t=>{try{return await ae(t||e.settings.saveDir)}catch{return[]}},readFileAsDataURL:async t=>{const i=await fetch("/api/file/getFile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:E(t)})});if(!i.ok)throw new Error(`getFile HTTP ${i.status}`);const a=await i.blob();return new Promise((s,o)=>{const r=new FileReader;r.onload=()=>s(String(r.result||"")),r.onerror=()=>o(r.error||new Error("读取失败")),r.readAsDataURL(a)})},save:()=>void e.activeActions()?.flush(),notify:t=>k.showMessage(t),getSettings:()=>({saveDir:e.settings.saveDir}),getScriptSetting:(t,i)=>{const a=(ft[t]??[]).find(o=>o.key===i);if(!a)return;const s=e.settings.scriptSettings?.[t]?.[i];return s===void 0||typeof s!=typeof a.default||a.type==="number"&&typeof s=="number"&&(!Number.isFinite(s)||a.min!==void 0&&s<a.min||a.max!==void 0&&s>a.max)||a.type==="select"&&typeof s=="string"&&a.options&&!a.options.some(o=>o.value===s)?a.default:s},setScriptSetting:(t,i,a)=>{if(!(ft[t]??[]).find(r=>r.key===i))return;const o=e.settings.scriptSettings??{};e.settings={...e.settings,scriptSettings:{...o,[t]:{...o[t]??{},[i]:a}}},e.persist()},getHighlighter:()=>Bt(e.settings.highlighter),siyuanCall:async(t,i)=>{if(!/^(block\/(getBlockKramdown|getBlockDOM|getBlockInfo|getBlockAttrs|getBlockBreadcrumb|getChildBlocks)|export\/exportMdContent|filetree\/(getDoc|getHPathByID|getHPathByPath)|query\/sql|file\/getFile)$/.test(t))throw new Error(`只读白名单外的接口不可调用：${t}`);const s=await fetch(`/api/${t}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i??{})}),o=await s.json().catch(()=>null);if(!s.ok||!o||o.code!==0)throw new Error(`内核 API 失败：${t} ${o?.msg||`HTTP ${s.status}`}`);return o.data},inputPrompt:(t,i,a)=>{const s=()=>new Promise(r=>{let d=!1;const l=p=>{d||(d=!0,c.destroy(),r(p))},c=new k.Dialog({title:t,width:"340px",content:`<div class="exs-picker">
  <input class="b3-text-field fn__block exs-name-input" type="${i==="number"?"number":i==="password"?"password":"text"}" value="${q(a)}" />
  <div class="exs-name-actions">
    <button class="b3-button exs-name-cancel" type="button">${f("取消")}</button>
    <button class="b3-button exs-name-ok" type="button">${f("确定")}</button>
  </div>
</div>`,destroyCallback:()=>l(null)});c.element.classList.add("exs-name-dialog");const u=c.element.querySelector(".exs-name-input");c.element.querySelector(".exs-name-cancel").addEventListener("click",()=>l(null));const h=()=>l(u.value);c.element.querySelector(".exs-name-ok").addEventListener("click",h),u.addEventListener("keydown",p=>{p.key==="Enter"?(p.preventDefault(),h()):p.key==="Escape"&&(p.preventDefault(),l(null)),p.stopPropagation()}),setTimeout(()=>{u.focus(),u.select()},50)}),o=this.inputPromptChain.then(s,s);return this.inputPromptChain=o.catch(()=>null),o},selectOption:t=>{const i=()=>new Promise(s=>{if(t.options.length===0){s(null);return}let o=!1;const r=new k.Menu("excali-select-option",()=>{o||s(null)});for(const l of t.options)r.addItem({label:l.hint?`${l.label}（${l.hint}）`:l.label,current:l.value===t.current,click:()=>{o=!0,s(l.value)}});const d=t.at??{x:window.innerWidth/2,y:window.innerHeight/3};r.open({x:d.x,y:d.y})}),a=this.selectOptionChain.then(i,i);return this.selectOptionChain=a.catch(()=>null),a}}}async agentRun(e){try{return await e()}catch(t){return console.warn("[excali-studio] 智能体能力失败",t),{error:t instanceof Error?t.message:String(t)}}}agentBoardDir(){return D(E(this.settings.saveDir)).replace(/\/+$/,"")}async resolveAgentBoard(e){const t=typeof e.board=="string"?e.board.trim():"",i=typeof e.path=="string"&&e.path.trim()?e.path.trim():/\.svg$/i.test(t)?t:"",a=typeof e.title=="string"&&e.title.trim()?e.title.trim():/\.svg$/i.test(t)?"":t;await this.ready;const s=this.agentBoardDir();if(i){const u=D(E(i));return!/\.svg$/i.test(u)||s!==""&&!u.startsWith(`${s}/`)||!await X(u)?null:{path:E(u),title:T(u).replace(/\.svg$/i,"")}}if(!a)return null;const o=await ht(this.settings.saveDir),r=a.replace(/\.svg$/i,"").toLowerCase(),d=o.filter(u=>T(u.path).replace(/\.svg$/i,"").toLowerCase()===r);if(d.length===0)return null;const c=d.find(u=>T(u.path).replace(/\.svg$/i,"")===a.replace(/\.svg$/i,""))??d[0];return{path:E(c.path),title:T(c.path).replace(/\.svg$/i,"")}}async waitForAgentActions(e,t=2e4){const i=E(e),a=Date.now()+t;for(;Date.now()<a;){for(const[s,o]of this.tabs){if(o.data.dataPath!==i)continue;const r=this.boardActions.get(s);if(r?.getEaHandle())return r}await new Promise(s=>setTimeout(s,120))}return null}agentDrawOrigin(e){const t=e.getElements().filter(a=>!a.isDeleted);if(t.length===0)return{x:0,y:0};const i=Ht(t);return i?{x:i.minX,y:i.maxY+80}:{x:0,y:0}}loadAgentStyles(){return sl({list:async()=>(await ae(Se,/\.json$/i)).map(e=>e.slice(e.lastIndexOf("/")+1)),read:e=>j(`${Se}/${e}`)})}async agentListBoards(e){await this.ready;const t=typeof e.query=="string"?e.query.trim().toLowerCase():"",i=Number(e.limit),a=Number.isFinite(i)?Math.max(1,Math.min(100,Math.floor(i))):50,s=await ht(this.settings.saveDir),o=t?s.filter(c=>c.path.toLowerCase().includes(t)||T(c.path).toLowerCase().includes(t)):s,r=o.slice(0,a).map(c=>({title:T(c.path).replace(/\.svg$/i,""),path:c.path,updated:c.updated,updatedAt:c.updated?new Date(c.updated).toISOString():""})),d=await this.loadAgentStyles(),l=al();return{result:`白板库 ${this.agentBoardDir()}：${o.length} 块${t?`（匹配「${t}」）`:""}。可用风格：${l.map(c=>c.name).join("/")}。`,structuredContent:{dir:this.agentBoardDir(),total:o.length,boards:r,styles:l,styleWarnings:d.warnings}}}async agentOpenBoard(e){const t=await this.resolveAgentBoard(e);if(!t)return{error:`找不到白板：${String(e.board??e.path??"")}（只认 ${this.agentBoardDir()} 下的 .svg）`};await this.openStudioTab(t.path);const i=await this.waitForAgentActions(t.path,15e3);return{result:`已打开「${t.title}」${i?"":"（画布引擎仍在加载）"}。`,structuredContent:{ok:!0,path:D(t.path),title:t.title,ready:!!i}}}async agentDrawBoard(e){await this.ready;let t=e.plan;if(typeof t=="string")try{t=JSON.parse(t)}catch{return{error:"plan 是字符串但不是合法 JSON"}}if(!t||typeof t!="object"||Array.isArray(t))return{error:"缺少 plan 对象（nodes/edges/title/preset/layout）"};const i=e.append!==!1,a=[e.board,e.path].some(x=>typeof x=="string"&&x.trim()!==""),s=i?await this.resolveAgentBoard(e):null;if(i&&a&&!s)return{error:`找不到白板：${String(e.board??e.path)}（不自动改新建，避免画错板）`};let o,r,d=!1;if(s)o=s;else{const x=t.title,w=typeof e.title=="string"&&e.title.trim()||typeof x=="string"&&x.trim()||f("AI 白板"),y=await this.createBoardFile(w);r=y.docId,o={path:y.path,title:T(y.path).replace(/\.svg$/i,"")},d=!0}await this.openStudioTab(o.path,r);const l=await this.waitForAgentActions(o.path),c=l?.getEaHandle();if(!l||!c)return{error:`白板「${o.title}」已打开，但画布引擎未在 20 秒内就绪。请手动打开后重试。`};const u=d?{x:0,y:0}:this.agentDrawOrigin(c),h=await this.loadAgentStyles(),p=[e.style,e.preset].find(x=>typeof x=="string"&&x.trim()!==""),b=Nr(t,{origin:u,idPrefix:xe("ai"),preset:p,layout:e.layout});c.addElements(b.specs);let _=0;for(const x of b.routes){const w=c.connectObjects(x.fromElementId,x.side1,x.toElementId,x.side2,4);w&&(_+=1,c.patchElements([w],{x:x.p1.x,y:x.p1.y,points:x.points,strokeColor:b.preset.edge,strokeWidth:b.preset.strokeWidth,strokeStyle:b.preset.strokeStyle,roughness:b.preset.roughness}))}c.selectElements(b.nodes.map(x=>x.elementId)),c.scrollToContent();let g=!1;try{g=await l.flush()}catch{g=!1}const m={ok:!0,created:d,path:D(o.path),title:o.title,nodes:b.nodes.length,edges:_,preset:b.plan.preset,layout:b.plan.layout,styleWarnings:h.warnings,saved:g,origin:u,warnings:b.plan.warnings};return{result:`${d?"已新建":"已绘制到"}「${o.title}」：${m.nodes} 个节点、${m.edges} 条连线（${m.path}）${g?"。":"；落盘失败，稍后自动保存会重试。"}`+(m.warnings.length?` 忽略 ${m.warnings.length} 条计划警告。`:""),structuredContent:m}}async agentGenerateImage(e){await this.ready;const t=typeof e.prompt=="string"?e.prompt.trim():"";if(!t)return{error:"prompt 不能为空"};const i=e.append!==!1,a=[e.board,e.path].some(w=>typeof w=="string"&&w.trim()!==""),s=i?await this.resolveAgentBoard(e):null;if(i&&a&&!s)return{error:`找不到白板：${String(e.board??e.path)}（不自动改新建，避免插错板）`};let o;try{o=await gl({baseUrl:this.settings.imageBaseUrl,model:this.settings.imageModel,apiKey:this.settings.imageApiKey,size:this.settings.imageSize},t,ml(),{size:typeof e.size=="string"&&e.size.trim()?e.size.trim():void 0})}catch(w){return{error:w instanceof Error?w.message:String(w)}}let r,d,l=!1;if(s)r=s;else{const w=typeof e.title=="string"&&e.title.trim()||f("AI 图片"),y=await this.createBoardFile(w);d=y.docId,r={path:y.path,title:T(y.path).replace(/\.svg$/i,"")},l=!0}await this.openStudioTab(r.path,d);const c=await this.waitForAgentActions(r.path),u=c?.getEaHandle();if(!c||!u)return{error:`图片已生成，但白板「${r.title}」的画布未在 20 秒内就绪，未插入。请手动打开后重试（会重新生成一张图）。`};const h=l?{x:0,y:0}:this.agentDrawOrigin(u),p=this.agentImageDimension(e.width)??o.width,b=this.agentImageDimension(e.height)??o.height;let _="";try{_=await u.addImage(o.dataURL,{...h,width:p,height:b})}catch(w){return{error:`图片已生成，但插入画布失败：${w instanceof Error?w.message:String(w)}`}}u.selectElements([_]),u.scrollToElement(_);let g=!1;try{g=await c.flush()}catch{g=!1}const m=Math.floor(o.base64.length*3/4),x={ok:!0,created:l,path:D(r.path),title:r.title,imageId:_,width:p,height:b,mime:o.mime,bytes:m,revisedPrompt:o.revisedPrompt??"",saved:g,origin:h};return{result:`${l?"已新建并插入":"已插入"}图片到「${r.title}」：${p}×${b}（${x.path}）${g?"。":"；落盘失败，稍后自动保存会重试。"}`+(o.revisedPrompt?` 模型改写：${o.revisedPrompt}`:""),structuredContent:x}}agentImageDimension(e){if(e==null||e==="")return;const t=Number(e);if(Number.isFinite(t))return Math.max(64,Math.min(4096,Math.round(t)))}registerAgentCapabilities(){if(typeof this.addAgentCapability=="function"&&this.settings.aiChannels.agent)try{this.addAgentCapability({name:"excali_list_boards",title:f("列出 Excali 白板"),description:f("列出白板库里的白板（标题、路径、更新时间），可按 query 过滤。只读。"),inputSchema:{type:"object",properties:{query:{type:"string",description:f("按标题/路径过滤（不区分大小写）")},limit:{type:"number",minimum:1,maximum:100,description:f("最多返回条数，默认 50")}}},effects:{localRead:!0},handler:e=>this.agentRun(()=>this.agentListBoards(e))}),this.addAgentCapability({name:"excali_open_board",title:f("打开 Excali 白板"),description:f("打开指定白板并等待画布就绪；board 传标题，path 传保存目录下的路径。"),inputSchema:{type:"object",properties:{board:{type:"string",description:f("白板标题（不含 .svg）")},path:{type:"string",description:f("白板路径，如 assets/excali/foo.svg")}}},effects:{localRead:!0},handler:e=>this.agentRun(()=>this.agentOpenBoard(e))}),this.addAgentCapability({name:"excali_draw_board",title:f("用 AI 计划绘制 Excali 白板"),description:f("把结构化计划（nodes/edges）画成白板：board 为空则新建，有值则追加到已有白板；自动布局、配色并保存。"),inputSchema:{type:"object",properties:{plan:{type:"object",description:f("绘图计划：{ title, caption, preset, layout, nodes: [{id,label,shape,group}], edges: [{from,to,label}] }"),properties:{title:{type:"string"},caption:{type:"string"},preset:{type:"string",description:f("pencil/marker/blueprint 或 data/assets/excali-styles 里的风格包名")},layout:{type:"string",enum:["lr","tb","grid","radial"]},nodes:{type:"array",items:{type:["string","object"]}},edges:{type:"array",items:{type:["string","object","array"]}}},required:["nodes"]},board:{type:"string",description:f("追加到已有白板的标题或路径；省略则新建")},title:{type:"string",description:f("新建白板的文件名；省略用计划标题或「AI 白板」")},append:{type:"boolean",description:f("board 指向已有白板时是否追加，默认 true")},style:{type:"string",description:f("风格包名：内置预设，或 assets/excali-styles 目录里的 json 包；与 preset 同义，优先 style")},preset:{type:"string",description:f("覆盖计划内的风格")},layout:{type:"string",enum:["lr","tb","grid","radial"],description:f("覆盖计划内的布局")}},required:["plan"]},effects:{localRead:!0,localWrite:!0},handler:e=>this.agentRun(()=>this.agentDrawBoard(e))}),this.addAgentCapability({name:"excali_generate_image",title:f("生成图片并插入 Excali 白板"),description:f("调用设置里的 OpenAI 兼容图像 API 生成一张位图，插入已有白板或新建白板；图片不可编辑。需要先在插件设置里填 API 地址和 Key。"),inputSchema:{type:"object",properties:{prompt:{type:"string",description:f("画面描述（主体、风格、构图；上限 4000 字符）")},board:{type:"string",description:f("插入到已有白板的标题或路径；省略则新建")},title:{type:"string",description:f("新白板文件名；省略用「AI 图片」")},append:{type:"boolean",description:f("board 指向已有白板时是否插入到该板，默认 true")},width:{type:"number",minimum:64,maximum:4096,description:f("图像显示宽度；省略按原图尺寸")},height:{type:"number",minimum:64,maximum:4096,description:f("图像显示高度；省略按原图尺寸")},size:{type:"string",description:f("尺寸覆盖（如 1024x1024）；省略用设置里的值")}},required:["prompt"]},effects:{localRead:!0,localWrite:!0},handler:e=>this.agentRun(()=>this.agentGenerateImage(e))})}catch(e){console.warn("[excali-studio] 注册智能体能力失败（思源版本可能不支持）",e)}}openScriptPicker(){if(!this.settings.aiChannels.script){k.showMessage(f("脚本通道已在「AI 通道」面板里关闭"));return}this.scriptPickerDialog||(async()=>{const e=await Ct();if(e.length===0){k.showMessage(f("还没有脚本：首次启用会自动安装内置脚本到 {dir}",{dir:F}),7e3);return}const t=new Set(this.settings.pinnedScripts),i=g=>Ea[g]??gn,a=g=>`<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${g}"/></svg>`,s=g=>{const m=ft[g.name];return!m||m.length===0?"":`<div class="exs-script-settings" data-settings hidden>${m.map(w=>{const y=this.eaHost().getScriptSetting(g.name,w.key),v=y===void 0?w.default:y,A=q(w.key),S=w.type==="select"?`<select class="b3-select" data-key="${A}">${(w.options??[]).map($=>`<option value="${q($.value)}"${String($.value)===String(v)?" selected":""}>${B($.label)}</option>`).join("")}</select>`:w.type==="toggle"?`<input class="b3-switch" type="checkbox" data-key="${A}"${v?" checked":""} />`:`<input class="b3-text-field" type="number" data-key="${A}" value="${q(String(v))}"${w.min!==void 0?` min="${w.min}"`:""}${w.max!==void 0?` max="${w.max}"`:""} />`;return`<div class="exs-script-settings__field"><label>${B(w.label)}</label>${S}</div>`}).join("")}<div class="exs-script-settings__tip">${f("保存即生效；脚本运行时弹窗会用它预填，仍可临时改一次。")}</div></div>`},o=`<div class="exs-picker__hint"><b>${f("脚本使用说明")}</b>${f("点一条立即对当前画布执行；先框选画布元素再跑 = 对选中操作（对齐、连线、标注类）；先打开文档页签再跑 = 读文档内容（思维导图、表格类）。行尾按钮可固定到画布右缘侧边栏 / 改脚本设置（也可右键一条固定）。脚本就是 {dir} 下的 Markdown，可直接编辑，文件头加 @excalidraw-onload 则画布打开时自动运行。",{dir:F})}</div>`,r=new Set(this.settings.pinnedActions),d=(g,m)=>g?{do:f("固定到右上角"),done:f("已固定在右上角")}:{do:f("固定到侧边栏"),done:f("已固定到侧边栏")},l=g=>{const m=r.has(g.id),x=d(ee(g)==="top-right");return`<div class="b3-list-item exs-script-item${m?" exs-script-item--pinned":""}" data-rail-action="${q(g.id)}" title="${q(g.id)}"><div class="exs-script-item__head"><span class="b3-list-item__text"><span class="exs-script-item__icon">${a(g.icon)}</span>${B(f(g.title))}${m?` <span class="exs-script-pin" title="${x.done}"></span>`:""}</span><span class="exs-script-item__actions"><button type="button" class="b3-button b3-button--text${m?" exs-script-item__btn--on":""}" data-act="pin" title="${m?x.done:x.do}">${a(mn)}</button></span></div><span class="exs-script-desc">${B(f(g.desc))}</span></div>`},c=_e.map(l).join(""),u=e.map((g,m)=>{const x=ft[g.name]??[],w=t.has(g.name);return`<div class="b3-list-item exs-script-item${w?" exs-script-item--pinned":""}" data-idx="${m}" title="${B(g.name)}"><div class="exs-script-item__head"><span class="b3-list-item__text"><span class="exs-script-item__icon">${a(i(g.name))}</span>${B(g.title)}${g.onload?` <span class="exs-script-badge">${f("打开时自动运行")}</span>`:""}${w?` <span class="exs-script-pin" title="${f("已固定到侧边栏")}"></span>`:""}</span><span class="exs-script-item__actions">${x.length>0?`<button type="button" class="b3-button b3-button--text" data-act="gear" title="${f("脚本设置")}">${a(gn)}</button>`:""}<button type="button" class="b3-button b3-button--text${w?" exs-script-item__btn--on":""}" data-act="pin" title="${f(w?"已固定到侧边栏":"固定到侧边栏")}">${a(mn)}</button></span></div>${g.description?`<span class="exs-script-desc">${B(g.description)}</span>`:`<span class="b3-list-item__meta">${B(g.name)}</span>`}${s(g)}</div>`}).join(""),h=await ki(),p=h.length>0?`<div class="exs-picker__outdated"><span>${f("{n} 个内置脚本有新版本",{n:h.length})}${f("旧版内置脚本行为可能和插件不一致，重置会覆盖你在这些脚本里的修改（自建脚本不受影响）。")}</span><button type="button" class="b3-button b3-button--text" data-act="reset">${f("重置为最新版")}</button></div>`:"",b=new k.Dialog({title:f("拓展功能"),width:"520px",content:`<div class="exs-picker">${p}${c}${o}<div class="exs-picker__group">${f("脚本库")}</div><div class="b3-list b3-list--background exs-board-list">${u}</div></div>`,destroyCallback:()=>{this.scriptPickerDialog===b&&(this.scriptPickerDialog=null),window.dispatchEvent(new CustomEvent(te,{detail:{pickerOpen:!1}}))}});b.element.classList.add("exs-picker-dialog"),this.scriptPickerDialog=b,window.dispatchEvent(new CustomEvent(te,{detail:{pickerOpen:!0}}));const _=(g,m,x=!1)=>{const w=d(x);g.classList.toggle("exs-script-item--pinned",m);const y=g.querySelector('[data-act="pin"]');y&&(y.classList.toggle("exs-script-item__btn--on",m),y.title=m?w.done:w.do);const v=g.querySelector(".exs-script-pin");if(m&&!v){const A=document.createElement("span");A.className="exs-script-pin",A.title=w.done,g.querySelector(".b3-list-item__text")?.appendChild(A)}else!m&&v&&v.remove()};b.element.addEventListener("click",g=>{if(g.target?.closest?.('[data-act="reset"]')){(async()=>{const A=await No();k.showMessage(f("已重置 {n} 个内置脚本",{n:A}),3e3),b.destroy(),this.openScriptPicker()})();return}const m=g.target?.closest?.("[data-rail-action]");if(m){const A=m.dataset.railAction??"";if(!be(A))return;if(g.target?.closest?.('[data-act="pin"]')){const S=ee(bn(A))==="top-right",$=this.settings.pinnedActions.includes(A);this.rememberActionPin(A,!$),_(m,!$,S);return}b.destroy(),this.runRailAction(A);return}const x=g.target?.closest?.(".exs-script-item"),w=x?.dataset?.idx;if(!x||w===void 0)return;const y=e[Number(w)];if(!y)return;const v=g.target?.closest?.("[data-act]");if(v){if(v.dataset.act==="pin"){const A=this.settings.pinnedScripts.includes(y.name);this.rememberScriptPin(y.name,!A),_(x,!A)}else if(v.dataset.act==="gear"){const A=x.querySelector(".exs-script-settings");if(A){const S=A.hasAttribute("hidden");b.element.querySelectorAll(".exs-script-settings").forEach($=>{$!==A&&$.setAttribute("hidden","")}),b.element.querySelectorAll('[data-act="gear"]').forEach($=>{$!==v&&$.classList.remove("exs-script-item__btn--on")}),S?A.removeAttribute("hidden"):A.setAttribute("hidden",""),v.classList.toggle("exs-script-item__btn--on",S)}}return}g.target?.closest?.(".exs-script-settings")||(b.destroy(),this.runScriptOnActiveBoard(y,{shift:g.shiftKey,at:{x:g.clientX,y:g.clientY}}))}),b.element.addEventListener("change",g=>{const m=g.target,x=m?.closest?.(".exs-script-settings");if(!x||!m?.dataset?.key)return;const y=x.closest(".exs-script-item")?.dataset?.idx;if(y===void 0)return;const v=e[Number(y)];if(!v)return;const A=m.dataset.key,S=(ft[v.name]??[]).find(C=>C.key===A);if(!S)return;const $=S.type==="number"?Math.max(S.min??0,Math.min(S.max??Number.MAX_SAFE_INTEGER,Number(m.value)||0)):S.type==="toggle"?m.checked:m.value;this.eaHost().setScriptSetting(v.name,A,$),k.showMessage(f("已保存：{name} › {label}",{name:v.title,label:S.label}),3e3)}),b.element.addEventListener("contextmenu",g=>{const m=g.target?.closest?.("[data-rail-action]");if(m){const S=m.dataset.railAction??"";if(!be(S))return;g.preventDefault();const $=ee(bn(S))==="top-right",C=this.settings.pinnedActions.includes(S),I=d($),M=new k.Menu;M.addItem({label:C?I.done:I.do,click:()=>{this.rememberActionPin(S,!C),_(m,!C,$)}}),M.open({x:g.clientX,y:g.clientY});return}const x=g.target?.closest?.(".exs-script-item"),w=x?.dataset?.idx;if(!x||w===void 0)return;const y=e[Number(w)];if(!y)return;g.preventDefault();const v=this.settings.pinnedScripts.includes(y.name),A=new k.Menu;A.addItem({label:f(v?"从侧边栏取消固定":"固定到侧边栏"),click:()=>{this.rememberScriptPin(y.name,!v),_(x,!v)}}),A.open({x:g.clientX,y:g.clientY})})})()}async listPinnedScripts(){if(this.settings.pinnedScripts.length===0)return[];let e=[];try{e=await Ct()}catch{return[]}return this.settings.pinnedScripts.map(t=>e.find(i=>i.name===t)).filter(t=>!!t).map(t=>({name:t.name,title:t.title}))}async runScriptFile(e,t){let i=[];try{i=await Ct()}catch{i=[]}const a=i.find(s=>s.name===e);if(!a){k.showMessage(f("找不到脚本：{name}",{name:e}),7e3,"error");return}await this.runScriptOnActiveBoard(a,t)}rememberScriptPin(e,t){const i=this.settings.pinnedScripts,a=t?i.includes(e)?i:[...i,e]:i.filter(s=>s!==e);a.length===i.length&&a.every((s,o)=>s===i[o])||(this.settings={...this.settings,pinnedScripts:a},this.persist(),window.dispatchEvent(new CustomEvent(pn)))}rememberActionPin(e,t){const i=this.settings.pinnedActions,a=t?i.includes(e)?i:[...i,e]:i.filter(s=>s!==e);a.length===i.length&&a.every((s,o)=>s===i[o])||(this.settings={...this.settings,pinnedActions:a},this.persist(),window.dispatchEvent(new CustomEvent(pn)))}setAiChannel(e,t){this.settings.aiChannels[e]!==t&&(this.settings={...this.settings,aiChannels:{...this.settings.aiChannels,[e]:t}},this.persist(),e==="agent"&&k.showMessage(f(t?"内置智能体通道已开启：重载思源后注册生效":"内置智能体通道已关闭：重载思源后彻底摘除"),6e3))}async runRailAction(e){if(e===ri){const a=this.activeActions();if(!a){k.showMessage(f("先打开一块白板，再改外框颜色"));return}a.openOutlinePalette();return}if(e===li){const a=this.activeActions();if(!a){k.showMessage(f("先打开一块白板，再转换图片"));return}a.openImageToMaterial();return}if(e===ci){const a=this.activeActions();if(!a){k.showMessage(f("先打开一块白板，再放映"));return}a.openPresentation();return}if(e!==Ee)return;const t=this.activeActions();if(!t){k.showMessage(f("先打开一块白板，再往里插卡片"));return}const i=await this.pickBoardRef();i&&t.insertBoardCard(i,T(i).replace(/\.svg$/i,""))}rememberScriptRail(e,t){this.settings[e]!==t&&(this.settings={...this.settings,[e]:t},this.persist(),window.dispatchEvent(new CustomEvent(te,{detail:{[e]:t}})))}rememberHighlighter(e){const t=Bt(e),i=this.settings.highlighter;i.color===t.color&&i.width===t.width&&i.opacity===t.opacity||(this.settings={...this.settings,highlighter:t},this.persist(),window.dispatchEvent(new CustomEvent(pa,{detail:t})))}rememberPresentationSetting(e,t){const i=ui({...this.settings.presentation,[e]:t});this.settings.presentation[e]!==i[e]&&(this.settings={...this.settings,presentation:i},this.persist())}async runScriptOnActiveBoard(e,t){if(!this.settings.aiChannels.script){k.showMessage(f("脚本通道已在「AI 通道」面板里关闭"));return}const a=this.activeActions()?.getEaHandle()??null;if(!a){k.showMessage(f("没有可运行脚本的白板：请先打开一张"));return}let s;try{s=await we(e.path)}catch(d){k.showMessage(f("读取脚本失败：{msg}",{msg:d instanceof Error?d.message:String(d)}),7e3,"error");return}const o=In(a,this.eaHost(),e.name,t),r=await En(s.code,o,o.utils);r.logs.length>0&&console.log(`[excali-studio][脚本] ${e.title}
${r.logs.join(`
`)}`),r.ok?k.showMessage(f("脚本「{title}」运行成功（{ms}ms）",{title:e.title,ms:r.durationMs})):k.showMessage(f("脚本「{title}」运行失败：{msg}",{title:e.title,msg:(r.error||"").split(`
`)[0]}),1e4,"error")}async runOnloadScripts(e){let t=[];try{t=(await Ct()).filter(i=>i.onload)}catch{return}for(const i of t){const s=this.boardActions.get(e)?.getEaHandle()??null;if(s)try{const o=await we(i.path),r=In(s,this.eaHost(),i.name),d=await En(o.code,r,r.utils);d.logs.length>0&&console.log(`[excali-studio][onload 脚本] ${i.title}
${d.logs.join(`
`)}`),d.ok||console.warn(`[excali-studio][onload 脚本失败] ${i.title}: ${(d.error||"").split(`
`)[0]}`)}catch(o){console.warn("[excali-studio][onload 脚本异常]",i.title,o)}}}activeActions(){return this.activeCustom?this.boardActions.get(this.activeCustom)??null:null}registerDock(){const e=this,t={openNew:()=>void this.openNew(),deleteActiveBoard:()=>e.deleteActiveBoard(),getBoardFiles:()=>{const i=new Set;for(const a of e.tabs.values())typeof a.data.dataPath=="string"&&i.add(a.data.dataPath);return{files:e.boardFiles,opened:i}},refreshBoardLib:()=>void e.refreshBoardLib(),openBoardFile:i=>void e.openStudioTab(i.dataPath,i.docId||void 0),openDocOf:i=>e.openDocumentById(i),renameBoardFile:i=>void e.renameFromDock(i),deleteBoardFile:i=>void e.deleteBoardFile(i),openFileMenu:(i,a,s)=>e.openFileMenu(i,a,s),hasActiveBoard:()=>e.activeCustom!==null&&e.tabs.has(e.activeCustom),onRefresh:i=>{this.dockRefresh=i}};this.addDock({id:this.name+"-dock",type:"excali_studio_dock",config:{position:"LeftBottom",size:{width:300,height:0},icon:K,title:f("Excali 白板")},data:{name:this.name},init:i=>{const a=ko(t),s=i.element;s.innerHTML="",s.appendChild(a.element),this.dockRefresh=a.refresh,a.refresh()},destroy:()=>{this.dockRefresh=null}})}openHelp(){const t=[["⌘⌥E",f("新建白板")],["⌘S",f("保存（已有文件静默覆盖）")],["⌘⇧E",f("导出图片…")],[f("空格 + 拖动"),f("平移画布")],[f("滚轮"),f("缩放画布")],[f("画布右键菜单"),f("只读 / 禅模式 / 网格 / 统计")]].map(([i,a])=>`<div class="exs-help__row"><span class="exs-help__key">${B(i)}</span><span>${B(a)}</span></div>`).join("");new k.Dialog({title:f("帮助"),width:"420px",content:`<div class="exs-help">${t}</div>`,destroyCallback:()=>{}})}async openStudioTab(e,t){const i=e?E(e):null;if(i){const o=[...this.tabs.values()].find(r=>r.data.dataPath===i);if(o){o.tab.parent.switchTab(o.tab.headElement);return}}if(Da()){this.openMobileStudio(i,t);return}const a=new Set(this.tabs.values());await k.openTab({app:this.app,openNewTab:!0,custom:{id:this.name+yn,icon:K,title:i?T(i):f("未命名白板"),data:{dataPath:i,docId:t}}});const s=[...this.tabs.values()].find(o=>!a.has(o));s&&s.tab.parent.switchTab(s.tab.headElement)}openMobileStudio(e,t){const i={dataPath:e,docId:t},a={custom:null},s=Oa({data:i,onDispose:()=>{const d=a.custom;d&&(this.tabs.delete(d),this.boardActions.delete(d),this.onloadRan.delete(d),this.activeCustom===d&&(this.activeCustom=null),this.dockRefresh?.())}}),o=s.custom;a.custom=o;const r={tab:o.tab,data:i,requestClose:()=>s.close(),closeForDelete:()=>s.close(),dispose:()=>{}};this.tabs.set(o,r),this.dockRefresh?.(),this.lazyMod().then(d=>{if(s.isClosed())return;s.body.replaceChildren();const l=d.attachStudioTab(o,this.studioHost());if(s.isClosed()){l.dispose();return}this.tabs.set(o,l),s.mount(l),this.dockRefresh?.()}).catch(d=>{s.isClosed()||(console.error("[excali-studio] 画板引擎加载失败",d),s.showError(f("画板引擎加载失败：{msg}",{msg:d instanceof Error?d.message:String(d)})))})}async loadScene(e){if(!e)return null;await this.ready;const t=await j(e),{decodeSvgScene:i}=await this.lazyMod(),a=await i(t,s=>this.hydrateSceneFiles(s));return this.rememberRecent(e),a}async hydrateSceneFiles(e){const t={};for(const[i,a]of Object.entries(e)){const s=a??{};if(typeof s.dataURL=="string"&&s.dataURL!==""){t[i]=a;continue}if(typeof s.path!="string"||s.path===""){t[i]=a;continue}try{const o=await La(s.path),r=typeof s.mimeType=="string"&&s.mimeType!==""?s.mimeType:"image/png";t[i]={...s,dataURL:ja(o,r)}}catch(o){console.warn("[excali-studio] 白板图片读回失败（该图会显示为空框）",s.path,o),t[i]=a}}return t}async saveBoardMedia(e,t){const i=Ba(e);if(!i)throw new Error(f("无法解析图片数据"));const a=await Fa(i.bytes,i.mime||t),s=`${Pa}/${a}`;return await Ra(s,i.bytes,i.mime||t),s}openBoardDocLink(e){const t=no(e);if(t){this.openLinkedBoard(t);return}const i=Ja(e);if(!i){k.showMessage(f("无法识别的文档链接：{link}",{link:e}),5e3,"error");return}this.openDocOf(i)}async openLinkedBoard(e){if(!await X(e)){k.showMessage(f("这块白板已经不在了：{path}",{path:D(e)}),5e3,"error");return}await this.openExisting(e)}async restoreFromBackup(e){const t=E(e);for(const i of mi(t))try{const a=await j(i);if(!ia(a))continue;return await gt(t,a),re(t),!0}catch{}return!1}buildTopMenu(e){e.addItem({icon:"iconAdd",label:f("新建白板"),click:()=>void this.openNew()}),e.addSeparator(),this.recent.length===0?e.addItem({type:"readonly",label:f("还没有打开或保存过白板")}):(this.recent.slice(0,yl).forEach(t=>{const i=e.addItem({label:T(t),click:()=>void this.openExisting(t)});i instanceof HTMLElement&&i.setAttribute("title",t)}),e.addItem({label:f("清空最近记录"),click:()=>this.clearRecent()})),e.addSeparator(),e.addItem({icon:"iconOpen",label:f("按路径打开…"),click:()=>this.promptOpenPath()}),e.addItem({icon:"iconFolder",label:f("打开白板…"),click:()=>void this.openBoardPicker()}),e.addItem({icon:"iconSettings",label:f("设置"),click:()=>this.openSetting()})}registerBlockIconMenu(){this.eventBus.on("click-blockicon",({detail:e})=>{const t=bo(e.blockElements);t&&e.menu.addItem({icon:K,label:f("用 Excali 白板打开"),click:()=>void this.openExisting(t)})})}async refreshBoardLib(){if(this.libLoading)return;this.libLoading=!0;let e=[];try{await this.ready;try{e=(await kn()).map(Wa),this.boardDocs=e,this.boardSvgByDocId=new Map(e.map(i=>[i.docId,i.svg]))}catch(i){e=this.boardDocs,console.warn("[excali-studio] 白板文档查询失败（沿用上次绑定）",i)}let t=null;try{t=await ht(this.settings.saveDir)}catch(i){console.warn("[excali-studio] 白板库读保存目录失败",i)}t&&(this.boardFiles=Xa(t,e))}finally{this.libLoading=!1}this.dockRefresh?.()}rememberBoardDoc(e,t,i){this.boardSvgByDocId.set(e,i);const a={docId:e,title:t||f("无标题"),hpath:"",svg:i,updated:Date.now(),refs:0};this.boardDocs=[a,...this.boardDocs.filter(o=>o.docId!==e)];const s=E(i);this.boardFiles=this.boardFiles.map(o=>o.dataPath===s?{...o,docId:e,docTitle:t||f("无标题")}:o)}async adoptBoardFile(e){if(e.docId)return null;const t=await po()??await go();if(!t)return k.showMessage(f("找不到笔记本，无法建档"),7e3,"error"),null;const i=e.name.replace(/\.svg$/i,"")||e.name;try{const a=await co(t,Ya(this.settings.boardDir,i),""),s=D(e.dataPath);await ho(a,s,i),await oe(a,{"custom-excali-svg":s}),this.rememberBoardDoc(a,i,s);const o=[...this.tabs.values()].find(r=>r.data.dataPath===e.dataPath);return o&&!o.data.docId&&(o.data.docId=a),k.showMessage(f("已建档《{title}》",{title:i}),5e3),this.dockRefresh?.(),a}catch(a){return k.showMessage(f("建档失败：{msg}",{msg:a instanceof Error?a.message:String(a)}),1e4,"error"),null}}async autoOpenBoardForDoc(e){if(!this.settings.autoOpenBoard||this.autoOpenedDocs.has(e))return;this.autoOpenedDocs.add(e);let t=this.boardSvgByDocId.get(e);if(t===void 0){try{t=(await uo(e))["custom-excali-svg"]||""}catch{t=""}this.boardSvgByDocId.set(e,t)}t&&await this.openStudioTab(t,e)}registerBoardDocEvents(){this.eventBus.on("switch-protyle",({detail:e})=>{const t=e?.protyle?.block?.rootID;typeof t=="string"&&t!==""&&this.autoOpenBoardForDoc(t)}),this.eventBus.on("open-menu-doctree",({detail:e})=>{const t=e.elements?.[0];if(!t||t.getAttribute("data-type")!=="navigation-file")return;const i=t.getAttribute("data-node-id")||"",a=i?this.boardSvgByDocId.get(i):void 0;a&&e.menu.addItem({icon:K,label:f("在画板中打开"),click:()=>void this.openStudioTab(a,i)})}),this.eventBus.on("open-menu-filetab",e=>{try{const t=e.detail,i=t?.protyle?.protyle?.block?.rootID||t?.protyle?.block?.rootID||"";if(!i)return;const a=this.boardSvgByDocId.get(i);if(!a)return;t?.menu?.addItem({icon:K,label:f("在画板中打开"),click:()=>void this.openStudioTab(a,i)})}catch(t){console.warn("[excali-studio] 文件页签菜单注入失败",t)}})}copyText(e,t){const i=()=>k.showMessage(t,3e3);try{navigator.clipboard?.writeText?navigator.clipboard.writeText(e).then(i,()=>this.fallbackCopy(e,i)):this.fallbackCopy(e,i)}catch{this.fallbackCopy(e,i)}}fallbackCopy(e,t){try{const i=document.createElement("textarea");i.value=e,i.style.position="fixed",i.style.opacity="0",document.body.appendChild(i),i.select();const a=document.execCommand("copy");i.remove(),a?t():k.showMessage(f("复制失败：{msg}",{msg:"execCommand"}),7e3,"error")}catch(i){k.showMessage(f("复制失败：{msg}",{msg:i instanceof Error?i.message:String(i)}),7e3,"error")}}openFileMenu(e,t,i){const a=new k.Menu("excali-file-menu");a.addItem({icon:"iconEdit",label:f("在画板中打开"),click:()=>void this.openBoardFile(e)}),a.addItem({icon:"iconRight",label:f("插入到当前画布"),click:()=>this.insertBoardCardToActive(e)}),e.docId?(a.addItem({icon:"iconFile",label:f("打开存档文档"),click:()=>this.openDocOf(e.docId)}),a.addItem({icon:"iconCopy",label:f("复制嵌入引用"),click:()=>this.copyText(xn(e.docId),f("已复制嵌入引用"))}),a.addItem({icon:"iconCopy",label:f("复制行内引用"),click:()=>this.copyText(qa(e.docId,e.docTitle),f("已复制行内引用"))})):a.addItem({icon:"iconAdd",label:f("建档"),click:()=>void this.adoptBoardFile(e)}),a.addItem({icon:"iconRename",label:f("重命名"),click:()=>void this.renameFromDock(e)}),a.addSeparator(),a.addItem({icon:"iconTrash",label:f("删除…"),click:()=>void this.deleteBoardFile(e)}),a.open({x:t,y:i})}openBoardFile(e){return this.openStudioTab(e.dataPath,e.docId||void 0)}insertBoardCardToActive(e){const t=this.activeActions();if(!t){k.showMessage(f("先打开一块白板，再往里插卡片"));return}t.insertBoardCard(D(e.dataPath),ye(e))}openDocOf(e){this.openDocumentById(e)}openDocumentById(e){const t=window,i=t.openMobileFileById??t.siyuan?.openMobileFileById;if(t.siyuan?.mobile&&typeof i=="function")try{i(this.app,e,[],"start");return}catch(a){console.warn("[excali-studio] 移动端打开文档失败，回落页签",a)}k.openTab({app:this.app,doc:{id:e}}).catch(a=>{k.showMessage(f("打开文档失败：{msg}",{msg:a instanceof Error?a.message:String(a)}),7e3)})}async deleteBoardFile(e){const t=Ka(e),i=t.doc?`，以及存档文档《${t.doc.title}》`:"";k.confirm(f("删除白板"),f("将删除白板文件 {name} 及其备份（如存在）{doc}。删除不可恢复；白板开着时，画布上未保存的改动也会一并丢弃。",{name:e.name,doc:i}),()=>{(async()=>{try{for(const a of[...this.tabs.values()])a.data.dataPath===e.dataPath&&a.closeForDelete();await at(t.svgPath);for(const a of t.bakPaths)try{await at(a)}catch{}if(t.doc)try{await fo(t.doc.id)}catch(a){console.warn("[excali-studio] 删除存档文档失败（文件已删）",t.doc.id,a)}this.boardFiles=this.boardFiles.filter(a=>a.dataPath!==e.dataPath),this.boardDocs=this.boardDocs.filter(a=>a.docId!==t.doc?.id),t.doc&&this.boardSvgByDocId.delete(t.doc.id),this.recent=this.recent.filter(a=>a!==e.dataPath),this.persist(),this.dockRefresh?.(),k.showMessage(f("已删除《{name}》",{name:e.name}),5e3)}catch(a){k.showMessage(f("删除失败：{msg}",{msg:a instanceof Error?a.message:String(a)}),1e4,"error")}})()})}deleteActiveBoard(){const e=this.activeCustom?this.tabs.get(this.activeCustom)?.data.dataPath:null;if(!e){k.showMessage(f("没有可删除的白板：当前没有打开已保存的白板"),7e3);return}const t=this.boardFiles.find(i=>i.dataPath===e);if(!t){this.refreshBoardLib().then(()=>{const i=this.boardFiles.find(a=>a.dataPath===e);i?this.deleteBoardFile(i):k.showMessage(f("删除失败：{msg}",{msg:e}),7e3,"error")});return}this.deleteBoardFile(t)}async renameFromDock(e){const t=await this.promptFileName(e.name,f("重命名白板"));if(t)try{const i=await this.renameBoard(e.dataPath,t);this.applyRenameToSession(e.dataPath,i),k.showMessage(f("已重命名为 {name}",{name:T(i)}),5e3)}catch(i){k.showMessage(f("重命名失败：{msg}",{msg:i instanceof Error?i.message:String(i)}),7e3,"error")}}applyRenameToSession(e,t){for(const i of this.tabs.values())i.data.dataPath===e&&(i.data.dataPath=t,i.tab.updateTitle(T(t)))}copyBoardRefFor(e){const t=this.tabs.get(e);if(!t)return;const i=t.data.dataPath,a=t.data.docId??(i?this.boardDocs.find(s=>E(s.svg)===i)?.docId:void 0);if(!a){k.showMessage(f("还没建档，复制不了引用：在白板行右键「建档」"),7e3);return}this.copyText(xn(a),f("已复制嵌入引用"))}async runCheckup(){if(!this.checkupRunning){this.checkupRunning=!0;try{await this.refreshBoardLib();const e=[];for(const i of this.boardDocs)await X(E(i.svg))||e.push(i);if(e.length===0){k.showMessage(f("体检完成：没有断链的白板文档"),5e3);return}const t=i=>i.length===0?`<p class="exs-check__none">${f("没有")}</p>`:i.map(a=>`<div class="exs-check__row" title="${q(a.tip)}"><span class="exs-check__name">${B(a.name)}</span><code class="exs-check__path">${B(a.sub)}</code></div>`).join("");new k.Dialog({title:f("白板体检"),width:"560px",content:`<div class="exs-check">
          <div class="exs-check__group">${f("断链文档：{n}",{n:e.length})}</div>
          ${t(e.map(i=>({name:i.title,sub:T(i.svg),tip:E(i.svg)})))}
          <p class="exs-check__hint">${f("断链文档需手动重新保存或删除；未建档的白板文件是正常状态，不用处理")}</p>
        </div>`})}finally{this.checkupRunning=!1}}}promptOpenPath(){k.openInputDialog({title:f("按路径打开…"),label:f("工作空间内的 SVG 路径"),placeholder:"assets/excali-20261015-120000.svg",value:"",confirmText:f("打开"),onConfirm:(e,t)=>{const i=e.trim();i&&(this.openExisting(E(i)),t.destroy())}})}clearSlashHint(e){const t=e?.protyle?.toolbar?.range;!t||!t.toString().startsWith("/")||(t.deleteContents(),e.protyle?.wysiwyg?.element?.dispatchEvent(new InputEvent("input",{bubbles:!0,inputType:"deleteContentBackward"})))}async openNew(){const e=await this.promptFileName(f("未命名白板"),f("新建白板"));if(e)try{const{path:t,docId:i}=await this.createBoardFile(e);await this.openStudioTab(t,i)}catch(t){k.showMessage(f("创建白板失败：{msg}",{msg:t instanceof Error?t.message:String(t)}),7e3,"error")}}openExisting(e){return this.openStudioTab(e)}async createBoardFile(e){const t=await se(this.settings.saveDir,ie(e,f("未命名白板"))),i=this.settings.autoCreateDoc?await this.adoptBoardFile({dataPath:t,name:T(t),docId:"",docTitle:"",updated:Date.now()}):null,{sceneToSvgText:a}=await this.lazyMod();return await gt(t,await a({elements:[],appState:{},files:{}})),re(t),this.rememberRecent(t),this.rememberBoardFile(t,i??void 0,T(t).replace(/\.svg$/i,"")),this.refreshBoardLib(),{path:t,docId:i??void 0}}async saveSvg(e,t){if(!t)throw new Error("saveSvg 只接受已有文件（新建走 createBoardFile）");const i=E(t);let a=null;try{a=await j(i)}catch{}if(a!==null&&aa(a,e))return{path:t};const s=await gt(i,e);return re(s),this.rememberRecent(s),this.rememberBoardFile(s),this.refreshBoardLib(),{path:s}}rememberBoardFile(e,t,i){const a=E(e);this.boardFiles.some(s=>s.dataPath===a)||(this.boardFiles=[{dataPath:a,name:T(a),docId:t??"",docTitle:i??"",updated:Date.now()},...this.boardFiles])}async renameBoard(e,t){const i=E(e),a=await se(this.settings.saveDir,ie(t),i);if(E(a)===i)return i;const s=await wn(i,a);try{await Sn(D(i),D(s))}catch(r){console.warn("[excali-studio] 重命名后更新正文资源引用失败",r)}const o=this.boardDocs.filter(r=>E(r.svg)===i);if(o.length>0){const r=D(s);for(const d of o)try{await oe(d.docId,{"custom-excali-svg":r})}catch(l){console.warn("[excali-studio] 重命名后同步白板绑定失败",d.docId,l)}this.boardDocs=this.boardDocs.map(d=>o.some(l=>l.docId===d.docId)?{...d,svg:D(s)}:d),this.boardSvgByDocId=new Map(this.boardDocs.map(d=>[d.docId,d.svg]))}return this.refreshBoardLib(),this.recent=[s,...this.recent.filter(r=>r!==i&&r!==s)],this.persist(),s}libDirRel(){return J(this.settings.saveDir,"excali-libraries")}localLibRel(){return J(this.libDirRel(),ra)}libraryImportUrl(){const e=encodeURIComponent(this.libDirRel());return`${location.origin}/plugins/${Rt}/library-import.html?dir=${e}`}async migrateStencilLibrary(){if(!this.settings.stencilMigrated)try{const e=this.localLibRel();if(!await X(e)){let t=[];try{t=hn(await j(E(J(this.settings.saveDir,"excali-library.json"))))}catch{t=[]}t.length>0&&(await ot(e,fn(t)),k.showMessage(f("组件库已迁移到 {dir}",{dir:"excali-libraries"}),3500))}}catch(e){console.warn("[excali-studio] 组件库迁移失败（旧文件保留，下次不再自动尝试）",e)}finally{this.settings.stencilMigrated=!0,this.persist()}}async loadLibraryItems(){await this.migrateStencilLibrary();const e=this.localLibRel();let t=[];try{t=await ae(this.libDirRel(),/\.excalidrawlib$/i)}catch{t=[]}t.sort((a,s)=>a===e?-1:s===e?1:a.localeCompare(s));const i=[];for(const a of t)try{i.push({path:a,items:hn(await j(a))})}catch(s){console.warn("[excali-studio] 模板库文件读取失败，已跳过",a,s)}return this.libCache=ha(i),this.libCache.items}async saveLibraryItems(e){const t=this.libCache??{items:[],sourceOf:new Map,byPath:new Map},i=fa(t,e,this.localLibRel());for(const{path:a,items:s}of i)try{if(s.length===0){await X(a)&&await at(a);continue}await ot(a,fn(s))}catch(o){console.error("[excali-studio] 模板库文件写入失败",a,o),k.showMessage(f("模板库保存失败：{path}",{path:T(a)}),5e3,"error")}this.libCache=null,await this.loadLibraryItems()}promptFileName(e,t){return new Promise(i=>{let a=!1;const s=l=>{a||(a=!0,o.destroy(),i(l))},o=new k.Dialog({title:t,width:"420px",content:`<div class="exs-picker">
  <input class="b3-text-field fn__block exs-name-input" value="${q(e)}" />
  <div class="exs-name-tip">${f("位置")}：${B(this.settings.saveDir)}</div>
  <div class="exs-name-actions">
    <button class="b3-button exs-name-cancel" type="button">${f("取消")}</button>
    <button class="b3-button exs-name-ok" type="button">${f("确定")}</button>
  </div>
</div>`,destroyCallback:()=>s(null)});o.element.classList.add("exs-name-dialog");const r=o.element.querySelector(".exs-name-input");o.element.querySelector(".exs-name-cancel").addEventListener("click",()=>s(null));const d=()=>s(ie(r.value||e));o.element.querySelector(".exs-name-ok").addEventListener("click",d),r.addEventListener("keydown",l=>{l.key==="Enter"?(l.preventDefault(),d()):l.key==="Escape"&&(l.preventDefault(),s(null)),l.stopPropagation()}),setTimeout(()=>{r.focus(),r.select()},50)})}async pickBoardRef(){let e=[];try{e=await ht(this.settings.saveDir)}catch(i){return k.showMessage(f("读取目录失败：{msg}",{msg:i instanceof Error?i.message:String(i)}),7e3,"error"),null}if(e.length===0)return k.showMessage(f("目录里还没有白板文件")),null;const t=new Set([...this.tabs.values()].map(i=>i.data.dataPath).filter(i=>typeof i=="string"));return await xo(e,t)}async openBoardPicker(){const e=await this.pickBoardRef();e&&this.openExisting(e)}rememberRecent(e){const t=E(e);this.recent=[t,...this.recent.filter(i=>i!==t)].slice(0,bl),this.persist()}clearRecent(){this.recent=[],this.persist()}setupSetting(){let e=null,t=null,i=null,a=null,s=null,o=null,r=null,d=null,l=null,c=null,u=null;this.setting=new k.Setting({confirmCallback:()=>{this.settings={...this.settings,saveDir:e?.value??this.settings.saveDir,accentStroke:t?.checked??this.settings.accentStroke,showWelcome:i?.checked??this.settings.showWelcome,gridModeEnabled:a?.checked??this.settings.gridModeEnabled,boardDir:s?.value??this.settings.boardDir,autoOpenBoard:o?.checked??this.settings.autoOpenBoard,autoCreateDoc:r?.checked??this.settings.autoCreateDoc,imageBaseUrl:d?.value??this.settings.imageBaseUrl,imageModel:l?.value??this.settings.imageModel,imageApiKey:c?.value??this.settings.imageApiKey,imageSize:u?.value??this.settings.imageSize},this.settings=it(this.settings),this.persist()}}),this.setting.addItem({title:f("保存目录"),description:f("新白板保存的位置（工作空间相对路径，默认 assets/excali）。白板库只列这个目录里的 .svg；assets 根目录留给普通图片附件。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.saveDir,h.placeholder=O.saveDir,h.addEventListener("change",()=>{this.settings={...this.settings,saveDir:h.value},this.persist()}),e=h,h}}),this.setting.addItem({title:f("图像生成 API 地址"),description:f("OpenAI 兼容的 images API 地址（如 https://api.openai.com/v1）；留空 = 关闭生图。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.imageBaseUrl,h.placeholder="https://api.openai.com/v1",h.addEventListener("change",()=>{this.settings=it({...this.settings,imageBaseUrl:h.value}),this.persist()}),d=h,h}}),this.setting.addItem({title:f("图像生成模型"),description:f("模型名（如 gpt-image-1、dall-e-3）；按服务商支持的型号填写。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.imageModel,h.placeholder=O.imageModel,h.addEventListener("change",()=>{this.settings=it({...this.settings,imageModel:h.value}),this.persist()}),l=h,h}}),this.setting.addItem({title:f("图像生成 API Key"),description:f("只保存在插件数据里，不写日志、不写白板文件。"),createActionElement:()=>{const h=document.createElement("input");return h.type="password",h.className="b3-text-field fn__block",h.autocomplete="off",h.spellcheck=!1,h.value=this.settings.imageApiKey,h.placeholder="sk-...",h.addEventListener("change",()=>{this.settings=it({...this.settings,imageApiKey:h.value}),this.persist()}),c=h,h}}),this.setting.addItem({title:f("图像生成尺寸"),description:f("传给 images API 的 size（如 1024x1024）；不同模型支持的尺寸不同，按服务商文档填写。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.imageSize,h.placeholder=O.imageSize,h.addEventListener("change",()=>{this.settings=it({...this.settings,imageSize:h.value}),this.persist()}),u=h,h}}),this.setting.addItem({title:f("画笔颜色跟随思源强调色"),description:f("新画板把第一笔的默认颜色设成当前主题强调色；只影响默认值，不覆盖已有图。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.accentStroke,h.addEventListener("change",()=>{this.settings={...this.settings,accentStroke:h.checked},this.persist()}),t=h,h}}),this.setting.addItem({title:f("空画板显示引导画面"),description:f("空白板中央显示手绘纸飞机和上手提示；落第一笔就消失，只影响新建的白板。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.showWelcome,h.addEventListener("change",()=>{this.settings={...this.settings,showWelcome:h.checked},this.persist()}),i=h,h}}),this.setting.addItem({title:f("默认显示网格"),description:f("在任意白板里切换网格都会记住这个值，之后所有白板（含还没保存过的空白板）打开时都按它显示。改这里只影响之后打开的页签。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.gridModeEnabled,h.addEventListener("change",()=>{this.settings={...this.settings,gridModeEnabled:h.checked},this.persist()}),a=h,h}}),this.setting.addItem({title:f("白板文档目录"),description:f("白板建档的落点（当前笔记本内的路径，默认 /Excali 白板）。只影响「建档」动作，SVG 工程文件不受它影响，仍存上面的保存目录。"),createActionElement:()=>{const h=document.createElement("input");return h.type="text",h.className="b3-text-field fn__block",h.value=this.settings.boardDir,h.placeholder=O.boardDir,h.addEventListener("change",()=>{this.settings={...this.settings,boardDir:h.value},this.persist()}),s=h,h}}),this.setting.addItem({title:f("新建时自动建档"),description:f("关：新建只落 SVG 工程文件，白板库按文件列，文档树保持干净。开：新建白板时顺带建一篇文档绑定（可反链、可搜索、可文档树管理）。关着也能补建——Dock 白板行右键「建档」。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.autoCreateDoc,h.addEventListener("change",()=>{this.settings={...this.settings,autoCreateDoc:h.checked},this.persist()}),r=h,h}}),this.setting.addItem({title:f("打开白板文档时自动进入画板"),description:f("切到绑定了白板的文档会自动打开对应画板页签；每篇文档每次会话只自动开一次，已开着则直接聚焦。"),createActionElement:()=>{const h=document.createElement("input");return h.type="checkbox",h.className="b3-switch fn__flex-center",h.checked=this.settings.autoOpenBoard,h.addEventListener("change",()=>{this.settings={...this.settings,autoOpenBoard:h.checked},this.persist()}),o=h,h}}),this.setting.addItem({title:f("白板体检"),description:f("检查存档文档绑定的工程文件是否还存在（断链）。白板文件本身即白板，未建档是正常状态，不用处理。"),createActionElement:()=>{const h=document.createElement("button");return h.type="button",h.className="b3-button b3-button--outline fn__flex-center",h.textContent=f("开始体检"),h.addEventListener("click",()=>void this.runCheckup()),h}})}async loadState(){const e=await this.loadData(Bn),t=e&&typeof e=="object"?e:{};this.settings=it(t.settings),this.recent=Array.isArray(t.recent)?t.recent.filter(i=>typeof i=="string"&&i!==""):[],this.dirMigrated=t.dirMigrated===!0,this.legacyBoards=Array.isArray(t.boards)?t.boards.filter(i=>typeof i=="string"):[]}rememberGrid(e){this.settings.gridModeEnabled!==e&&(this.settings={...this.settings,gridModeEnabled:e},this.persist())}persist(){this.saveData(Bn,{settings:this.settings,recent:this.recent,dirMigrated:this.dirMigrated}).catch(e=>console.error("[excali-studio] 保存设置失败",e))}}module.exports=xl;
