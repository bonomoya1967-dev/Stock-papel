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

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#f5f6fa", fontFamily: "'Segoe UI', -apple-system, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #bbb; font-size: 12px; }
        .row-item { background: #fff; padding: 13px 16px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .row-item:active { background: #f9f9f9; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f2f2f7; font-size: 14px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; }
        .modal-sheet { background: #fff; border-radius: 20px 20px 0 0; padding: 0 20px 44px; width: 100%; max-height: 93vh; overflow-y: auto; }
        .handle { width: 40px; height: 4px; background: #ddd; border-radius: 2px; margin: 12px auto 18px; }
        .bottom-bar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: #fff; border-top: 1px solid #eee; display: flex; padding-bottom: 20px; padding-top: 10px; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; }
        .nav-label { font-size: 10px; font-weight: 600; }
        .btn-navy { background: ${NAVY}; color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 16px; font-weight: 700; width: 100%; cursor: pointer; font-family: inherit; }
        .btn-outline { background: #fff; color: ${NAVY}; border: 1.5px solid #ddd; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 600; width: 100%; cursor: pointer; font-family: inherit; }
        .cart-bar { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: ${NAVY}; padding: 13px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 90; }
      `}</style>

      {screen === "splash" && (
        <div style={{ minHeight: "100vh", background: NAVY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ marginBottom: 32 }}><LayersIcon size={80} /></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
            <span style={{ color: "#fff", fontSize: 32, fontWeight: 400, fontFamily: "Georgia, serif" }}>market</span>
            <span style={{ color: "#fff", fontSize: 32, fontWeight: 800 }}>board</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, marginBottom: 64, textAlign: "center" }}>Stock Cartón · Reservas online</p>
          <button onClick={() => setScreen("list")}
            style={{ background: GOLD, color: "#fff", border: "none", borderRadius: 14, padding: "16px 48px", fontSize: 17, fontWeight: 700, cursor: "pointer", width: "100%", maxWidth: 280 }}>
            Entrar al catálogo →
          </button>
        </div>
      )}

      {screen === "list" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={{ background: NAVY, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <LayersIcon size={28} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ color: "#fff", fontSize: 18, fontWeight: 400, fontFamily: "Georgia, serif" }}>market</span>
                  <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>board</span>
                </div>
              </div>
              <div style={{ color: "#fff", fontSize: 22 }}>☰</div>
            </div>
          </div>

          <div style={{ padding: "12px 16px 12px", background: "#fff", borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <input style={inp} placeholder="Producto" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && e.target.blur()} />
              </div>
              <div style={{ flex: 1 }}>
                <input style={inp} placeholder="Gramaje" value={searchGram} onChange={e => setSearchGram(e.target.value)} onKeyDown={e => e.key === "Enter" && e.target.blur()} />
              </div>
            </div>
            <button style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 700, width: "100%", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              🔍 Buscar
            </button>
          </div>

          {successMsg && <div style={{ background: "#d1fae5", color: "#065f46", padding: "10px 16px", fontSize: 13, fontWeight: 500 }}>{successMsg}</div>}
          {loading && <div style={{ textAlign: "center", padding: 48, color: "#8e8e93" }}>⏳ Cargando productos...</div>}
          {loadError && <div style={{ background: "#fee2e2", color: "#991b1b", margin: 16, borderRadius: 10, padding: 14, textAlign: "center", fontSize: 13 }}>Error al cargar productos.</div>}

          {!loading && !loadError && filteredProducts.map(p => {
            const inCart = cart.includes(p._id);
            return (
              <div key={p._id} className="row-item" onClick={() => { setSelected(p); setScreen("detail"); }}>
                <div style={{ flexShrink: 0 }}><LayersIcon size={32} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 2, lineHeight: 1.3 }}>
                    {p[NAME]}{p[GRAM] ? ` ${p[GRAM]} gr/m2` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#8e8e93" }}>
                    {p[ANCHO] && p[LARGO] ? `${p[ANCHO]}x${p[LARGO]}` : ""}{p[KGS] ? ` · ${p[KGS]} kg` : ""}
                  </div>
                </div>
                <button onClick={e => toggleCart(p._id, e)}
                  style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20, fontWeight: 700, background: inCart ? "#16a34a" : NAVY, color: "#fff" }}>
                  {inCart ? "✓" : "+"}
                </button>
              </div>
            );
          })}

          {!loading && !loadError && filteredProducts.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#8e8e93" }}>📦 No hay productos disponibles</div>
          )}

          {cart.length > 0 && (
            <div className="cart-bar">
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{cart.length} producto{cart.length > 1 ? "s" : ""} seleccionado{cart.length > 1 ? "s" : ""}</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Reserva 48h · sin pago online</p>
              </div>
              <button onClick={() => setScreen("reservas")}
                style={{ background: GOLD, color: "#fff", border: "none", borderRadius: 20, padding: "9px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Ver cesta →
              </button>
            </div>
          )}
        </div>
      )}

      {screen === "detail" && selected && (
        <div style={{ paddingBottom: 100, background: "#fff", minHeight: "100vh" }}>
          <div style={{ background: NAVY, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setScreen("list")} style={{ background: "none", border: "none", color: "#fff", fontSize: 26, cursor: "pointer", padding: 0 }}>‹</button>
            <LayersIcon size={24} />
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Detalle</span>
          </div>
          <div style={{ padding: "20px 16px 0" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginBottom: 4 }}>{selected[NAME]}</h1>
            <p style={{ fontSize: 12, color: "#8e8e93", marginBottom: 20, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {selected[CAT] ? selected[CAT] + "  " : ""}{selected[GRAM] ? selected[GRAM] + " gr/m2  " : ""}{selected[ANCHO] && selected[LARGO] ? `${selected[ANCHO]}x${selected[LARGO]}` : ""}
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button style={{ flex: 1, background: cart.includes(selected._id) ? "#16a34a" : NAVY, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                onClick={e => toggleCart(selected._id, e)}>
                {cart.includes(selected._id) ? "✓ Seleccionado" : "+ Añadir a reserva"}
              </button>
              <button onClick={() => setScreen("list")} style={{ flex: 1, background: "#fff", color: NAVY, border: "1.5px solid #ddd", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Volver</button>
            </div>
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

      {screen === "reservas" && (
        <div style={{ paddingBottom: cart.length > 0 ? 150 : 80 }}>
          <div style={{ background: NAVY, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <LayersIcon size={28} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ color: "#fff", fontSize: 18, fontWeight: 400, fontFamily: "Georgia, serif" }}>market</span>
                  <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>board</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #eee" }}>
            <p style={{ fontSize: 13, color: "#8e8e93" }}>
              {cart.length === 0 ? "Sin productos seleccionados" : `${cart.length} producto${cart.length > 1 ? "s" : ""} seleccionado${cart.length > 1 ? "s" : ""}`}
            </p>
          </div>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#8e8e93" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>No has seleccionado ningún producto</div>
              <button onClick={() => setScreen("list")} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Ver productos</button>
            </div>
          ) : (
            <>
              {cartProducts.map(p => (
                <div key={p._id} className="row-item" onClick={() => { setSelected(p); setScreen("detail"); }}>
                  <div style={{ flexShrink: 0 }}><LayersIcon size={32} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 2 }}>{p[NAME]}{p[GRAM] ? ` ${p[GRAM]} gr/m2` : ""}</div>
                    <div style={{ fontSize: 12, color: "#8e8e93" }}>{p[ANCHO] && p[LARGO] ? `${p[ANCHO]}x${p[LARGO]}` : ""}{p[KGS] ? ` · ${p[KGS]} kg` : ""}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleCart(p._id); }}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: "#fee2e2", border: "none", color: "#dc2626", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
                </div>
              ))}
              <div className="cart-bar">
                <div>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{cart.length} producto{cart.length > 1 ? "s" : ""}</p>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Reserva 48h · sin pago online</p>
                </div>
                <button onClick={() => setFormOpen(true)} style={{ background: GOLD, color: "#fff", border: "none", borderRadius: 20, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Solicitar →</button>
              </div>
            </>
          )}
        </div>
      )}

      {screen === "admin" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={{ background: NAVY, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <UserIcon size={36} color="#fff" />
              <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>Admin</span>
            </div>
          </div>
          {!adminAuth ? (
            <div style={{ padding: 20 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <div style={{ background: NAVY, borderRadius: "50%", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <UserIcon size={70} color="#fff" />
                  </div>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 6, textAlign: "center" }}>Acceso Admin</h2>
                <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 20, textAlign: "center" }}>Solo para uso interno.</p>
                <input style={{ ...inp, marginBottom: 12 }} type="password" placeholder="Contraseña"
                  value={adminPass} onChange={e => setAdminPass(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Contraseña incorrecta."); }}} />
                {adminError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>{adminError}</p>}
                <button className="btn-navy" onClick={() => { adminPass === ADMIN_PASSWORD ? (setAdminAuth(true), setAdminError("")) : setAdminError("Contraseña incorrecta."); }}>Entrar</button>
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
                  <div key={res.id} style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" }}>
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
                        <div key={p._id} style={{ fontSize: 12, color: "#444", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                          <LayersIcon size={14} />
                          {p[NAME]} {p[GRAM] ? `${p[GRAM]}gr · ` : ""}{p[ANCHO] && p[LARGO] ? `${p[ANCHO]}x${p[LARGO]} · ` : ""}{p[KGS] ? `${p[KGS]}kg` : ""}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!res.paid && !expired && (
                        <button onClick={() => markPaid(res.id)} style={{ flex: 2, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓ Marcar pagada</button>
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

      {screen !== "splash" && (
        <div className="bottom-bar">
          <div className="nav-item" onClick={() => setScreen("list")}>
            <span style={{ fontSize: 22 }}>📦</span>
            <span className="nav-label" style={{ color: screen === "list" ? NAVY : "#aaa" }}>Productos</span>
            {screen === "list" && <div style={{ width: 20, height: 2, background: NAVY, borderRadius: 1, marginTop: 2 }} />}
          </div>
          <div className="nav-item" onClick={() => setScreen("reservas")}>
            <div style={{ position: "relative" }}>
              <span style={{ fontSize: 22 }}>📋</span>
              {cart.length > 0 && <span style={{ position: "absolute", top: -4, right: -8, background: "#dc2626", color: "#fff", borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "1px 5px", minWidth: 16, textAlign: "center" }}>{cart.length}</span>}
            </div>
            <span className="nav-label" style={{ color: screen === "reservas" ? NAVY : "#aaa" }}>Mis Reservas</span>
            {screen === "reservas" && <div style={{ width: 20, height: 2, background: NAVY, borderRadius: 1, marginTop: 2 }} />}
          </div>
          <div className="nav-item" onClick={() => { setScreen("admin"); setAdminAuth(false); setAdminPass(""); }}>
            <UserIcon size={36} color={screen === "admin" ? NAVY : "#aaa"} />
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
            <button className="btn-navy" style={{ marginBottom: 10 }} onClick={doReserve}>Confirmar Reserva</button>
            <button className="btn-outline" onClick={() => setFormOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showBanner && screen !== "splash" && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 398, background: NAVY, borderRadius: 14, padding: "14px 16px", zIndex: 150, boxShadow: "0 4px 24px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flexShrink: 0 }}>
            <LayersIcon size={36} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Añade marketboard a tu inicio</p>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, lineHeight: 1.4 }}>
              Toca <strong style={{ color: GOLD }}>Compartir</strong> → <strong style={{ color: GOLD }}>"Añadir a inicio"</strong>
            </p>
          </div>
          <button onClick={dismissBanner} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer", padding: 4, flexShrink: 0 }}>×</button>
        </div>
      )}
    </div>
  );
}
