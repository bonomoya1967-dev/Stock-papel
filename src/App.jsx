   import { useState, useEffect } from "react";

const SHEET_URL = "https://opensheet.elk.sh/10tWEt77gKq5CDpfgBjeyFHA-zAjtaoHSpQ4OgtsV1dk/productos.csv";
const ADMIN_EMAIL = "hakkinen2002@me.com";
const ADMIN_PASSWORD = "admin2026";
const HOURS_48 = 48 * 60 * 60 * 1000;
const NAVY = "#0f1b3c";
const GOLD = "#c49a3c";

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

const sendEmail = (reserva, productos) => {
  const prods = productos.map(p =>
    `- ${p[NAME]} ${p[GRAM] ? p[GRAM] + "gr/m2" : ""} ${p[ANCHO] && p[LARGO] ? p[ANCHO] + "x" + p[LARGO] : ""} ${p[KGS] ? p[KGS] + "kg" : ""}`
  ).join("\n");
  const subject = encodeURIComponent(`Nueva reserva - ${reserva.nombre}`);
  const body = encodeURIComponent(
    `Nueva solicitud de reserva\n\nCliente: ${reserva.nombre}\nEmail: ${reserva.email}\nTeléfono: ${reserva.tel || "No indicado"}\n\nProductos reservados:\n${prods}\n\nFecha: ${new Date(reserva.createdAt).toLocaleString("es-ES")}\nVálida hasta: ${new Date(reserva.expiresAt).toLocaleString("es-ES")}\n\nID: ${reserva.id}`
  );
  window.open(`mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`);
};

const LayersIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill={GOLD} />
    <path d="M2 12l10 5 10-5" stroke={GOLD} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
    <path d="M2 17l10 5 10-5" stroke={GOLD} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
  </svg>
);

