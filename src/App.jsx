import { useState, useEffect } from "react";

const SHEET_URL = "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://docs.google.com/spreadsheets/d/e/2PACX-1vRzQR8BMfTHHNXKVfosVRTTEaPCxXVzBqruct9ZUDpOAv1O4ht6y36F_5fKxZW3-a9772MvuvqaMAk_/pub?gid=1760846900&single=true&output=csv"));
const ADMIN_PASSWORD = "admin2026";
const HOURS_48 = 48 * 60 * 60 * 1000;
const GOLD = "#C8930A";
const GOLD_BG = "#f5a623";
const GOLD_LIGHT = "#FEF3C7";

function parseCSV(text) {
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
  const nameCol = cols.find(c => /nombre|product.?name|name/i.test(c)) || cols[2] || cols[0];
  const catCol = cols.find(c => /categ/i.test(c));
  const kgCol = cols.find(c => /^kg/i.test(c) || /peso/i.test(c));
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

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f5f5f5", fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif", position: "relative" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .gh { background: ${GOLD_BG}; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; height: 56px; }
        .ht { color: #fff; font-size: 22px; font-weight: 700; }
        .sb { background: rgba(255,255,255,0.25); border: none; border-radius: 10px; padding: 8px 14px 8px 36px; color: #fff; font-size: 15px; width: 100%; outline: none; }
        .sb::placeholder { color: rgba(255,255,255,0.7); }
        .pr { background: #fff; padding: 14px 20px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .pr:active { background: #fafafa; }
        .pn { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 3px; line-height: 1.3; }
        .ps { font-size: 13px; color: #888; }
        .bg { background: ${GOLD_BG}; color: #fff; border: none; border-radius: 12px; padding: 14px 20px; font-size: 16px; font-weight: 600; width: 100%; cursor: pointer; }
        .bo { background: #fff; color: #333; border: 1.5px solid #ddd; border-radius: 12px; padding: 13px 20px; font-size: 16px; font-weight: 500; width: 100%; cursor: pointer; }
        .dr { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 15px; }
        .inp { width: 100%; padding: 12px 16px; border: 1.5px solid #e0e0e0; border-radius: 10px; font-size: 15px; outline: none; font-family: inherit; background: #fafafa; }
        .inp:focus { border-color: ${GOLD_BG}; background: #fff; }
        .bn { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: #fff; border-top: 1px solid #e8e8e8; display: flex; padding: 8px 0 20px; z-index: 100; }
        .ni { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 0; }
        .nl { font-size: 11px; font-weight: 500; }
        .ov { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: flex-end; }
        .sh { background: #fff; border-radius: 20px 20px 0 0; padding: 24px 20px 40px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .shh { width: 40px; height: 4px; background: #ddd; border-radius: 2px; margin: 0 auto 20px; }
      `}</style>

      {screen === "list" && (
        <div style={{ paddingBottom: 80 }}>
          <div className="gh"><span className="ht">Productos</span></div>
          <div className="gh" style={{ height: 50 }}>
            <div style={{ position: "relative", width: "100%" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>🔍</span>
              <input className="sb" placeholder="Buscar" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {successMsg && <div style={{ background: "#D1FAE5", color: "#065F46", padding: "12px 20px", fontSize: 14, fontWeight: 500 }}>{successMsg}</div>}
          {loading && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>⏳ Cargando...</div>}
          {loadError && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: 20, margin: 16, borderRadius: 10, textAlign: "center", fontSize: 14 }}>Error al cargar productos. Verifica la conexión.</div>}
          {!loading && filteredProducts.map(p => (
            <div key={p._id} className="pr" onClick={() => { setSelected(p); setScreen("detail"); }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <div className="pn">{p[nameCol]}{gramCol && p[gramCol] ? ` ${p[gramCol]} gr/m2` : ""}</div>
                <div className="ps">{formatCol && p[formatCol] ? p[formatCol] : ""}{kgCol && p[kgCol] ? `   ${p[kgCol]}Kgs` : ""}</div>
              </div>
              <span style={{ color: "#ccc", fontSize: 20 }}>···</span>
            </div>
          ))}
          {!loading && !loadError && filteredProducts.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "#aaa" }}>📦 No hay productos disponibles</div>
          )}
        </div>
      )}

      {screen === "detail" && selected && (
        <div style={{ paddingBottom: 100 }}>
          <div className="gh">
            <button onClick={() => setScreen("list")} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
          </div>
          <div style={{ padding: "20px 20px 0" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{selected[nameCol]}</h1>
            <p style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>
              {catCol && selected[catCol] ? selected[catCol] + "  " : ""}
              {gramCol && selected[gramCol] ? selected[gramCol] + " gr/m2  " : ""}
              {formatCol && selected[formatCol] ? selected[formatCol] : ""}
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button className="bg" style={{ flex: 1 }} onClick={() => { setReservedProduct(selected); setFormOpen(true); }}>Reservar Producto</button>
              <button className="bo" style={{ flex: 1 }}>Reserva realizada</button>
            </div>
            {kgCol && selected[kgCol] && <div className="dr"><span style={{ color: "#888" }}>Kgs</span><span style={{ fontWeight: 500 }}>{selected[kgCol]}</span></div>}
            {hojaCol && selected[hojaCol] && <div className="dr"><span style={{ color: "#888" }}>Hojas</span><span style={{ fontWeight: 500 }}>{parseInt(selected[hojaCol]).toLocaleString()}</span></div>}
            {fabCol && selected[fabCol] && <div className="dr"><span style={{ color: "#888" }}>Fabricante</span><span style={{ fontWeight: 500 }}>{selected[fabCol]}</span></div>}
            {descCol && selected[descCol] && <div className="dr"><span style={{ color: "#888" }}>Descripcion</span><span style={{ fontWeight: 500 }}>{selected[descCol]}</span></div>}
            {pastaCol && selected[pastaCol] && <div className="dr"><span style={{ color: "#888" }}>Tipo de Pasta</span><span style={{ fontWeight: 500 }}>{selected[pastaCol]}</span></div>}
            {entradaCol && selected[entradaCol] && <div className="dr"><span style={{ color: "#888" }}>Entrada</span><span style={{ fontWeight: 500 }}>{selected[entradaCol]}</span></div>}
          </div>
          <div style={{ padding: "20px" }}>
            <button className="bg" onClick={() => { setReservedProduct(selected); setFormOpen(true); }}>Reservar Producto</button>
          </div>
        </div>
      )}

      {screen === "reservas" && (
        <div style={{ paddingBottom: 80 }}>
          <div className="gh"><span className="ht">Mis Reservas</span></div>
          {reservations.filter(r => !r.paid && !isExpired(r.expiresAt)).length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p>No tienes reservas activas</p>
            </div>
          ) : reservations.filter(r => !r.paid && !isExpired(r.expiresAt)).map(res => {
            const resProds = res.items.map(id => products.find(p => p._id === id)).filter(Boolean);
            return (
              <div key={res.id} style={{ background: "#fff", margin: "12px 16px", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{res.nombre}</span>
                  <span style={{ fontSize: 12, background: GOLD_LIGHT, color: GOLD, padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>⏱ {timeLeft(res.expiresAt)}</span>
                </div>
                <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>{res.email}</p>
                {resProds.map(p => <div key={p._id} style={{ fontSize: 13, color: "#555" }}>• {p[nameCol]} {kgCol && p[kgCol] ? `· ${p[kgCol]}Kg` : ""}</div>)}
              </div>
            );
          })}
        </div>
      )}

      {screen === "admin" && (
        <div style={{ paddingBottom: 80 }}>
          <div className="gh"><span className="ht">Admin</span></div>
          {!adminAuth ? (
            <div style={{ padding: 24 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Acceso Admin</h2>
                <input className="inp" type="password" placeholder="Contraseña" value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { if (adminPass === ADMIN_PASSWORD) { setAdminAuth(true); setAdminError(""); } else setAdminError("Contraseña incorrecta."); }}}
                  style={{ marginBottom: 12 }} />
                {adminError && <p style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{adminError}</p>}
                <button className="bg" onClick={() => { if (adminPass === ADMIN_PASSWORD) { setAdminAuth(true); setAdminError(""); } else setAdminError("Contraseña incorrecta."); }}>Entrar</button>
                <p style={{ fontSize: 11, color: "#ccc", marginTop: 12, textAlign: "center" }}>Contraseña: admin2026</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>{reservations.length} reservas · {reservations.filter(r => r.paid).length} pagadas</p>
              {reservations.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "#aaa" }}>📋 No hay reservas</div>
              ) : reservations.map(res => {
                const expired = !res.paid && isExpired(res.expiresAt);
                const resProds = res.items.map(id => products.find(p => p._id === id)).filter(Boolean);
                return (
                  <div key={res.id} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{res.nombre}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: res.paid ? "#D1FAE5" : expired ? "#FEE2E2" : GOLD_LIGHT, color: res.paid ? "#065F46" : expired ? "#991B1B" : GOLD }}>
                        {res.paid ? "✓ Pagada" : expired ? "Expirada" : "Pendiente"}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#888" }}>{res.email}</p>
                    {res.tel && <p style={{ fontSize: 13, color: "#888" }}>📞 {res.tel}</p>}
                    {!res.paid && !expired && <p style={{ fontSize: 12, color: GOLD, fontWeight: 600, marginTop: 4 }}>⏱ {timeLeft(res.expiresAt)}</p>}
                    <div style={{ margin: "10px 0", padding: 10, background: "#f9f9f9", borderRadius: 8 }}>
                      {resProds.map(p => <div key={p._id} style={{ fontSize: 13, color: "#555" }}>• {p[nameCol]} {kgCol && p[kgCol] ? `· ${p[kgCol]}Kg` : ""}</div>)}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!res.paid && !expired && (
                        <button onClick={() => markPaid(res.id)} style={{ flex: 2, background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✓ Marcar pagada</button>
                      )}
                      <button onClick={() => deleteR(res.id)} style={{ flex: 1, background: "#fff", color: "#DC2626", border: "1.5px solid #DC2626", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="bn">
        <div className="ni" onClick={() => setScreen("list")}>
          <span style={{ fontSize: 22 }}>🛒</span>
          <span className="nl" style={{ color: screen === "list" ? GOLD_BG : "#aaa" }}>Productos</span>
        </div>
        <div className="ni" onClick={() => setScreen("reservas")}>
          <span style={{ fontSize: 22 }}>✅</span>
          <span className="nl" style={{ color: screen === "reservas" ? GOLD_BG : "#aaa" }}>Mis Reservas</span>
        </div>
        <div className="ni" onClick={() => { setScreen("admin"); setAdminAuth(false); setAdminPass(""); }}>
          <span style={{ fontSize: 22 }}>⚙️</span>
          <span className="nl" style={{ color: screen === "admin" ? GOLD_BG : "#aaa" }}>Admin</span>
        </div>
      </div>

      {formOpen && (
        <div className="ov" onClick={() => setFormOpen(false)}>
          <div className="sh" onClick={e => e.stopPropagation()}>
            <div className="shh" />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Reservar Producto</h2>
            {reservedProduct && (
              <div style={{ background: GOLD_LIGHT, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "#92400E" }}>{reservedProduct[nameCol]}</p>
                <p style={{ fontSize: 13, color: "#a67c00" }}>{kgCol && reservedProduct[kgCol] ? `${reservedProduct[kgCol]} Kg` : ""}{formatCol && reservedProduct[formatCol] ? ` · ${reservedProduct[formatCol]}` : ""}</p>
              </div>
            )}
            <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Reserva válida <strong>48 horas</strong>. Te contactamos para el pago.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Nombre *</label>
                <input className="inp" placeholder="Tu nombre" value={formData.nombre} onChange={e => setFormData(d => ({ ...d, nombre: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Email *</label>
                <input className="inp" type="email" placeholder="tu@email.com" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Teléfono</label>
                <input className="inp" type="tel" placeholder="600 000 000" value={formData.tel} onChange={e => setFormData(d => ({ ...d, tel: e.target.value }))} />
              </div>
            </div>
            {formError && <p style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{formError}</p>}
            <button className="bg" style={{ marginBottom: 10 }} onClick={doReserve}>Confirmar Reserva</button>
            <button className="bo" onClick={() => setFormOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
