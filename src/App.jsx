import { useState, useCallback, useEffect, useRef } from "react";

// ─── Markdown Parser ────────────────────────────────────────
function parseMd(md) {
  let html = md
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/^```(\w*)\n([\s\S]*?)```$/gm, '<pre class="md-pre"><code>$2</code></pre>')
    .replace(/^\- (.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="md-li-num">$1</li>')
    .replace(/^---$/gm, '<hr class="md-hr"/>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank">$1</a>');
  html = html.replace(/(<li class="md-li">.*?<\/li>\n?)+/g, (m) => `<ul class="md-ul">${m}</ul>`);
  html = html.replace(/(<li class="md-li-num">.*?<\/li>\n?)+/g, (m) => `<ol class="md-ol">${m}</ol>`);
  html = html.split("\n").map((line) => {
    const t = line.trim();
    if (!t || t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<ol") || t.startsWith("<li") || t.startsWith("<pre") || t.startsWith("<hr") || t.startsWith("</")) return line;
    return `<p class="md-p">${t}</p>`;
  }).join("\n");
  return html;
}

// ─── Constants ──────────────────────────────────────────────
const TAG_COLORS = [
  { text: "#e94560", border: "#e94560" },
  { text: "#16c79a", border: "#16c79a" },
  { text: "#f5a623", border: "#f5a623" },
  { text: "#a29bfe", border: "#a29bfe" },
  { text: "#fd79a8", border: "#fd79a8" },
  { text: "#00cec9", border: "#00cec9" },
  { text: "#e17055", border: "#e17055" },
  { text: "#6c5ce7", border: "#6c5ce7" },
];

function getTagColor(tag, allTags) {
  const idx = allTags.indexOf(tag);
  return TAG_COLORS[(idx >= 0 ? idx : 0) % TAG_COLORS.length];
}

const PRESET_TAGS = ["Unity", "Java", "Python", "JavaScript", "React", "C#", "TypeScript", "CSS", "HTML", "Node.js", "Git", "Docker", "AWS", "メモ", "チュートリアル", "設計"];

const NAV_ITEMS = [
  { id: "browse", label: "ファイル一覧", icon: "◧" },
  { id: "upload", label: "アップロード", icon: "↑" },
  { id: "tags", label: "タグ管理", icon: "⬡" },
];

// ─── Hamburger Icon ─────────────────────────────────────────
function HamburgerIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" style={{ display: "block" }}>
      <rect y={open ? 9 : 3} width="20" height="2" rx="1" fill="#c0c0d8"
        style={{ transition: "all 0.3s", transform: open ? "rotate(45deg)" : "none", transformOrigin: "center" }} />
      <rect y="9" width="20" height="2" rx="1" fill="#c0c0d8"
        style={{ transition: "all 0.3s", opacity: open ? 0 : 1 }} />
      <rect y={open ? 9 : 15} width="20" height="2" rx="1" fill="#c0c0d8"
        style={{ transition: "all 0.3s", transform: open ? "rotate(-45deg)" : "none", transformOrigin: "center" }} />
    </svg>
  );
}

