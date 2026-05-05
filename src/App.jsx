import { useState, useEffect } from "react";

const SHEET_URL = "https://opensheet.elk.sh/10tWEt77gKq5CDpfgBjeyFHA-zAjtaoHSpQ4OgtsV1dk/1";
const ADMIN_PASSWORD = "admin2026";
const HOURS_48 = 48 * 60 * 60 * 1000;
const G = "#C8930A";
const GB = "#C8930A";

function parseCSV(text) {
  try {
    const data = JSON.parse(text);
    return data.map((row, i) => ({ _id: i + 2, ...row }));
  } catch {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
    return lines.slice(1).map((line, i) => {
      const vals = []; let cur = "", inQ = false;
      for (let c of line) {
        if (c === '"') inQ = !inQ;
        else if (c === ',' && !inQ) { vals.push(cur.trim()); cur = ""; }
        else cur += c;
      }
      vals.push(cur.trim());
      const obj = { _id: i + 2 };
      headers.forEach((h, idx) => { obj[h] = (vals[idx] || "").replace(/"/g, "").trim(); });
      return obj;
    }).filter(r => headers.some(h => r[h]));
  }
}

const getRes = () => { try { return JSON.parse(localStorage.getItem("reservas") || "[]"); } catch { return []; } };
const saveRes = (d) => { try { localStorage.setItem("reservas", JSON.stringify(d)); } catch {} };
const isExpired = (t) => Date.now() > t;
const timeLeft = (t) => {
  const d = t - Date.now();
  if (d <= 0) return "Expirada";
  return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
};

export default function App() {
  const [screen, setScreen] = useState("list");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", email: "", tel: "" });
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [reservedProduct, setReservedProduct] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch(SHEET_URL)
      .then(r => r.text())
      .then(t => { setProducts(parseCSV(t)); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
    setReservations(getRes());
    const iv = setInterval(() => setTick(x => x + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const valid = reservations.filter(r => r.paid || !isExpired(r.expiresAt));
    if (valid.length !== reservations.length) { setReservations(valid); saveRes(valid); }
  }, [tick]);

  const cols = products[0] ? Object.keys(products[0]).filter(k => k !== "_id") : [];
  const nameCol = cols.find(c => /nombre.?prod|product.?name/i.test(c)) || cols.find(c => /name|nombre/i.test(c)) || cols[2] || cols[0];
  const catCol = cols.find(c => /categ/i.test(c));
  const kgCol = cols.find(c => /^kg/i.test(c) || /^peso/i.test(c));
  const gramCol = cols.find(c => /gram/i.test(c));
  const formatCol = cols.find(c => /format|medida|ancho|dim/i.test(c));
  const hojaCol = cols.find(c => /hoja/i.test(c));
  const fabCol = cols.find(c => /fabr|marca/i.test(c));
  const entradaCol = cols.find(c => /entrada/i.test(c));
  const pastaCol = cols.find(c => /pasta/i.test(c));
  const descCol = cols.find(c => /^desc/i.test(c));

  const reservedIds = reservations.filter(r => r.paid || !isExpired(r.expiresAt)).flatMap(r => r.items);
  const availableProducts = products.filter(p => !reservedIds.includes(p._id));
  const filteredProducts = availableProducts.filter(p =>
    !search || JSON.stringify(p).toLowerCase().includes(search.toLowerCase())
  );

  const doReserve = () => {
    if (!formData.nombre.trim() || !formData.email.trim()) { setFormError("Rellena nombre y email."); return; }
    if (!/\S+@\S+\.\S+/.test(formData.email)) { setFormError("Email no válido."); return; }
    const newR = { id: Date.now(), ...formData, items: reservedProduct ? [reservedProduct._id] : [], createdAt: Date.now(), expiresAt: Date.now() + HOURS_48, paid: false };
    const updated = [...reservations, newR];
    setReservations(updated); saveRes(updated);
    setFormOpen(false); setFormData({ nombre: "", email: "", tel: "" }); setFormError(""); setReservedProduct(null);
    setSuccessMsg("✓ Reserva confirmada. Te contactaremos en 48h.");
    setTimeout(() => setSuccessMsg(""), 6000);
    setScreen("list");
  };

  const markPaid = (id) => { const u = reservations.map(r => r.id === id ? { ...r, paid: true } : r); setReservations(u); saveRes(u); };
  const deleteR = (id) => { const u = reservations.filter(r => r.id !== id); setReservations(u); saveRes(u); };
  const pendingCount = reservations.filter(r => !r.paid && !isExpired(r.expiresAt)).length;

  const S = {
    app: { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f2f2f7", fontFamily: "-apple-system, 'SF Pro Display', 'Segoe UI', sans-serif" },
    header: { background: GB, padding: "12px 16px 0" },
    headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    headerTitle: { color: "#fff", fontSize: 28, fontWeight: 700, letterSpacing: -0.5 },
    headerAdd: { background: "#fff", borderRadius: 20, padding: "6px 16px", color: GB, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" },
    searchWrap: { position: "relative", paddingBottom: 12 },
    searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-60%)", fontSize: 15, opacity: 0.7 },
    searchInput: { width: "100%", background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 10, padding: "9px 14px 9px 36px", color: "#fff", fontSize: 16, outline: "none" },
    row: { background: "#fff", padding: "13px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
    rowName: { fontSize: 15, fontWeight: 600, color: "#000", marginBottom: 2, lineHeight: 1.3 },
    rowSub: { fontSize: 13, color: "#8e8e93" },
    detailHeader: { background: GB, padding: "14px 16px", display: "flex", alignItems: "center" },
    backBtn: { background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", padding: 0, lineHeight: 1 },
    btnGold: { background: GB, color: "#fff", border: "none", borderRadius: 10, padding: "13px 16px", fontSize: 15, fontWeight: 600, cursor: "pointer", flex: 1 },
    btnWhite: { background: "#fff", color: "#000", border: "1px solid #e0e0e0", borderRadius: 10, padding: "13px 16px", fontSize: 15, fontWeight: 500, cursor: "pointer", flex: 1 },
    detailRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid #f2f2f7" },
    bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #e8e8e8", display: "flex", paddingBottom: 20, paddingTop: 8, zIndex: 100 },
    navItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "flex-end" },
    modalSheet: { background: "#fff", borderRadius: "16px 16px 0 0", padding: "0 16px 40px", width: "100%", maxHeight: "92vh", overflowY: "auto" },
    modalHandle: { width: 36, height: 4, background: "#d1d1d6", borderRadius: 2, margin: "10px auto 16px" },
    inp: { width: "100%", padding: "12px 14px", border: "1px solid #e0e0e0", borderRadius: 10, fontSize: 16, outline: "none", background: "#f9f9f9", fontFamily: "inherit" },
  };

  return (
    <div style={S.app}>
      {screen === "list" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={S.header}>
            <div style={S.headerTop}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 2 }}>☰</div>
                <div style={S.headerTitle}>Productos</div>
              </div>
              <button style={S.headerAdd}>+ Add</button>
            </div>
            <div style={S.searchWrap}>
              <span style={S.searchIcon}>🔍</span>
              <input style={S.searchInput} placeholder="Buscar" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {successMsg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>{successMsg}</div>}
          {loading && <div style={{ textAlign: "center", padding: 48, color: "#8e8e93" }}>⏳ Cargando productos...</div>}
          {loadError && <div style={{ background: "#fee2e2", color: "#991b1b", margin: 16, borderRadius: 12, padding: 16, textAlign: "center", fontSize: 14 }}>Error al cargar productos.</div>}
          {!loading && !loadError && filteredProducts.map(p => (
            <div key={p._id} style={S.row} onClick={() => { setSelected(p); setScreen("detail"); }}>
              <div style={{ flex: 1 }}>
                <div style={S.rowName}>{p[nameCol]}{gramCol && p[gramCol] ? ` ${p[gramCol]} gr/m2` : ""}</div>
                <div style={S.rowSub}>{formatCol && p[formatCol] ? p[formatCol] : ""}{kgCol && p[kgCol] ? `    ${p[kgCol]}Kgs` : ""}</div>
              </div>
              <div style={{ color: "#c7c7cc", fontSize: 18, letterSpacing: 1.5 }}>···</div>
            </div>
          ))}
          {!loading && !loadError && filteredProducts.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#8e8e93" }}>📦 No hay productos</div>
          )}
        </div>
      )}

      {screen === "detail" && selected && (
        <div style={{ paddingBottom: 100, background: "#fff", minHeight: "100vh" }}>
          <div style={S.detailHeader}>
            <button style={S.backBtn} onClick={() => setScreen("list")}>‹</button>
          </div>
          <div style={{ padding: "20px 16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{selected[nameCol]}</h1>
                <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 16, textTransform: "uppercase" }}>
                  {catCol && selected[catCol] ? selected[catCol] + "  " : ""}
                  {gramCol && selected[gramCol] ? selected[gramCol] + " gr/m2  " : ""}
                  {formatCol && selected[formatCol] ? selected[formatCol] : ""}
                </p>
              </div>
              <button style={{ background: GB, color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✏️ Edit</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button style={S.btnGold} onClick={() => { setReservedProduct(selected); setFormOpen(true); }}>Reservar Produ...</button>
              <button style={S.btnWhite}>Reserva realiza...</button>
            </div>
            {kgCol && selected[kgCol] && <div style={S.detailRow}><span>Kgs</span><span style={{ color: "#8e8e93" }}>{selected[kgCol]}</span></div>}
            {hojaCol && selected[hojaCol] && <div style={S.detailRow}><span>Hojas</span><span style={{ color: "#8e8e93" }}>{Number(selected[hojaCol]).toLocaleString("es-ES")}</span></div>}
            {fabCol && selected[fabCol] && <div style={S.detailRow}><span>Fabricante</span><span style={{ color: "#8e8e93" }}>{selected[fabCol]}</span></div>}
            {descCol && selected[descCol] && <div style={S.detailRow}><span>Descripcion</span><span style={{ color: "#8e8e93" }}>{selected[descCol]}</span></div>}
            {pastaCol && selected[pastaCol] && <div style={S.detailRow}><span>Tipo de Pasta</span><span style={{ color: "#8e8e93" }}>{selected[pastaCol]}</span></div>}
            {entradaCol && selected[entradaCol] && <div style={S.detailRow}><span>Entrada</span><span style={{ color: "#8e8e93" }}>{selected[entradaCol]}</span></div>}
          </div>
          <div style={{ padding: "24px 16px 0" }}>
            <button style={{ ...S.btnGold, borderRadius: 12, padding: "15px 16px", fontSize: 16 }} onClick={() => { setReservedProduct(selected); setFormOpen(true); }}>Reservar Producto</button>
          </div>
        </div>
      )}

      {screen === "reservas" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={S.header}>
            <div style={S.headerTop}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 2 }}>☰</div>
                <div style={S.headerTitle}>Mis Reservas</div>
              </div>
            </div>
            <div style={{ paddingBottom: 12 }} />
          </div>
          {reservations.filter(r => !r.paid && !isExpired(r.expiresAt)).length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#8e8e93" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div>No tienes reservas activas</div>
            </div>
          ) : reservations.filter(r => !r.paid && !isExpired(r.expiresAt)).map(res => {
            const resProds = res.items.map(id => products.find(p => p._id === id)).filter(Boolean);
            return (
              <div key={res.id} style={{ background: "#fff", margin: "10px 16px", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{res.nombre}</span>
                  <span style={{ fontSize: 12, background: "#FEF3C7", color: G, padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>⏱ {timeLeft(res.expiresAt)}</span>
                </div>
                <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 8 }}>{res.email}</p>
                {resProds.map(p => <div key={p._id} style={{ fontSize: 13, color: "#555" }}>• {p[nameCol]}{kgCol && p[kgCol] ? ` · ${p[kgCol]}Kg` : ""}</div>)}
              </div>
            );
          })}
        </div>
      )}

      {screen === "admin" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={S.header}>
            <div style={S.headerTop}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 2 }}>☰</div>
                <div style={S.headerTitle}>Admin</div>
              </div>
            </div>
            <div style={{ paddingBottom: 12 }} />
          </div>
          {!adminAuth ? (
            <div style={{ padding: 20 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Acceso Admin</h2>
                <input style={{ ...S.inp, marginBottom: 12 }} type="password" placeholder="Contraseña" value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Contraseña incorrecta."); }}} />
                {adminError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{adminError}</p>}
                <button style={{ ...S.btnGold, borderRadius: 12 }} onClick={() => { adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Contraseña incorrecta."); }}>Entrar</button>
                <p style={{ fontSize: 11, color: "#c7c7cc", marginTop: 14, textAlign: "center" }}>Contraseña: admin2026</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 14 }}>{reservations.length} reservas · {reservations.filter(r => r.paid).length} pagadas</p>
              {reservations.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "#8e8e93" }}>📋 No hay reservas</div>
              ) : reservations.map(res => {
                const expired = !res.paid && isExpired(res.expiresAt);
                const resProds = res.items.map(id => products.find(p => p._id === id)).filter(Boolean);
                return (
                  <div key={res.id} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{res.nombre}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: res.paid ? "#d1fae5" : expired ? "#fee2e2" : "#FEF3C7", color: res.paid ? "#065f46" : expired ? "#991b1b" : G }}>
                        {res.paid ? "✓ Pagada" : expired ? "Expirada" : "Pendiente"}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>{res.email}</p>
                    {res.tel && <p style={{ fontSize: 13, color: "#8e8e93" }}>📞 {res.tel}</p>}
                    {!res.paid && !expired && <p style={{ fontSize: 12, color: G, fontWeight: 600, marginTop: 4 }}>⏱ {timeLeft(res.expiresAt)}</p>}
                    <div style={{ background: "#f9f9f9", borderRadius: 8, padding: "10px 12px", margin: "10px 0" }}>
                      {resProds.map(p => <div key={p._id} style={{ fontSize: 13, color: "#555" }}>• {p[nameCol]}{kgCol && p[kgCol] ? ` · ${p[kgCol]}Kg` : ""}</div>)}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!res.paid && !expired && (
                        <button onClick={() => markPaid(res.id)} style={{ flex: 2, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✓ Marcar pagada</button>
                      )}
                      <button onClick={() => deleteR(res.id)} style={{ flex: 1, background: "#fff", color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={S.bottomNav}>
        <div style={S.navItem} onClick={() => setScreen("list")}>
          <span style={{ fontSize: 24, filter: screen === "list" ? "none" : "grayscale(1) opacity(0.4)" }}>🛒</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: screen === "list" ? GB : "#8e8e93" }}>Productos</span>
        </div>
        <div style={S.navItem} onClick={() => setScreen("reservas")}>
          <span style={{ fontSize: 24, filter: screen === "reservas" ? "none" : "grayscale(1) opacity(0.4)" }}>☑️</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: screen === "reservas" ? GB : "#8e8e93" }}>Mis Reservas{pendingCount > 0 ? ` (${pendingCount})` : ""}</span>
        </div>
        <div style={S.navItem} onClick={() => { setScreen("admin"); setAdminAuth(false); setAdminPass(""); }}>
          <span style={{ fontSize: 24, filter: screen === "admin" ? "none" : "grayscale(1) opacity(0.4)" }}>⚙️</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: screen === "admin" ? GB : "#8e8e93" }}>Admin</span>
        </div>
      </div>

      {formOpen && (
        <div style={S.modal} onClick={() => setFormOpen(false)}>
          <div style={S.modalSheet} onClick={e => e.stopPropagation()}>
            <div style={S.modalHandle} />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Reservar Producto</h2>
            {reservedProduct && (
              <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "10px 14px", marginBottom: 16, marginTop: 8 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#92400e" }}>{reservedProduct[nameCol]}</p>
                <p style={{ fontSize: 13, color: "#a67c00" }}>{kgCol && reservedProduct[kgCol] ? reservedProduct[kgCol] + " Kg" : ""}{formatCol && reservedProduct[formatCol] ? " · " + reservedProduct[formatCol] : ""}</p>
              </div>
            )}
            <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 20 }}>Reserva válida <strong>48 horas</strong>. Te contactamos para el pago.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Nombre *</label>
                <input style={S.inp} placeholder="Tu nombre completo" value={formData.nombre} onChange={e => setFormData(d => ({ ...d, nombre: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Email *</label>
                <input style={S.inp} type="email" placeholder="tu@email.com" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Teléfono</label>
                <input style={S.inp} type="tel" placeholder="600 000 000" value={formData.tel} onChange={e => setFormData(d => ({ ...d, tel: e.target.value }))} />
              </div>
            </div>
            {formError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{formError}</p>}
            <button style={{ ...S.btnGold, borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 10 }} onClick={doReserve}>Confirmar Reserva</button>
            <button style={{ ...S.btnWhite, borderRadius: 12, padding: 14, fontSize: 15 }} onClick={() => setFormOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
