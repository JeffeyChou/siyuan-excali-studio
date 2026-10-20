/**
 * 2026-10-17 第十八轮：白板库的纯逻辑（零依赖，node 测试直接 import 跑真断言）。
 *
 * 形态变更（第十八轮）：白板的第一性身份从「文档」改回「文件」——库列表按
 * assets 里的 .svg 列，文档（custom-excali-svg 绑定）降级为可选存档层，
 * 只在行上留「已建档」徽标与右键动作（建档/打开文档/复制引用）。
 *
 * 单独成模块的口径照 board-list.ts / dock-state.ts：宿主 index.ts 带全部思源依赖，
 * 在测试里只能被文本扫描；「文件怎么和文档配上、删除会碰到什么、显示名取谁」
 * 这些判错都是无声 bug，必须能真断言。
 */

// 相对导入带 .ts 后缀（node --experimental-strip-types 不认无后缀相对路径；Vite 两边都认）
import { t } from "../i18n.ts";
import { backupChainOf, fileNameOf, isBackupPath, toAssetRef, toDataPath, type BoardFileEntry } from "./storage.ts";

/** 绑定了 custom-excali-svg 的白板文档（存档层；菜单注入/反查/复制引用用） */
export type BoardDocItem = {
  docId: string;
  /** 显示名 = 文档标题（建档后可改，SVG 文件名不改） */
  title: string;
  hpath: string;
  /** 绑定的工程文件引用，形如 assets/excali-xxx.svg */
  svg: string;
  /** 解析后的 epoch 毫秒；内核原始值是 yyyymmddHHMMSS 整数，解析不出给 0 */
  updated: number;
  /** 反链引用数（多少篇文档引用了这块白板） */
  refs: number;
};

/**
 * 思源块 updated/created 是 yyyymmddHHMMSS 整数（不是 epoch 毫秒）。
 * 8 位（纯日期）也接受；解析不出回 0，由显示层留空。
 */
export function parseSiyuanStamp(n: number): number {
  const s = String(n ?? "");
  if (!/^\d{8}(\d{6})?$/.test(s)) return 0;
  const y = Number(s.slice(0, 4));
  const mo = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  const hh = s.length >= 12 ? Number(s.slice(8, 10)) : 0;
  const mi = s.length >= 12 ? Number(s.slice(10, 12)) : 0;
  const ss = s.length >= 14 ? Number(s.slice(12, 14)) : 0;
  const ms = new Date(y, mo - 1, d, hh, mi, ss).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * blocks.refs 是 JSON 串：{"blocks":{块id:{…, "root_id":所属文档id}}}。
 * 引用数按**去重后的 root_id** 计——同一篇文档引了三个块也只算一篇（与思源
 * 反链面板的「N 个文档引用」口径一致）。脏/空/缺字段一律 0，不抛。
 */
export function countBacklinks(refsJson: string): number {
  if (typeof refsJson !== "string" || refsJson === "") return 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(refsJson);
  } catch {
    return 0;
  }
  const blocks = (parsed as { blocks?: unknown })?.blocks;
  if (!blocks || typeof blocks !== "object") return 0;
  const roots = new Set<string>();
  for (const v of Object.values(blocks as Record<string, unknown>)) {
    const root = (v as { root_id?: unknown })?.root_id;
    if (typeof root === "string" && root) roots.add(root);
  }
  return roots.size;
}

/** SQL 行（listBoardDocs 的返回）→ 存档文档项；标题空的回落「无标题」 */
export function toBoardDocItem(row: {
  id: string;
  content: string;
  hpath: string;
  updated: number;
  refs: string;
  svg: string;
}): BoardDocItem {
  return {
    docId: row.id,
    title: row.content || t("无标题"),
    hpath: row.hpath || "",
    svg: row.svg || "",
    updated: parseSiyuanStamp(row.updated),
    refs: countBacklinks(row.refs),
  };
}

/* ---------------- 第十八轮：文件形态的库列表 ---------------- */

/**
 * 库列表的一项 = assets 里的一个 .svg 工程文件。
 * docId 非空 = 已建档（绑定了文档）；空串 = 纯文件（文档树零痕迹）。
 */
export type BoardFileItem = {
  /** /data/assets/x.svg */
  dataPath: string;
  /** 文件名（展示用，带 .svg） */
  name: string;
  /** 绑定文档 id；空串 = 未建档 */
  docId: string;
  /** 绑定文档标题；未建档为空串 */
  docTitle: string;
  updated: number;
};

/**
 * 文件项 + 文档绑定 → 库列表项。绑定按 /data 归一的 svg 路径比
 * （attribute 存的是 assets/xxx.svg 引用形式），保持 entries 的新→旧序。
 * 绑定失效（文档删了）时文件仍在库里，只是徽标没了——不会从列表里消失。
 */