// ─── Main App ───────────────────────────────────────────────
export default function App() {
  const [files, setFiles] = useState([]);
  const [currentPage, setCurrentPage] = useState("browse");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const menuRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("md-viewer-files");
      if (saved) setFiles(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      if (files.length > 0) localStorage.setItem("md-viewer-files", JSON.stringify(files));
      else localStorage.removeItem("md-viewer-files");
    } catch (e) {}
  }, [files]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allTags = [...new Set(files.flatMap((f) => f.tags))].sort();

  const navigate = (page) => {
    setCurrentPage(page);
    setMenuOpen(false);
    if (page !== "browse") setSelectedFile(null);
  };

  const addTag = (fileId, tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setFiles((prev) => prev.map((f) => f.id === fileId && !f.tags.includes(trimmed) ? { ...f, tags: [...f.tags, trimmed] } : f));
  };

  const removeTag = (fileId, tag) => {
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, tags: f.tags.filter((t) => t !== tag) } : f));
  };

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (selectedFile?.id === fileId) setSelectedFile(null);
  };

  const handleFileUpload = useCallback((fileList) => {
    Array.from(fileList).forEach((file) => {
      if (file.name.endsWith(".md") || file.name.endsWith(".markdown") || file.name.endsWith(".txt")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          const title = content.match(/^#\s+(.+)$/m)?.[1] || file.name.replace(/\.(md|markdown|txt)$/, "");
          setFiles((prev) => {
            if (prev.some((f) => f.name === file.name)) return prev;
            return [...prev, { id: Date.now() + Math.random(), name: file.name, title, content, tags: [], addedAt: new Date().toISOString() }];
          });
        };
        reader.readAsText(file);
      }
    });
  }, []);

  return (
    <div style={S.container}>
      <style>{globalCSS}</style>

      <header style={S.header}>
        <div style={S.headerLeft} ref={menuRef}>
          <button style={S.hamburger} onClick={() => setMenuOpen(!menuOpen)} aria-label="メニュー">
            <HamburgerIcon open={menuOpen} />
          </button>

          {menuOpen && (
            <nav style={S.navDropdown} className="fade-in">
              {NAV_ITEMS.map((item) => (
                <button key={item.id} className="nav-item" style={{ ...S.navItem, ...(currentPage === item.id ? S.navItemActive : {}) }} onClick={() => navigate(item.id)}>
                  <span style={S.navIcon}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div style={S.navDivider} />
              <div style={S.navFooter}>今後のページをここに追加</div>
            </nav>
          )}

          <div style={S.logoMark}>MD</div>
          <div>
            <h1 style={S.headerTitle}>Markdown Vault</h1>
            <p style={S.headerSub}>
              {NAV_ITEMS.find((n) => n.id === currentPage)?.label}
              {currentPage === "browse" && ` · ${files.length} ファイル`}
            </p>
          </div>
        </div>
      </header>

      <div style={S.body}>
        {currentPage === "browse" && <BrowsePage files={files} allTags={allTags} selectedFile={selectedFile} setSelectedFile={setSelectedFile} removeFile={removeFile} onNavigateUpload={() => navigate("upload")} />}
        {currentPage === "upload" && <UploadPage files={files} handleFileUpload={handleFileUpload} removeFile={removeFile} onNavigateBrowse={() => navigate("browse")} />}
        {currentPage === "tags" && <TagsPage files={files} allTags={allTags} addTag={addTag} removeTag={removeTag} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE: Browse
// ═══════════════════════════════════════════════════════════
function BrowsePage({ files, allTags, selectedFile, setSelectedFile, removeFile, onNavigateUpload }) {
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFilter = (tag) => setActiveFilters((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  const filteredFiles = files.filter((f) => {
    const matchTags = activeFilters.length === 0 || activeFilters.some((t) => f.tags.includes(t));
    const matchSearch = !searchQuery || f.title.toLowerCase().includes(searchQuery.toLowerCase()) || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTags && matchSearch;
  });

  if (files.length === 0) {
    return (
      <div style={S.emptyFull}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📑</div>
        <h3 style={S.emptyTitle}>ファイルがまだありません</h3>
        <p style={S.emptyDesc}>ハンバーガーメニューから「アップロード」ページでファイルを追加してください</p>
        <button style={S.primaryBtn} className="hover-btn" onClick={onNavigateUpload}>アップロードへ →</button>
      </div>
    );
  }

  return (
    <div style={S.browseLayout}>
      <aside style={S.sidebar}>
        <div style={S.searchBox}>
          <span style={{ fontSize: 14, opacity: 0.5 }}>🔍</span>
          <input style={S.searchInput} placeholder="ファイル名・内容で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchQuery && <button style={S.searchClear} onClick={() => setSearchQuery("")}>✕</button>}
        </div>

        {allTags.length > 0 && (
          <div style={S.filterSection}>
            <div style={S.filterHeader}>
              <span style={S.filterLabel}>タグで絞り込み</span>
              {activeFilters.length > 0 && <button style={S.clearFiltersBtn} onClick={() => setActiveFilters([])}>クリア</button>}
            </div>
            <div style={S.filterTags}>
              {allTags.map((tag) => {
                const c = getTagColor(tag, allTags);
                const active = activeFilters.includes(tag);
                return (
                  <button key={tag} className="filter-tag" style={{ ...S.filterTag, borderColor: c.border, background: active ? c.border : "transparent", color: active ? "#0d0d1a" : c.text }} onClick={() => toggleFilter(tag)}>
                    {tag}
                    <span style={{ fontSize: 10, opacity: 0.6 }}>{files.filter((f) => f.tags.includes(tag)).length}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={S.fileList}>
          {activeFilters.length > 0 && <div style={S.resultCount}>{filteredFiles.length} / {files.length} 件</div>}
          {filteredFiles.length === 0 && <p style={S.emptyFilter}>条件に一致するファイルがありません</p>}
          {filteredFiles.map((file) => (
            <div key={file.id} className="file-card" style={{ ...S.fileCard, ...(selectedFile?.id === file.id ? S.fileCardActive : {}) }} onClick={() => setSelectedFile(file)}>
              <div style={S.fileCardHeader}>
                <span style={S.fileTitle}>{file.title}</span>
                <button style={S.deleteBtn} onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}>✕</button>
              </div>
              <span style={S.fileName}>{file.name}</span>
              {file.tags.length > 0 && (
                <div style={S.fileTagRow}>
                  {file.tags.map((tag) => {
                    const c = getTagColor(tag, allTags);
                    return <span key={tag} style={{ ...S.tagChip, borderColor: c.border + "80", color: c.text }}>{tag}</span>;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main style={S.content}>
        {selectedFile ? (
          <div className="fade-in">
            <div style={S.contentHeader}>
              <h2 style={S.contentTitle}>{selectedFile.title}</h2>
              <span style={S.contentFileName}>{selectedFile.name}</span>
            </div>
            {selectedFile.tags.length > 0 && (
              <div style={S.contentTags}>
                {selectedFile.tags.map((tag) => {
                  const c = getTagColor(tag, allTags);
                  return <span key={tag} style={{ ...S.contentTag, borderColor: c.border, color: c.text }}>{tag}</span>;
                })}
              </div>
            )}
            <div style={S.markdownBody} dangerouslySetInnerHTML={{ __html: parseMd(selectedFile.content) }} />
          </div>
        ) : (
          <div style={S.emptyFull}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>←</div>
            <p style={{ color: "#5a5a7a", fontSize: 14 }}>左のリストからファイルを選択してください</p>
          </div>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE: Upload
// ═══════════════════════════════════════════════════════════
function UploadPage({ files, handleFileUpload, removeFile, onNavigateBrowse }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  return (
    <div style={S.uploadPage}>
      <div style={{ ...S.dropZone, ...(dragOver ? S.dropZoneActive : {}) }} onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <p style={{ fontSize: 16, color: "#c0c0d8", marginBottom: 6 }}>ファイルをドラッグ＆ドロップ</p>
        <p style={{ fontSize: 13, color: "#5a5a7a", marginBottom: 20 }}>.md / .markdown / .txt に対応</p>
        <button style={S.primaryBtn} className="hover-btn" onClick={() => fileInputRef.current?.click()}>ファイルを選択</button>
        <input ref={fileInputRef} type="file" accept=".md,.markdown,.txt" multiple style={{ display: "none" }} onChange={(e) => handleFileUpload(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div style={S.uploadedSection}>
          <div style={S.sectionHeader}>
            <h3 style={S.sectionTitle}>アップロード済み ({files.length})</h3>
            <button style={S.secondaryBtn} className="hover-btn" onClick={onNavigateBrowse}>一覧で見る →</button>
          </div>
          <div style={S.uploadedGrid}>
            {[...files].reverse().map((file) => (
              <div key={file.id} style={S.uploadedCard}>
                <div style={S.uploadedCardHeader}>
                  <span style={S.uploadedCardTitle}>{file.title}</span>
                  <button style={S.deleteBtn} onClick={() => removeFile(file.id)}>✕</button>
                </div>
                <span style={S.fileName}>{file.name}</span>
                {file.tags.length > 0 && (
                  <div style={{ ...S.fileTagRow, marginTop: 6 }}>
                    {file.tags.map((tag) => (<span key={tag} style={{ ...S.tagChipSmall }}>{tag}</span>))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGE: Tags
// ═══════════════════════════════════════════════════════════
function TagsPage({ files, allTags, addTag, removeTag }) {
  const [editingFile, setEditingFile] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowPresets(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (files.length === 0) {
    return (
      <div style={S.emptyFull}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⬡</div>
        <h3 style={S.emptyTitle}>ファイルがまだありません</h3>
        <p style={S.emptyDesc}>先にアップロードページからファイルを追加してください</p>
      </div>
    );
  }

  return (
    <div style={S.tagsPage}>
      <div style={S.tagsPageHeader}>
        <h2 style={S.pageTitle}>タグ管理</h2>
        <p style={{ color: "#5a5a7a", fontSize: 13 }}>各ファイルにタグを追加・削除できます</p>
      </div>

      {allTags.length > 0 && (
        <div style={S.tagOverview}>
          <span style={S.filterLabel}>登録済みタグ</span>
          <div style={{ ...S.filterTags, marginTop: 8 }}>
            {allTags.map((tag) => {
              const c = getTagColor(tag, allTags);
              return (
                <span key={tag} style={{ ...S.filterTag, borderColor: c.border, color: c.text, cursor: "default" }}>
                  {tag}
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{files.filter((f) => f.tags.includes(tag)).length}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div style={S.tagFileList}>
        {files.map((file) => {
          const isEditing = editingFile === file.id;
          return (
            <div key={file.id} style={S.tagFileCard}>
              <div style={S.tagFileHeader} onClick={() => { setEditingFile(isEditing ? null : file.id); setTagInput(""); }}>
                <div>
                  <span style={S.fileTitle}>{file.title}</span>
                  <span style={S.fileName}>{file.name}</span>
                </div>
                <span style={{ color: "#4a4a6a", fontSize: 12 }}>{isEditing ? "▲" : "▼"}</span>
              </div>
              <div style={S.fileTagRow}>
                {file.tags.map((tag) => {
                  const c = getTagColor(tag, allTags);
                  return (
                    <span key={tag} style={{ ...S.editableTag, borderColor: c.border + "80", color: c.text }}>
                      {tag}
                      {isEditing && <button style={S.removeTagBtn} onClick={() => removeTag(file.id, tag)}>×</button>}
                    </span>
                  );
                })}
                {file.tags.length === 0 && <span style={{ fontSize: 12, color: "#4a4a6a" }}>タグなし</span>}
              </div>
              {isEditing && (
                <div style={S.tagEditorInline} className="fade-in">
                  <div style={S.tagInputRow}>
                    <input style={S.tagInput} placeholder="タグ名を入力して Enter..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { addTag(file.id, tagInput); setTagInput(""); } }} autoFocus />
                    <div style={{ position: "relative" }} ref={dropdownRef}>
                      <button style={S.presetBtn} onClick={() => setShowPresets(!showPresets)}>プリセット ▾</button>
                      {showPresets && (
                        <div style={S.presetDropdown} className="fade-in">
                          {PRESET_TAGS.filter((t) => !file.tags.includes(t)).map((tag) => (
                            <button key={tag} className="preset-item" style={S.presetItem} onClick={() => { addTag(file.id, tag); setShowPresets(false); }}>{tag}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GLOBAL CSS
// ═══════════════════════════════════════════════════════════
const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0d0d1a; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0d0d1a; }
::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #3a3a5a; }
.md-h1 { font-size: 1.8em; font-weight: 700; margin: 1em 0 0.5em; color: #e8e8f0; border-bottom: 1px solid #2a2a4a; padding-bottom: 0.3em; }
.md-h2 { font-size: 1.4em; font-weight: 600; margin: 0.9em 0 0.4em; color: #d0d0e0; }
.md-h3 { font-size: 1.15em; font-weight: 500; margin: 0.8em 0 0.3em; color: #b8b8d0; }
.md-p { margin: 0.5em 0; line-height: 1.75; color: #a0a0b8; }
.md-code { background: #1a1a30; padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.88em; color: #e94560; }
.md-pre { background: #0a0a16; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 1em 0; border: 1px solid #1a1a30; }
.md-pre code { color: #c0c0d8; font-family: 'JetBrains Mono', monospace; font-size: 0.88em; }
.md-ul, .md-ol { padding-left: 1.5em; margin: 0.5em 0; }
.md-li, .md-li-num { margin: 0.3em 0; line-height: 1.6; color: #a0a0b8; }
.md-hr { border: none; border-top: 1px solid #2a2a4a; margin: 1.5em 0; }
.md-link { color: #e94560; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
.md-link:hover { border-bottom-color: #e94560; }
.file-card { transition: all 0.2s ease; }
.file-card:hover { transform: translateY(-1px); background: #16162a !important; }
.filter-tag { transition: all 0.15s ease; cursor: pointer; }
.filter-tag:hover { transform: scale(1.05); }
.hover-btn { transition: all 0.2s ease !important; }
.hover-btn:hover { filter: brightness(1.2) !important; transform: translateY(-1px) !important; }
.nav-item { transition: all 0.15s ease; }
.nav-item:hover { background: #1a1a30 !important; }
.preset-item { transition: background 0.15s; }
.preset-item:hover { background: #1a1a30 !important; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.fade-in { animation: fadeIn 0.2s ease forwards; }
`;

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const font = "'Noto Sans JP', sans-serif";
const S = {
  container: { fontFamily: font, background: "#0d0d1a", color: "#e0e0f0", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #1a1a30", background: "#0b0b18", flexShrink: 0, position: "relative", zIndex: 100 },
  headerLeft: { display: "flex", alignItems: "center", gap: 12, position: "relative" },
  hamburger: { background: "none", border: "1px solid #2a2a4a", borderRadius: 8, padding: "8px 9px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  logoMark: { width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg, #e94560, #c23152)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, letterSpacing: 1, color: "#fff", flexShrink: 0 },
  headerTitle: { fontSize: 16, fontWeight: 700, letterSpacing: 0.3 },
  headerSub: { fontSize: 11, color: "#5a5a7a", marginTop: 1 },
  navDropdown: { position: "absolute", top: "calc(100% + 8px)", left: 0, background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 12, padding: 6, width: 220, zIndex: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" },
  navItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", color: "#a0a0b8", padding: "10px 14px", fontSize: 14, fontWeight: 400, borderRadius: 8, cursor: "pointer", fontFamily: font, textAlign: "left" },
  navItemActive: { background: "#1a1a30", color: "#e94560", fontWeight: 500 },
  navIcon: { fontSize: 16, width: 22, textAlign: "center" },
  navDivider: { height: 1, background: "#1a1a30", margin: "6px 8px" },
  navFooter: { padding: "8px 14px", fontSize: 11, color: "#3a3a5a", fontStyle: "italic" },
  body: { flex: 1, overflow: "hidden", display: "flex" },
  browseLayout: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: 340, borderRight: "1px solid #1a1a30", display: "flex", flexDirection: "column", flexShrink: 0, background: "#0d0d1a" },
  content: { flex: 1, overflowY: "auto", padding: "32px 48px", background: "#10101e" },
  searchBox: { padding: "12px 16px", borderBottom: "1px solid #1a1a30", display: "flex", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, background: "transparent", border: "none", color: "#e0e0f0", fontSize: 13, outline: "none", fontFamily: font },
  searchClear: { background: "none", border: "none", color: "#6a6a8a", cursor: "pointer", fontSize: 12, padding: "2px 6px" },
  filterSection: { padding: "12px 16px", borderBottom: "1px solid #1a1a30" },
  filterHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  filterLabel: { fontSize: 11, fontWeight: 500, color: "#6a6a8a", textTransform: "uppercase", letterSpacing: 1 },
  clearFiltersBtn: { background: "none", border: "none", color: "#e94560", cursor: "pointer", fontSize: 11, fontFamily: font },
  filterTags: { display: "flex", flexWrap: "wrap", gap: 6 },
  filterTag: { padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "1px solid", display: "flex", alignItems: "center", gap: 6, fontFamily: font, background: "none" },
  resultCount: { fontSize: 11, color: "#5a5a7a", padding: "8px 14px 4px", textAlign: "right" },
  fileList: { flex: 1, overflowY: "auto", padding: 8 },
  fileCard: { padding: "12px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: "transparent", border: "1px solid transparent" },
  fileCardActive: { background: "#16162a", borderColor: "#2a2a4a" },
  fileCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  fileTitle: { fontSize: 14, fontWeight: 500, lineHeight: 1.4 },
  fileName: { fontSize: 11, color: "#5a5a7a", display: "block", marginTop: 2 },
  deleteBtn: { background: "none", border: "none", color: "#4a4a6a", cursor: "pointer", fontSize: 12, padding: "2px 6px", borderRadius: 4, flexShrink: 0 },
  fileTagRow: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, alignItems: "center" },
  tagChip: { padding: "2px 8px", borderRadius: 4, fontSize: 11, border: "1px solid", fontWeight: 500 },
  tagChipSmall: { padding: "1px 6px", borderRadius: 3, fontSize: 10, border: "1px solid #2a2a4a", color: "#6a6a8a" },
  emptyFilter: { textAlign: "center", color: "#5a5a7a", fontSize: 13, padding: "24px 16px" },
  contentHeader: { marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #1a1a30" },
  contentTitle: { fontSize: 24, fontWeight: 700, lineHeight: 1.3 },
  contentFileName: { fontSize: 12, color: "#5a5a7a", marginTop: 4, display: "block" },
  contentTags: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 },
  contentTag: { padding: "4px 12px", borderRadius: 6, fontSize: 12, border: "1px solid", fontWeight: 500 },
  markdownBody: { lineHeight: 1.75, fontSize: 15 },
  uploadPage: { flex: 1, overflowY: "auto", padding: "40px", display: "flex", flexDirection: "column", alignItems: "center" },
  dropZone: { border: "2px dashed #2a2a4a", borderRadius: 16, padding: "56px 64px", textAlign: "center", maxWidth: 520, width: "100%", background: "#0b0b18", transition: "all 0.2s" },
  dropZoneActive: { borderColor: "#e94560", background: "#1a0a10" },
  uploadedSection: { width: "100%", maxWidth: 700, marginTop: 40 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 600 },
  uploadedGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  uploadedCard: { background: "#12122a", border: "1px solid #1a1a30", borderRadius: 10, padding: "12px 14px" },
  uploadedCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  uploadedCardTitle: { fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
  tagsPage: { flex: 1, overflowY: "auto", padding: "32px 40px" },
  tagsPageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  tagOverview: { marginBottom: 28, padding: "16px 20px", background: "#0b0b18", borderRadius: 12, border: "1px solid #1a1a30" },
  tagFileList: { display: "flex", flexDirection: "column", gap: 8 },
  tagFileCard: { background: "#12122a", border: "1px solid #1a1a30", borderRadius: 12, padding: "14px 18px" },
  tagFileHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: 8 },
  editableTag: { padding: "3px 8px", borderRadius: 5, fontSize: 12, border: "1px solid", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 },
  removeTagBtn: { background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 15, padding: 0, lineHeight: 1, opacity: 0.6 },
  tagEditorInline: { marginTop: 12, padding: "10px 0 0", borderTop: "1px solid #1a1a30" },
  tagInputRow: { display: "flex", gap: 8 },
  tagInput: { flex: 1, background: "#0d0d1a", border: "1px solid #2a2a4a", color: "#e0e0f0", padding: "8px 12px", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: font },
  presetBtn: { background: "#0d0d1a", border: "1px solid #2a2a4a", color: "#6a6a8a", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: font, whiteSpace: "nowrap" },
  presetDropdown: { position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 8, padding: 4, zIndex: 50, width: 150, maxHeight: 220, overflowY: "auto" },
  presetItem: { display: "block", width: "100%", background: "none", border: "none", color: "#a0a0b8", padding: "7px 12px", fontSize: 13, textAlign: "left", cursor: "pointer", borderRadius: 4, fontFamily: font },
  primaryBtn: { background: "#e94560", border: "none", color: "#fff", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: font },
  secondaryBtn: { background: "none", border: "1px solid #2a2a4a", color: "#a0a0b8", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: font },
  emptyFull: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 500, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: "#5a5a7a", maxWidth: 320, marginBottom: 20 },
};
