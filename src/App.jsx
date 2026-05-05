import { useState, useEffect } from "react";

const SHEET_URL = "https://opensheet.elk.sh/10tWEt77gKq5CDpfgBjeyFHA-zAjtaoHSpQ4OgtsV1dk/productos.csv";
const ADMIN_PASSWORD = "admin2026";
const HOURS_48 = 48 * 60 * 60 * 1000;
const GB = "#C8930A";

const NAME = "Nombre Producto";
const CAT = "Categoria";
const DESC = "Descripcion";
const PASTA = "Pasta";
const FAB = "Fabricante";
const GRAM = "Gramaje";
const ANCHO = "Ancho";
const LARGO = "Largo";
const HOJAS = "Hojas";
const KGS = "Kgs";
const ID_ENT = "ID_Entrada";

const getRes = () => { try { return JSON.parse(localStorage.getItem("reservas") || "[]"); } catch { return []; } };
const saveRes = (d) => { try { localStorage.setItem("reservas", JSON.stringify(d)); } catch {} };
const isExpired = (t) => Date.now() > t;
const timeLeft = (t) => {
  const d = t - Date.now();
  if (d <= 0) return "Expirada";
  return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
};

const Logo = ({ size = 40 }) => (
  <div style={{
    width: size, height: size, background: "#e8d5b0", borderRadius: size * 0.22,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)", flexShrink: 0
  }}>
    <div style={{ color: "#5C3D1E", fontSize: size * 0.42, fontWeight: 900, lineHeight: 1, fontFamily: "Georgia, serif" }}>P</div>
    <div style={{ color: "#5C3D1E", fontSize: size * 0.18, fontWeight: 700, lineHeight: 1, letterSpacing: 0.5 }}>Carton</div>
  </div>
);

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", email: "", tel: "" });
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch(SHEET_URL)
      .then(r => r.json())
      .then(data => { setProducts(data.map((row, i) => ({ _id: i + 2, ...row }))); setLoading(false); })
      .catch(() => { setLoadError(true); setLoading(false); });
    setReservations(getRes());
    const iv = setInterval(() => setTick(x => x + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const valid = reservations.filter(r => r.paid || !isExpired(r.expiresAt));
    if (valid.length !== reservations.length) { setReservations(valid); saveRes(valid); }
  }, [tick]);

  const reservedIds = reservations.filter(r => r.paid || !isExpired(r.expiresAt)).flatMap(r => r.items);
  const availableProducts = products.filter(p => !reservedIds.includes(p._id));
  const filteredProducts = availableProducts.filter(p =>
    !search || JSON.stringify(p).toLowerCase().includes(search.toLowerCase())
  );

  const toggleCart = (id, e) => {
    e && e.stopPropagation();
    setCart(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  };

  const doReserve = () => {
    if (!formData.nombre.trim() || !formData.email.trim()) { setFormError("Rellena nombre y email."); return; }
    if (!/\S+@\S+\.\S+/.test(formData.email)) { setFormError("Email no válido."); return; }
    if (cart.length === 0) { setFormError("No has seleccionado ningún producto."); return; }
    const newR = { id: Date.now(), ...formData, items: [...cart], createdAt: Date.now(), expiresAt: Date.now() + HOURS_48, paid: false };
    const updated = [...reservations, newR];
    setReservations(updated); saveRes(updated);
    setFormOpen(false); setFormData({ nombre: "", email: "", tel: "" }); setFormError("");
    setCart([]);
    setSuccessMsg(`✓ Solicitud enviada para ${newR.items.length} producto${newR.items.length > 1 ? "s" : ""}. Te contactaremos en 48h.`);
    setTimeout(() => setSuccessMsg(""), 7000);
    setScreen("list");
  };

  const markPaid = (id) => { const u = reservations.map(r => r.id === id ? { ...r, paid: true } : r); setReservations(u); saveRes(u); };
  const deleteR = (id) => { const u = reservations.filter(r => r.id !== id); setReservations(u); saveRes(u); };
  const cartProducts = cart.map(id => products.find(p => p._id === id)).filter(Boolean);

  const S = {
    app: { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f2f2f7", fontFamily: "-apple-system, 'SF Pro Display', 'Segoe UI', sans-serif" },
    header: { background: GB, padding: "10px 16px 0" },
    headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    searchWrap: { position: "relative", paddingBottom: 10 },
    searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-60%)", fontSize: 13, opacity: 0.7 },
    searchInput: { width: "100%", background: "rgba(255,255,255,0.22)", border: "none", borderRadius: 8, padding: "7px 12px 7px 30px", color: "#fff", fontSize: 14, outline: "none" },
    row: { background: "#fff", padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
    rowName: { fontSize: 14, fontWeight: 600, color: "#000", marginBottom: 2, lineHeight: 1.3 },
    rowSub: { fontSize: 12, color: "#8e8e93" },
    detailHeader: { background: GB, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 },
    backBtn: { background: "none", border: "none", color: "#fff", fontSize: 26, cursor: "pointer", padding: 0, lineHeight: 1 },
    btnGold: { background: GB, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", flex: 1 },
    btnWhite: { background: "#fff", color: "#000", border: "1px solid #e0e0e0", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer", flex: 1 },
    detailRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f2f2f7" },
    bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#fff", borderTop: "1px solid #e8e8e8", display: "flex", paddingBottom: 20, paddingTop: 8, zIndex: 100 },
    navItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "flex-end" },
    modalSheet: { background: "#fff", borderRadius: "16px 16px 0 0", padding: "0 16px 40px", width: "100%", maxHeight: "92vh", overflowY: "auto" },
    modalHandle: { width: 36, height: 4, background: "#d1d1d6", borderRadius: 2, margin: "10px auto 16px" },
    inp: { width: "100%", padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none", background: "#f9f9f9", fontFamily: "inherit" },
  };

  return (
    <div style={S.app}>

      {screen === "splash" && (
        <div style={{ minHeight: "100vh", background: GB, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Logo size={100} />
          <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 800, marginTop: 48, marginBottom: 12, textAlign: "center", lineHeight: 1.2 }}>
            Bienvenido a<br />Stock Carton
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, marginBottom: 60, textAlign: "center" }}>Stock Cartón</p>
          <button onClick={() => setScreen("list")}
            style={{ background: "#fff", color: GB, border: "none", borderRadius: 14, padding: "16px 48px", fontSize: 17, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
            Ver productos →
          </button>
        </div>
      )}

      {screen === "list" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={S.header}>
            <div style={S.headerTop}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Logo size={32} />
                <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>Productos</div>
              </div>
            </div>
            <div style={S.searchWrap}>
              <span style={S.searchIcon}>🔍</span>
              <input style={S.searchInput} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {successMsg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 16px", fontSize: 13, fontWeight: 500 }}>{successMsg}</div>}
          {loading && <div style={{ textAlign: "center", padding: 48, color: "#8e8e93", fontSize: 14 }}>⏳ Cargando productos...</div>}
          {loadError && <div style={{ background: "#fee2e2", color: "#991b1b", margin: 16, borderRadius: 10, padding: 14, textAlign: "center", fontSize: 13 }}>Error al cargar productos.</div>}
          {!loading && !loadError && filteredProducts.map(p => {
            const inCart = cart.includes(p._id);
            return (
              <div key={p._id} style={S.row} onClick={() => { setSelected(p); setScreen("detail"); }}>
                <div style={{ flex: 1 }}>
                  <div style={S.rowName}>{p[NAME]}{p[GRAM] ? ` ${p[GRAM]} gr/m2` : ""}</div>
                  <div style={S.rowSub}>{p[ANCHO] && p[LARGO] ? `${p[ANCHO]}X${p[LARGO]}` : ""}{p[KGS] ? `     ${p[KGS]} Kgs` : ""}</div>
                </div>
                <button onClick={e => toggleCart(p._id, e)}
                  style={{ background: inCart ? GB : "#f2f2f7", border: "none", borderRadius: 20, width: 30, height: 30, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 10, flexShrink: 0, color: inCart ? "#fff" : "#888" }}>
                  {inCart ? "✓" : "+"}
                </button>
              </div>
            );
          })}
          {!loading && !loadError && filteredProducts.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#8e8e93" }}>📦 No hay productos disponibles</div>
          )}
        </div>
      )}

      {screen === "detail" && selected && (
        <div style={{ paddingBottom: 100, background: "#fff", minHeight: "100vh" }}>
          <div style={S.detailHeader}>
            <button style={S.backBtn} onClick={() => setScreen("list")}>‹</button>
            <Logo size={28} />
          </div>
          <div style={{ padding: "16px 16px 0" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{selected[NAME]}</h1>
            <p style={{ fontSize: 12, color: "#8e8e93", marginBottom: 14, textTransform: "uppercase" }}>
              {selected[CAT] ? selected[CAT] + "  " : ""}
              {selected[GRAM] ? selected[GRAM] + " gr/m2  " : ""}
              {selected[ANCHO] && selected[LARGO] ? `${selected[ANCHO]}X${selected[LARGO]}` : ""}
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button style={{ ...S.btnGold, background: cart.includes(selected._id) ? "#16a34a" : GB }}
                onClick={e => toggleCart(selected._id, e)}>
                {cart.includes(selected._id) ? "✓ Seleccionado" : "+ Seleccionar"}
              </button>
              <button style={S.btnWhite} onClick={() => setScreen("list")}>Volver</button>
            </div>
            {selected[KGS] && <div style={S.detailRow}><span style={{ fontSize: 14 }}>Kgs</span><span style={{ fontSize: 14, color: "#8e8e93" }}>{selected[KGS]}</span></div>}
            {selected[HOJAS] && <div style={S.detailRow}><span style={{ fontSize: 14 }}>Hojas</span><span style={{ fontSize: 14, color: "#8e8e93" }}>{Number(selected[HOJAS]).toLocaleString("es-ES")}</span></div>}
            {selected[FAB] && <div style={S.detailRow}><span style={{ fontSize: 14 }}>Fabricante</span><span style={{ fontSize: 14, color: "#8e8e93" }}>{selected[FAB]}</span></div>}
            {selected[DESC] && <div style={S.detailRow}><span style={{ fontSize: 14 }}>Descripcion</span><span style={{ fontSize: 14, color: "#8e8e93" }}>{selected[DESC]}</span></div>}
            {selected[PASTA] && <div style={S.detailRow}><span style={{ fontSize: 14 }}>Tipo de Pasta</span><span style={{ fontSize: 14, color: "#8e8e93" }}>{selected[PASTA]}</span></div>}
            {selected[ID_ENT] && <div style={S.detailRow}><span style={{ fontSize: 14 }}>Entrada</span><span style={{ fontSize: 14, color: "#8e8e93" }}>{selected[ID_ENT]}</span></div>}
            {selected[ANCHO] && <div style={S.detailRow}><span style={{ fontSize: 14 }}>Ancho</span><span style={{ fontSize: 14, color: "#8e8e93" }}>{selected[ANCHO]}</span></div>}
            {selected[LARGO] && <div style={S.detailRow}><span style={{ fontSize: 14 }}>Largo</span><span style={{ fontSize: 14, color: "#8e8e93" }}>{selected[LARGO]}</span></div>}
          </div>
        </div>
      )}

      {screen === "reservas" && (
        <div style={{ paddingBottom: cart.length > 0 ? 140 : 80 }}>
          <div style={S.header}>
            <div style={S.headerTop}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Logo size={32} />
                <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>Mis Reservas</div>
              </div>
            </div>
            <div style={S.searchWrap}>
              <span style={S.searchIcon}>🔍</span>
              <input style={S.searchInput} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#8e8e93" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>No has seleccionado ningún producto</div>
              <button onClick={() => setScreen("list")}
                style={{ background: GB, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Ver productos
              </button>
            </div>
          ) : (
            <>
              <div style={{ padding: "10px 16px 4px" }}>
                <p style={{ fontSize: 12, color: "#8e8e93" }}>{cart.length} producto{cart.length > 1 ? "s" : ""} seleccionado{cart.length > 1 ? "s" : ""}</p>
              </div>
              {cartProducts.map(p => (
                <div key={p._id} style={S.row} onClick={() => { setSelected(p); setScreen("detail"); }}>
                  <div style={{ flex: 1 }}>
                    <div style={S.rowName}>{p[NAME]}{p[GRAM] ? ` ${p[GRAM]} gr/m2` : ""}</div>
                    <div style={S.rowSub}>{p[ANCHO] && p[LARGO] ? `${p[ANCHO]}X${p[LARGO]}` : ""}{p[KGS] ? `     ${p[KGS]} Kgs` : ""}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleCart(p._id); }}
                    style={{ background: "#fee2e2", border: "none", borderRadius: 20, width: 30, height: 30, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 10, flexShrink: 0, color: "#dc2626" }}>
                    ×
                  </button>
                </div>
              ))}
              <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: GB, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 90 }}>
                <div>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{cart.length} producto{cart.length > 1 ? "s" : ""}</p>
                  <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Reserva 48h sin pago online</p>
                </div>
                <button onClick={() => setFormOpen(true)}
                  style={{ background: "#fff", color: GB, border: "none", borderRadius: 20, padding: "9px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  Solicitar →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {screen === "admin" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={S.header}>
            <div style={S.headerTop}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Logo size={32} />
                <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>Admin</div>
              </div>
            </div>
            <div style={{ paddingBottom: 10 }} />
          </div>
          {!adminAuth ? (
            <div style={{ padding: 20 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Acceso Admin</h2>
                <input style={{ ...S.inp, marginBottom: 10 }} type="password" placeholder="Contraseña"
                  value={adminPass} onChange={e => setAdminPass(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Contraseña incorrecta."); }}} />
                {adminError && <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{adminError}</p>}
                <button style={{ ...S.btnGold, borderRadius: 10 }}
                  onClick={() => { adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Contraseña incorrecta."); }}>
                  Entrar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 14 }}>
              <p style={{ fontSize: 12, color: "#8e8e93", marginBottom: 12 }}>{reservations.length} reservas · {reservations.filter(r => r.paid).length} pagadas</p>
              {reservations.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "#8e8e93" }}>📋 No hay reservas</div>
              ) : reservations.map(res => {
                const expired = !res.paid && isExpired(res.expiresAt);
                const resProds = res.items.map(id => products.find(p => p._id === id)).filter(Boolean);
                return (
                  <div key={res.id} style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{res.nombre}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                        background: res.paid ? "#d1fae5" : expired ? "#fee2e2" : "#FEF3C7",
                        color: res.paid ? "#065f46" : expired ? "#991b1b" : GB }}>
                        {res.paid ? "✓ Pagada" : expired ? "Expirada" : "Pendiente"}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "#8e8e93" }}>{res.email}</p>
                    {res.tel && <p style={{ fontSize: 12, color: "#8e8e93" }}>📞 {res.tel}</p>}
                    {!res.paid && !expired && <p style={{ fontSize: 11, color: GB, fontWeight: 600, marginTop: 3 }}>⏱ {timeLeft(res.expiresAt)}</p>}
                    <div style={{ background: "#f9f9f9", borderRadius: 8, padding: "8px 10px", margin: "8px 0" }}>
                      {resProds.map(p => (
                        <div key={p._id} style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>
                          • {p[NAME]} {p[GRAM] ? `${p[GRAM]}gr · ` : ""}{p[ANCHO] && p[LARGO] ? `${p[ANCHO]}X${p[LARGO]} · ` : ""}{p[KGS] ? `${p[KGS]}Kg` : ""}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!res.paid && !expired && (
                        <button onClick={() => markPaid(res.id)}
                          style={{ flex: 2, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: 9, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          ✓ Marcar pagada
                        </button>
                      )}
                      <button onClick={() => deleteR(res.id)}
                        style={{ flex: 1, background: "#fff", color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: 8, padding: 9, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {screen !== "splash" && (
        <div style={S.bottomNav}>
          <div style={S.navItem} onClick={() => setScreen("list")}>
            <span style={{ fontSize: 22, filter: screen === "list" ? "none" : "grayscale(1) opacity(0.4)" }}>🛒</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: screen === "list" ? GB : "#8e8e93" }}>Productos</span>
          </div>
          <div style={S.navItem} onClick={() => setScreen("reservas")}>
            <div style={{ position: "relative" }}>
              <span style={{ fontSize: 22, filter: screen === "reservas" ? "none" : "grayscale(1) opacity(0.4)" }}>☑️</span>
              {cart.length > 0 && (
                <span style={{ position: "absolute", top: -4, right: -8, background: "#dc2626", color: "#fff", borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>{cart.length}</span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, color: screen === "reservas" ? GB : "#8e8e93" }}>Mis Reservas</span>
          </div>
          <div style={S.navItem} onClick={() => { setScreen("admin"); setAdminAuth(false); setAdminPass(""); }}>
            <span style={{ fontSize: 22, filter: screen === "admin" ? "none" : "grayscale(1) opacity(0.4)" }}>⚙️</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: screen === "admin" ? GB : "#8e8e93" }}>Admin</span>
          </div>
        </div>
      )}

      {formOpen && (
        <div style={S.modal} onClick={() => setFormOpen(false)}>
          <div style={S.modalSheet} onClick={e => e.stopPropagation()}>
            <div style={S.modalHandle} />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Solicitar reserva</h2>
            <p style={{ fontSize: 12, color: "#8e8e93", marginBottom: 14 }}>Reserva válida <strong>48 horas</strong>. Te contactamos para el pago.</p>
            <div style={{ background: "#f9f9f9", borderRadius: 10, padding: "6px 12px", marginBottom: 16 }}>
              {cartProducts.map(p => (
                <div key={p._id} style={{ padding: "7px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{p[NAME]}</p>
                  <p style={{ fontSize: 11, color: "#8e8e93" }}>
                    {p[GRAM] ? p[GRAM] + " gr/m2 · " : ""}
                    {p[ANCHO] && p[LARGO] ? p[ANCHO] + "X" + p[LARGO] + " · " : ""}
                    {p[KGS] ? p[KGS] + " Kg" : ""}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Nombre *</label>
                <input style={S.inp} placeholder="Tu nombre completo" value={formData.nombre} onChange={e => setFormData(d => ({ ...d, nombre: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Email *</label>
                <input style={S.inp} type="email" placeholder="tu@email.com" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Teléfono</label>
                <input style={S.inp} type="tel" placeholder="600 000 000" value={formData.tel} onChange={e => setFormData(d => ({ ...d, tel: e.target.value }))} />
              </div>
            </div>
            {formError && <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{formError}</p>}
            <button style={{ ...S.btnGold, borderRadius: 10, padding: 13, fontSize: 15, marginBottom: 8 }} onClick={doReserve}>
              Confirmar Reserva
            </button>
            <button style={{ ...S.btnWhite, borderRadius: 10, padding: 12, fontSize: 14 }} onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