export function toBoardFileItems(entries: BoardFileEntry[], docs: BoardDocItem[]): BoardFileItem[] {
  const bySvg = new Map(docs.map((d) => [toDataPath(d.svg), d]));
  return entries.map((e) => {
    const dataPath = toDataPath(e.path);
    const doc = bySvg.get(dataPath);
    return {
      dataPath,
      name: fileNameOf(e.path),
      docId: doc?.docId ?? "",
      docTitle: doc?.title ?? "",
      updated: e.updated,
    };
  });
}

/** 列表行显示名：已建档用文档标题（可改），未建档用剥掉 .svg 的文件名 */
export function boardDisplayName(item: BoardFileItem): string {
  return item.docTitle || item.name.replace(/\.svg$/i, "");
}

/**
 * dock 文件库的同值跳过指纹：列表内容 + 打开态拼串，同值整段跳过 DOM 写。
 * 控制字符做分隔符，正文里的 | # 不会撞车。
 */
export function fileLibViewKey(items: BoardFileItem[], opened: ReadonlySet<string>): string {
  return items
    .map(
      (x) =>
        `${x.dataPath}\u0000${x.name}\u0000${x.docId}\u0000${x.docTitle}\u0000${x.updated}\u0000${opened.has(x.dataPath) ? 1 : 0}`,
    )
    .join("\u0001");
}

/* ---------------- 第二十五轮：库 = 专属目录的磁盘真源 ----------------
 * 第二十四轮曾用 data.json 的 boards 登记表过滤 assets 里的外来 svg；
 * 第二十五轮把白板挪进 assets/excali 后，目录本身就是登记表——dock 只 readDir
 * 这个目录，登记表退役（旧字段只在迁移时作为候选读一次）。 */

/**
 * 建档落点：设置里的白板目录（hpath）+ 标题 → createDocWithMd 的 path。
 * 用户可能把目录写成 `Excali 白板` / `/Excali 白板/`，统一成 `/Excali 白板/标题`；
 * 标题空回落「未命名白板」，两边都不留双斜杠。
 */
export function boardDocPath(dir: string, title: string): string {
  let d = String(dir ?? "").trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (d !== "" && !d.startsWith("/")) d = `/${d}`;
  const name = String(title ?? "").trim() || t("未命名白板");
  return `${d}/${name}`;
}

/**
 * 块嵌入 `![[块ID]]`——贴进正文就是这张图。
 * 口径修正：demo 里写的 `![[id "标题"]]` 是假数据期的想当然；内核语法里**块嵌入不支持
 * 自定义显示文本**（那是块引用 `((…))` 的能力），带引号反而会把「id "标题"」整串当块 id 查不到。
 */
export function embedRef(docId: string): string {
  return `![[${docId}]]`;
}