const UserIcon = ({ size = 24, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" fill={color} />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill={color} />
  </svg>
);

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [searchGram, setSearchGram] = useState("");
  const [cart, setCart] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", email: "", tel: "" });
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [tick, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  const filteredProducts = availableProducts.filter(p => {
    const matchName = !search || JSON.stringify(p).toLowerCase().includes(search.toLowerCase());
    const matchGram = !searchGram || (p[GRAM] && p[GRAM].toString().includes(searchGram.trim()));
    return matchName && matchGram;
  });

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
    const resProds = cart.map(id => products.find(p => p._id === id)).filter(Boolean);
    sendEmail(newR, resProds);
    setFormOpen(false); setFormData({ nombre: "", email: "", tel: "" }); setFormError("");
    setCart([]);
    setSuccessMsg(`✓ Reserva confirmada para ${newR.items.length} producto${newR.items.length > 1 ? "s" : ""}. Te contactaremos en 48h.`);
    setTimeout(() => setSuccessMsg(""), 7000);
    setScreen("list");
  };

  const markPaid = (id) => { const u = reservations.map(r => r.id === id ? { ...r, paid: true } : r); setReservations(u); saveRes(u); };
  const deleteR = (id) => { const u = reservations.filter(r => r.id !== id); setReservations(u); saveRes(u); };
  const cartProducts = cart.map(id => products.find(p => p._id === id)).filter(Boolean);

  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fafafa", fontFamily: "inherit", color: "#111" };

  const [showBanner, setShowBanner] = useState(() => {
    try {
      const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
      const isStandalone = window.navigator.standalone;
      const dismissed = localStorage.getItem("install_dismissed");
      return isIOS && !isStandalone && !dismissed;
    } catch { return false; }
  });
  const dismissBanner = () => { try { localStorage.setItem("install_dismissed", "1"); } catch {} setShowBanner(false); };

  const Sidebar = () => (
    <div style={{ width: 220, background: NAVY, minHeight: "100vh", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0 }}>
      <div style={{ padding: "28px 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LayersIcon size={32} />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ color: "#fff", fontSize: 16, fontWeight: 400, fontFamily: "Georgia, serif" }}>market</span>
              <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>board</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Stock Cartón</div>
          </div>
        </div>
      </div>
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {[
          { id: "list", icon: "📦", label: "Productos" },
          { id: "reservas", icon: "📋", label: "Mis Reservas", badge: cart.length },
          { id: "admin", icon: null, label: "Admin", isUser: true },
        ].map(item => (
          <div key={item.id}
            onClick={() => { setScreen(item.id); if (item.id === "admin") { setAdminAuth(false); setAdminPass(""); } }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10, marginBottom: 4, cursor: "pointer", background: screen === item.id ? "rgba(255,255,255,0.12)" : "transparent" }}>
            {item.isUser
              ? <UserIcon size={20} color={screen === item.id ? "#fff" : "rgba(255,255,255,0.5)"} />
              : <span style={{ fontSize: 18 }}>{item.icon}</span>}
            <span style={{ color: screen === item.id ? "#fff" : "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: screen === item.id ? 700 : 400 }}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{ marginLeft: "auto", background: "#dc2626", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>{item.badge}</span>
            )}
          </div>
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>marketboard.org</div>
      </div>
    </div>
  );

  const ProductList = () => (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ padding: "16px 20px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4, fontWeight: 600 }}>PRODUCTO</div>
          <input style={inp} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4, fontWeight: 600 }}>GRAMAJE</div>
          <input style={inp} placeholder="ej: 300" value={searchGram} onChange={e => setSearchGram(e.target.value)} />
        </div>
        <button style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
          🔍 Buscar
        </button>
      </div>
      {successMsg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 20px", fontSize: 13, fontWeight: 500 }}>{successMsg}</div>}
      {loading && <div style={{ textAlign: "center", padding: 48, color: "#8e8e93" }}>⏳ Cargando...</div>}
      {loadError && <div style={{ background: "#fee2e2", color: "#991b1b", margin: 16, borderRadius: 10, padding: 14, textAlign: "center", fontSize: 13 }}>Error al cargar productos.</div>}
      {!loading && !loadError && (
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
          {filteredProducts.map(p => {
            const inCart = cart.includes(p._id);
            return (
              <div key={p._id}
                style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: inCart ? `2px solid ${NAVY}` : "1px solid #eee", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
                onClick={() => setSelected(p)}>
                <LayersIcon size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 3, lineHeight: 1.3 }}>
                    {p[NAME]}{p[GRAM] ? ` ${p[GRAM]} gr/m2` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#8e8e93" }}>
                    {p[ANCHO] && p[LARGO] ? `${p[ANCHO]}x${p[LARGO]}` : ""}{p[KGS] ? ` · ${p[KGS]} kg` : ""}{p[CAT] ? ` · ${p[CAT]}` : ""}
                  </div>
                </div>
                <button onClick={e => toggleCart(p._id, e)}
                  style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, background: inCart ? "#16a34a" : NAVY, color: "#fff" }}>
                  {inCart ? "✓" : "+"}
                </button>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#8e8e93" }}>📦 No hay productos disponibles</div>
          )}
        </div>
      )}
    </div>
  );

  const DetailPanel = () => (
    <div style={{ width: 320, background: "#fff", borderLeft: "1px solid #eee", overflow: "auto", flexShrink: 0 }}>
      {!selected ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#8e8e93", padding: 32, textAlign: "center" }}>
          <LayersIcon size={48} />
          <p style={{ marginTop: 16, fontSize: 14 }}>Selecciona un producto para ver el detalle</p>
        </div>
      ) : (
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 4 }}>{selected[NAME]}</h2>
              <p style={{ fontSize: 12, color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {selected[CAT] ? selected[CAT] + " · " : ""}{selected[GRAM] ? selected[GRAM] + " gr/m2" : ""}
              </p>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>×</button>
          </div>
          <button
            style={{ width: "100%", background: cart.includes(selected._id) ? "#16a34a" : NAVY, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}
            onClick={e => toggleCart(selected._id, e)}>
            {cart.includes(selected._id) ? "✓ En la reserva" : "+ Añadir a reserva"}
          </button>
          <div style={{ borderTop: "1px solid #f0f0f0" }}>
            {selected[KGS] && <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f5f5f5", fontSize: 14 }}><span style={{ color: "#666" }}>Kgs</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[KGS]}</span></div>}
            {selected[HOJAS] && <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f5f5f5", fontSize: 14 }}><span style={{ color: "#666" }}>Hojas</span><span style={{ fontWeight: 600, color: NAVY }}>{Number(selected[HOJAS]).toLocaleString("es-ES")}</span></div>}
            {selected[FAB] && <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f5f5f5", fontSize: 14 }}><span style={{ color: "#666" }}>Fabricante</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[FAB]}</span></div>}
            {selected[DESC] && <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f5f5f5", fontSize: 14 }}><span style={{ color: "#666" }}>Descripcion</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[DESC]}</span></div>}
            {selected[PASTA] && <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f5f5f5", fontSize: 14 }}><span style={{ color: "#666" }}>Tipo de Pasta</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[PASTA]}</span></div>}
            {selected[ID_ENT] && <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f5f5f5", fontSize: 14 }}><span style={{ color: "#666" }}>Entrada</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[ID_ENT]}</span></div>}
            {selected[ANCHO] && <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f5f5f5", fontSize: 14 }}><span style={{ color: "#666" }}>Ancho</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[ANCHO]}</span></div>}
            {selected[LARGO] && <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", fontSize: 14 }}><span style={{ color: "#666" }}>Largo</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[LARGO]}</span></div>}
          </div>
        </div>
      )}
    </div>
  );

  const ReservasContent = () => (
    <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginBottom: 4 }}>Mis Reservas</h2>
      <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 20 }}>
        {cart.length === 0 ? "Sin productos seleccionados" : `${cart.length} producto${cart.length > 1 ? "s" : ""} seleccionado${cart.length > 1 ? "s" : ""}`}
      </p>
      {cart.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8e8e93", background: "#fff", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>No has seleccionado ningún producto</div>
          <button onClick={() => setScreen("list")} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Ver productos</button>
        </div>
      ) : (
        <>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", marginBottom: 16, border: "1px solid #eee" }}>
            {cartProducts.map((p, i) => (
              <div key={p._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i < cartProducts.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <LayersIcon size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{p[NAME]}{p[GRAM] ? ` ${p[GRAM]} gr/m2` : ""}</div>
                  <div style={{ fontSize: 12, color: "#8e8e93" }}>{p[ANCHO] && p[LARGO] ? `${p[ANCHO]}x${p[LARGO]}` : ""}{p[KGS] ? ` · ${p[KGS]} kg` : ""}</div>
                </div>
                <button onClick={() => toggleCart(p._id)} style={{ width: 30, height: 30, borderRadius: "50%", background: "#fee2e2", border: "none", color: "#dc2626", fontSize: 18, cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={() => setFormOpen(true)}
            style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }}>
            Solicitar reserva →
          </button>
        </>
      )}
    </div>
  );

  const AdminContent = () => (
    <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginBottom: 4 }}>Panel Admin</h2>
      {!adminAuth ? (
        <div style={{ maxWidth: 400, background: "#fff", borderRadius: 14, padding: 32, marginTop: 20, border: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{ background: NAVY, borderRadius: "50%", width: 90, height: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserIcon size={56} color="#fff" />
            </div>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 6, textAlign: "center" }}>Acceso Admin</h3>
          <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 20, textAlign: "center" }}>Solo para uso interno.</p>
          <input style={{ ...inp, marginBottom: 12 }} type="password" placeholder="Contraseña"
            value={adminPass} onChange={e => setAdminPass(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Contraseña incorrecta."); }}} />
          {adminError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>{adminError}</p>}
          <button style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, width: "100%", cursor: "pointer", fontFamily: "inherit" }}
            onClick={() => { adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Contraseña incorrecta."); }}>
            Entrar
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 16 }}>{reservations.length} reservas · {reservations.filter(r => r.paid).length} pagadas</p>
          {reservations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "#8e8e93", background: "#fff", borderRadius: 12 }}>📋 No hay reservas</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
              {reservations.map(res => {
                const expired = !res.paid && isExpired(res.expiresAt);
                const resProds = res.items.map(id => products.find(p => p._id === id)).filter(Boolean);
                return (
                  <div key={res.id} style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: NAVY }}>{res.nombre}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: res.paid ? "#d1fae5" : expired ? "#fee2e2" : "#fef3c7", color: res.paid ? "#065f46" : expired ? "#991b1b" : "#92400e" }}>
                        {res.paid ? "✓ Pagada" : expired ? "Expirada" : "Pendiente"}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#666" }}>{res.email}</p>
                    {res.tel && <p style={{ fontSize: 13, color: "#666" }}>📞 {res.tel}</p>}
                    {!res.paid && !expired && <p style={{ fontSize: 12, color: GOLD, fontWeight: 700, marginTop: 4 }}>⏱ {timeLeft(res.expiresAt)}</p>}
                    <div style={{ background: "#f8f9fa", borderRadius: 8, padding: "10px 12px", margin: "10px 0" }}>
                      {resProds.map(p => (
                        <div key={p._id} style={{ fontSize: 12, color: "#444", marginBottom: 2, display: "flex", gap: 6, alignItems: "center" }}>
                          <LayersIcon size={12} />
                          {p[NAME]} {p[GRAM] ? `${p[GRAM]}gr · ` : ""}{p[ANCHO] && p[LARGO] ? `${p[ANCHO]}x${p[LARGO]} · ` : ""}{p[KGS] ? `${p[KGS]}kg` : ""}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!res.paid && !expired && (
                        <button onClick={() => markPaid(res.id)} style={{ flex: 2, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: 9, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Marcar pagada</button>
                      )}
                      <button onClick={() => deleteR(res.id)} style={{ flex: 1, background: "#fff", color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: 8, padding: 9, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', -apple-system, sans-serif", minHeight: "100vh", background: "#f5f6fa" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #bbb; }
        .row-item { background: #fff; padding: 13px 16px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .row-item:active { background: #f9f9f9; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f2f2f7; font-size: 14px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; }
        .modal-sheet { background: #fff; border-radius: 20px 20px 0 0; padding: 0 20px 44px; width: 100%; max-width: 560px; margin: 0 auto; max-height: 93vh; overflow-y: auto; }
        .handle { width: 40px; height: 4px; background: #ddd; border-radius: 2px; margin: 12px auto 18px; }
        .bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #eee; display: flex; padding-bottom: env(safe-area-inset-bottom, 20px); padding-top: 10px; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; }
        .nav-label { font-size: 10px; font-weight: 600; }
        .cart-bar-mobile { position: fixed; bottom: 80px; left: 0; right: 0; background: ${NAVY}; padding: 13px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 90; }
      `}</style>

      {screen === "splash" && (
        <div style={{ minHeight: "100vh", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ marginBottom: 32 }}><LayersIcon size={80} /></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
            <span style={{ color: "#fff", fontSize: 36, fontWeight: 400, fontFamily: "Georgia, serif" }}>market</span>
            <span style={{ color: "#fff", fontSize: 36, fontWeight: 800 }}>board</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, marginBottom: 64, textAlign: "center" }}>Stock Cartón · Reservas online</p>
          <button onClick={() => setScreen("list")}
            style={{ background: GOLD, color: "#fff", border: "none", borderRadius: 14, padding: "16px 48px", fontSize: 17, fontWeight: 700, cursor: "pointer", maxWidth: 280, width: "100%" }}>
            Entrar al catálogo →
          </button>
        </div>
      )}

      {screen !== "splash" && !isMobile && (
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: "100vh" }}>
            {screen === "list" && <><ProductList /><DetailPanel /></>}
            {screen === "reservas" && <ReservasContent />}
            {screen === "admin" && <AdminContent />}
          </div>
        </div>
      )}

      {screen !== "splash" && isMobile && (
        <div style={{ paddingBottom: 80 }}>
          <div style={{ background: NAVY, paddingTop: "env(safe-area-inset-top, 44px)", paddingBottom: 12, paddingLeft: 16, paddingRight: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <LayersIcon size={32} />
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                    <span style={{ color: "#fff", fontSize: 20, fontWeight: 400, fontFamily: "Georgia, serif" }}>market</span>
                    <span style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>board</span>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 0.5 }}>Stock Cartón</div>
                </div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 20 }}>☰</div>
            </div>
          </div>

          {screen === "list" && (
            <>
              <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input style={inp} placeholder="Producto" value={search} onChange={e => setSearch(e.target.value)} />
                  <input style={inp} placeholder="Gramaje" value={searchGram} onChange={e => setSearchGram(e.target.value)} />
                </div>
                <button style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 700, width: "100%", cursor: "pointer", fontFamily: "inherit" }}>🔍 Buscar</button>
              </div>
              {successMsg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 16px", fontSize: 13, fontWeight: 500 }}>{successMsg}</div>}
              {loading && <div style={{ textAlign: "center", padding: 48, color: "#8e8e93" }}>⏳ Cargando...</div>}
              {loadError && <div style={{ background: "#fee2e2", color: "#991b1b", margin: 16, borderRadius: 10, padding: 14, textAlign: "center", fontSize: 13 }}>Error al cargar productos.</div>}
              {!loading && !loadError && filteredProducts.map(p => {
                const inCart = cart.includes(p._id);
                return (
                  <div key={p._id} className="row-item" onClick={() => setSelected(p)}>
                    <LayersIcon size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 2 }}>{p[NAME]}{p[GRAM] ? ` ${p[GRAM]} gr/m2` : ""}</div>
                      <div style={{ fontSize: 12, color: "#8e8e93" }}>{p[ANCHO] && p[LARGO] ? `${p[ANCHO]}x${p[LARGO]}` : ""}{p[KGS] ? ` · ${p[KGS]} kg` : ""}</div>
                    </div>
                    <button onClick={e => toggleCart(p._id, e)}
                      style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, background: inCart ? "#16a34a" : NAVY, color: "#fff" }}>
                      {inCart ? "✓" : "+"}
                    </button>
                  </div>
                );
              })}
              {cart.length > 0 && (
                <div className="cart-bar-mobile">
                  <div>
                    <p style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{cart.length} producto{cart.length > 1 ? "s" : ""}</p>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Reserva 48h · sin pago online</p>
                  </div>
                  <button onClick={() => setScreen("reservas")} style={{ background: GOLD, color: "#fff", border: "none", borderRadius: 20, padding: "9px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Ver cesta →</button>
                </div>
              )}
            </>
          )}

          {selected && screen === "list" && (
            <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 150, overflow: "auto", paddingBottom: 80 }}>
              <div style={{ background: NAVY, paddingTop: "env(safe-area-inset-top, 44px)", paddingLeft: 16, paddingRight: 16, paddingBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 8 }}>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 26, cursor: "pointer" }}>‹</button>
                  <LayersIcon size={24} />
                  <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Detalle</span>
                </div>
              </div>
              <div style={{ padding: "20px 16px" }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginBottom: 4 }}>{selected[NAME]}</h1>
                <p style={{ fontSize: 12, color: "#8e8e93", marginBottom: 16, textTransform: "uppercase" }}>{selected[CAT] || ""} {selected[GRAM] ? selected[GRAM] + " gr/m2" : ""}</p>
                <button style={{ width: "100%", background: cart.includes(selected._id) ? "#16a34a" : NAVY, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}
                  onClick={e => toggleCart(selected._id, e)}>
                  {cart.includes(selected._id) ? "✓ Seleccionado" : "+ Añadir a reserva"}
                </button>
                {selected[KGS] && <div className="detail-row"><span style={{ color: "#666" }}>Kgs</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[KGS]}</span></div>}
                {selected[HOJAS] && <div className="detail-row"><span style={{ color: "#666" }}>Hojas</span><span style={{ fontWeight: 600, color: NAVY }}>{Number(selected[HOJAS]).toLocaleString("es-ES")}</span></div>}
                {selected[FAB] && <div className="detail-row"><span style={{ color: "#666" }}>Fabricante</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[FAB]}</span></div>}
                {selected[DESC] && <div className="detail-row"><span style={{ color: "#666" }}>Descripcion</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[DESC]}</span></div>}
                {selected[PASTA] && <div className="detail-row"><span style={{ color: "#666" }}>Tipo de Pasta</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[PASTA]}</span></div>}
                {selected[ID_ENT] && <div className="detail-row"><span style={{ color: "#666" }}>Entrada</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[ID_ENT]}</span></div>}
                {selected[ANCHO] && <div className="detail-row"><span style={{ color: "#666" }}>Ancho</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[ANCHO]}</span></div>}
                {selected[LARGO] && <div className="detail-row"><span style={{ color: "#666" }}>Largo</span><span style={{ fontWeight: 600, color: NAVY }}>{selected[LARGO]}</span></div>}
              </div>
            </div>
          )}

          {screen === "reservas" && <div style={{ padding: 16 }}><ReservasContent /></div>}
          {screen === "admin" && <div style={{ padding: 16 }}><AdminContent /></div>}
        </div>
      )}

      {screen !== "splash" && isMobile && (
        <div className="bottom-bar">
          <div className="nav-item" onClick={() => setScreen("list")}>
            <span style={{ fontSize: 22 }}>📦</span>
            <span className="nav-label" style={{ color: screen === "list" ? NAVY : "#aaa" }}>Productos</span>
            {screen === "list" && <div style={{ width: 20, height: 2, background: NAVY, borderRadius: 1, marginTop: 2 }} />}
          </div>
          <div className="nav-item" onClick={() => setScreen("reservas")}>
            <div style={{ position: "relative" }}>
              <span style={{ fontSize: 22 }}>📋</span>
              {cart.length > 0 && <span style={{ position: "absolute", top: -4, right: -8, background: "#dc2626", color: "#fff", borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 5px" }}>{cart.length}</span>}
            </div>
            <span className="nav-label" style={{ color: screen === "reservas" ? NAVY : "#aaa" }}>Mis Reservas</span>
            {screen === "reservas" && <div style={{ width: 20, height: 2, background: NAVY, borderRadius: 1, marginTop: 2 }} />}
          </div>
          <div className="nav-item" onClick={() => { setScreen("admin"); setAdminAuth(false); setAdminPass(""); }}>
            <UserIcon size={28} color={screen === "admin" ? NAVY : "#aaa"} />
            <span className="nav-label" style={{ color: screen === "admin" ? NAVY : "#aaa" }}>Admin</span>
            {screen === "admin" && <div style={{ width: 20, height: 2, background: NAVY, borderRadius: 1, marginTop: 2 }} />}
          </div>
        </div>
      )}

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="handle" />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginBottom: 4 }}>Solicitar reserva</h2>
            <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 16 }}>Reserva válida <strong>48 horas</strong>. Te contactamos para el pago.</p>
            <div style={{ background: "#f8f9fa", borderRadius: 12, padding: "8px 14px", marginBottom: 20 }}>
              {cartProducts.map(p => (
                <div key={p._id} style={{ padding: "8px 0", borderBottom: "1px solid #eee", display: "flex", gap: 10, alignItems: "center" }}>
                  <LayersIcon size={20} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{p[NAME]}</p>
                    <p style={{ fontSize: 11, color: "#8e8e93" }}>{p[GRAM] ? p[GRAM] + " gr/m2 · " : ""}{p[ANCHO] && p[LARGO] ? p[ANCHO] + "x" + p[LARGO] + " · " : ""}{p[KGS] ? p[KGS] + " kg" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 6 }}>Nombre *</label>
                <input style={inp} placeholder="Tu nombre completo" value={formData.nombre} onChange={e => setFormData(d => ({ ...d, nombre: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 6 }}>Email *</label>
                <input style={inp} type="email" placeholder="tu@email.com" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 6 }}>Teléfono</label>
                <input style={inp} type="tel" placeholder="600 000 000" value={formData.tel} onChange={e => setFormData(d => ({ ...d, tel: e.target.value }))} />
              </div>
            </div>
            {formError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{formError}</p>}
            <button style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 16, fontWeight: 700, width: "100%", cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }} onClick={doReserve}>Confirmar Reserva</button>
            <button style={{ background: "#fff", color: NAVY, border: "1.5px solid #ddd", borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 600, width: "100%", cursor: "pointer", fontFamily: "inherit" }} onClick={() => setFormOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showBanner && screen !== "splash" && isMobile && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 398, background: NAVY, borderRadius: 14, padding: "14px 16px", zIndex: 150, boxShadow: "0 4px 24px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 12 }}>
          <LayersIcon size={36} />
          <div style={{ flex: 1 }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Añade marketboard a tu inicio</p>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, lineHeight: 1.4 }}>
              Toca <strong style={{ color: GOLD }}>Compartir</strong> → <strong style={{ color: GOLD }}>"Añadir a inicio"</strong>
            </p>
          </div>
          <button onClick={dismissBanner} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer", padding: 4 }}>×</button>
        </div>
      )}
    </div>
  );
}