/** 显示文本里的引号/换行会拆坏 `((id "文本"))` 的语法，复制前换成空格 */
function refAlias(title: string): string {
  return String(title ?? "")
    .replace(/["\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 块引用（行内）`((块ID "显示文本"))`——在别处指向这块白板，反链由此而来 */
export function inlineRef(docId: string, title: string): string {
  return `((${docId} "${refAlias(title)}"))`;
}

/**
 * 删除一项白板会碰到的东西（确认框列单用；纯函数可断言）。
 * 思源的 removeFile / removeDoc 都是真实删除、没有回收站，所以删前列全。
 */
export type DeletePlan = {
  /** 工程文件 /data 路径 */
  svgPath: string;
  /** 备份链全部槽位 /data 路径（第十九轮滚动三份；不一定都存在，删除逐档 best-effort） */
  bakPaths: string[];
  /** 绑定文档；未建档为 null */
  doc: { id: string; title: string } | null;
};

export function deletePlanOf(item: BoardFileItem): DeletePlan {
  return {
    svgPath: item.dataPath,
    bakPaths: backupChainOf(item.dataPath),
    doc: item.docId ? { id: item.docId, title: item.docTitle } : null,
  };
}

/* ---------------- 第二十六轮 T6：图形点击跳文档 ---------------- */

/**
 * 解析图形元素 link 字段里的思源文档引用。约定写法 `siyuan:doc/<文档ID>`
 * （也容忍 `siyuan://doc/<id>`），命中返回文档 ID，否则 null——非思源链接
 * （http/https 等）一律放行给 vendor 自己的打开行为。
 */
export function docIdFromLink(link: unknown): string | null {
  if (typeof link !== "string") return null;
  const m = /^siyuan:(?:\/\/)?doc\/([A-Za-z0-9-]{10,})$/.exec(link.trim());
  return m ? (m[1] ?? null) : null;
}

/* ---------------- 第四十轮：白板链接（画布上的卡片） ----------------
 * 一条链接 = 一块白板的引用。三种形态各管一段路：
 *   ref   `assets/excali/x.svg`——人读、写进拖拽载荷、卡片副标题显示；
 *   link  `siyuan:excali/assets/excali/x.svg`——塞进元素 link 字段随 SVG 存盘；
 *   path  `/data/assets/excali/x.svg`——宿主读写盘用。
 * 链接沿用 `siyuan:` 前缀（第二十六轮 T6 的 doc 链接同一族），vendor 的
 * normalizeLink/sanitize-url 自定义协议原样通过，不用改内核。
 */

/** 拖拽载荷的 MIME（dock → 画布；思源/Electron 不给自定义 dataTransfer 之外的通道） */
export const BOARD_DRAG_MIME = "application/x-siyuan-excali-board";

/** 元素 link 字段里白板链接的前缀 */
export const BOARD_LINK_PREFIX = "siyuan:excali/";

/** 逐段转义再拼 `/`：路径分隔符保持可读，空格/中文/# 这些交给 encodeURIComponent */
function encodeRef(ref: string): string {
  return ref.split("/").map(encodeURIComponent).join("/");
}

function decodeRef(s: string): string {
  return s
    .split("/")
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    })
    .join("/");
}

/** 设置里的目录（可能写成 assets/excali、/data/assets/excali/）归一成引用形式 */
export function dirRef(dir: string): string {
  const s = toAssetRef(toDataPath(String(dir ?? "").trim().replace(/\\/g, "/")));
  return s.replace(/^\/+/, "").replace(/\/+$/, "");
}

/** 白板路径（任一种形态）→ 元素 link 字段值；不做校验，写方自己保证是白板 */
export function boardLinkOf(dataPath: string): string {
  return `${BOARD_LINK_PREFIX}${encodeRef(toAssetRef(toDataPath(dataPath)))}`;
}

/**
 * 任意写法的路径 → 库内引用（assets/x.svg），不合规则 null。
 * 判据即「能不能当白板打开」：必须 .svg、不是备份档（.bak1.svg 会灌满卡片）、
 * 不含 ..（防手改 SVG 里的 link 越界读别的文件）。
 */
export function boardRefOf(raw: string): string | null {
  const s = String(raw ?? "").trim().replace(/\\/g, "/");
  if (s === "") return null;
  const ref = toAssetRef(toDataPath(s));
  if (!/\.svg$/i.test(ref)) return null;
  if (isBackupPath(ref)) return null;
  if (ref.split("/").some((seg) => seg === ".." || seg === "")) return null;
  return ref;
}

/** 元素 link → 库内引用；非白板链接（http、siyuan:doc/…）一律 null 交回上游 */
export function boardRefFromLink(link: unknown): string | null {
  if (typeof link !== "string") return null;
  const s = link.trim();
  const m = /^siyuan:(?:\/\/)?excali\/(.+)$/.exec(s);
  if (!m) return null;
  return boardRefOf(decodeRef(m[1] ?? ""));
}

/** ref 是否落在目录 dir 下（dir 空 = 不限制） */
export function refInDir(ref: string, dir: string): boolean {
  const d = dirRef(dir);
  if (d === "") return true;
  return ref.startsWith(`${d}/`);
}

/** 白板链接 → /data 路径（存在性交给宿主 fileExists；这里只管语法） */
export function boardPathFromLink(link: unknown): string | null {
  const ref = boardRefFromLink(link);
  return ref ? toDataPath(ref) : null;
}

/**
 * 纯文本 → 库内白板引用。用于「把路径粘进画布自动变卡片」：
 * 支持思源的路径写法（assets/…）、/data/… 绝对写法，以及 [[…]] 包起来的写法。
 * 多行文本一律不认——粘的是段落就不是路径。
 */
export function boardRefFromText(text: unknown, dir: string): string | null {
  if (typeof text !== "string") return null;
  const s = text.trim();
  if (s === "" || s.includes("\n")) return null;
  const bare = /^\[\[(.+)\]\]$/.exec(s)?.[1] ?? s;
  const ref = boardRefOf(bare);
  if (!ref || !refInDir(ref, dir)) return null;
  return ref;
}

/** 拖拽载荷：ref + 卡片标题（dock 行上的显示名，建档过的就是文档标题） */
export type BoardDragPayload = { ref: string; title: string };

/**
 * 解拖拽载荷。正常是 dock 写的 JSON，也容忍裸路径（从别处拖来的、或载荷被
 * 中间层改写过）——解不出白板 ref 就回 null，让 drop 走原有分支。
 */
export function decodeBoardDrag(raw: unknown): BoardDragPayload | null {
  if (typeof raw !== "string" || raw === "") return null;
  let ref: string | null = null;
  let title = "";
  if (raw.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    const o = parsed as { ref?: unknown; title?: unknown };
    ref = typeof o.ref === "string" ? boardRefOf(o.ref) : null;
    title = typeof o.title === "string" ? o.title.trim() : "";
  } else {
    ref = boardRefOf(raw);
  }
  if (!ref) return null;
  // 标题缺省用文件名（与 boardDisplayName 对未建档项的口径一致）
  return { ref, title: title || fileNameOf(ref).replace(/\.svg$/i, "") };
}
