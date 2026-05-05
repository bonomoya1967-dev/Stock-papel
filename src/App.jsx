import { useState, useEffect } from "react";

const INITIAL_PRODUCTS = [
  { id: 1,  referencia: "BOB-001", descripcion: "Bobina Kraft 80g",              ancho: 1050, diametro: 900,  peso: 420, formato: "Bobina", cantidad: 3, precio: 185 },
  { id: 2,  referencia: "BOB-002", descripcion: "Bobina Offset 60g",             ancho: 860,  diametro: 780,  peso: 310, formato: "Bobina", cantidad: 2, precio: 145 },
  { id: 3,  referencia: "BOB-003", descripcion: "Bobina Estucado Brillo 90g",    ancho: 1200, diametro: 1000, peso: 560, formato: "Bobina", cantidad: 1, precio: 240 },
  { id: 4,  referencia: "BOB-004", descripcion: "Bobina Cartón Ondulado B",      ancho: 1400, diametro: 1100, peso: 780, formato: "Bobina", cantidad: 4, precio: 320 },
  { id: 5,  referencia: "BOB-005", descripcion: "Bobina Papel Reciclado 70g",    ancho: 950,  diametro: 850,  peso: 380, formato: "Bobina", cantidad: 2, precio: 130 },
  { id: 6,  referencia: "PAL-001", descripcion: "Pallet Estucado Mate 115g 70x100", ancho: null, diametro: null, peso: 500, formato: "Pallet", cantidad: 6, precio: 410 },
  { id: 7,  referencia: "PAL-002", descripcion: "Pallet Offset 80g 65x90",       ancho: null, diametro: null, peso: 450, formato: "Pallet", cantidad: 3, precio: 290 },
  { id: 8,  referencia: "PAL-003", descripcion: "Pallet Cartulina GC2 240g",     ancho: null, diametro: null, peso: 600, formato: "Pallet", cantidad: 2, precio: 520 },
  { id: 9,  referencia: "PAL-004", descripcion: "Pallet Kraft Natural 120g 61x86", ancho: null, diametro: null, peso: 480, formato: "Pallet", cantidad: 5, precio: 360 },
  { id: 10, referencia: "BOB-006", descripcion: "Bobina Tissue 28g",             ancho: 2200, diametro: 1200, peso: 890, formato: "Bobina", cantidad: 1, precio: 195 },
  { id: 11, referencia: "PAL-005", descripcion: "Pallet Estucado Brillo 130g 72x102", ancho: null, diametro: null, peso: 520, formato: "Pallet", cantidad: 4, precio: 475 },
  { id: 12, referencia: "BOB-007", descripcion: "Bobina Periódico 45g",          ancho: 1600, diametro: 950,  peso: 620, formato: "Bobina", cantidad: 3, precio: 110 },
];

const ADMIN_PASSWORD = "admin2026";
const HOURS_48 = 48 * 60 * 60 * 1000;

const getReservations = () => {
  try {
    const data = localStorage.getItem("stock_reservations");
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};
const saveReservations = (data) => {
  try { localStorage.setItem("stock_reservations", JSON.stringify(data)); } catch {}
};

const timeLeft = (expiresAt) => {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expirada";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
};
const isExpired = (expiresAt) => Date.now() > expiresAt;

export default function App() {
  const [view, setView] = useState("catalog");
  const [products] = useState(INITIAL_PRODUCTS);
  const [reservations, setReservations] = useState([]);
  const [selected, setSelected] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", email: "" });
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setReservations(getReservations());
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const valid = reservations.filter(r => r.paid || !isExpired(r.expiresAt));
    if (valid.length !== reservations.length) {
      setReservations(valid);
      saveReservations(valid);
    }
  }, [tick]);

  const reservedIds = reservations
    .filter(r => r.paid || !isExpired(r.expiresAt))
    .flatMap(r => r.items);

  const availableProducts = products.filter(p => !reservedIds.includes(p.id));
  const filteredProducts = filter === "Todos"
    ? availableProducts
    : availableProducts.filter(p => p.formato === filter);

  const toggleSelect = (id) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleReserve = () => {
    if (!formData.nombre.trim() || !formData.email.trim()) {
      setFormError("Por favor rellena nombre y email."); return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setFormError("Email no válido."); return;
    }
    const newRes = {
      id: Date.now(),
      nombre: formData.nombre.trim(),
      email: formData.email.trim(),
      items: selected,
      createdAt: Date.now(),
      expiresAt: Date.now() + HOURS_48,
      paid: false,
    };
    const updated = [...reservations, newRes];
    setReservations(updated);
    saveReservations(updated);
    setSelected([]);
    setFormOpen(false);
    setFormData({ nombre: "", email: "" });
    setFormError("");
    setSuccessMsg(`✓ Reserva creada para ${newRes.nombre}. Te contactaremos en breve. Tienes 48h para confirmar el pago.`);
    setTimeout(() => setSuccessMsg(""), 8000);
  };

  const markPaid = (resId) => {
    const updated = reservations.map(r => r.id === resId ? { ...r, paid: true } : r);
    setReservations(updated);
    saveReservations(updated);
  };

  const deleteReservation = (resId) => {
    const updated = reservations.filter(r => r.id !== resId);
    setReservations(updated);
    saveReservations(updated);
  };

  const adminLogin = () => {
    if (adminPass === ADMIN_PASSWORD) { setAdminAuth(true); setAdminError(""); }
    else setAdminError("Contraseña incorrecta.");
  };

  const getProductById = (id) => products.find(p => p.id === id);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#F5F2EE", color: "#1a1a1a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .card { background: #fff; border-radius: 12px; border: 1px solid #e8e2da; transition: box-shadow 0.2s; }
        .card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .card.selected { border-color: #8B6F47; box-shadow: 0 0 0 2px #8B6F47; }
        .btn-primary { background: #8B6F47; color: #fff; border: none; border-radius: 8px; padding: 12px 24px; font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .btn-primary:hover { background: #73593a; }
        .btn-outline { background: transparent; color: #8B6F47; border: 1.5px solid #8B6F47; border-radius: 8px; padding: 10px 20px; font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-outline:hover { background: #8B6F47; color: #fff; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-bobina { background: #E8F0FB; color: #2563EB; }
        .badge-pallet { background: #FEF3C7; color: #92400E; }
        .badge-paid { background: #D1FAE5; color: #065F46; }
        .badge-pending { background: #FEF3C7; color: #92400E; }
        .badge-expired { background: #FEE2E2; color: #991B1B; }
        .input { width: 100%; padding: 10px 14px; border: 1.5px solid #ddd6cc; border-radius: 8px; font-family: inherit; font-size: 15px; outline: none; transition: border-color 0.2s; background: #faf9f7; }
        .input:focus { border-color: #8B6F47; background: #fff; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(3px); }
        .modal { background: #fff; border-radius: 16px; padding: 32px; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .filter-btn { padding: 7px 18px; border-radius: 20px; border: 1.5px solid #ddd6cc; background: transparent; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; color: #555; }
        .filter-btn.active { background: #8B6F47; color: #fff; border-color: #8B6F47; }
        .success-banner { background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; border-radius: 10px; padding: 14px 20px; font-size: 14px; font-weight: 500; }
        .nav-tab { padding: 10px 20px; border-radius: 8px; border: none; background: transparent; font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; color: #666; transition: all 0.2s; }
        .nav-tab.active { background: #8B6F47; color: #fff; }
        .timer { font-size: 12px; color: #92400E; font-weight: 600; }
      `}</style>

      <header style={{ background: "#fff", borderBottom: "1px solid #e8e2da", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 40 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400 }}>Stock Papel & Bobinas</h1>
          <p style={{ fontSize: 11, color: "#999", marginTop: 1 }}>Abril 2026 — Reservas online</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`nav-tab ${view === "catalog" ? "active" : ""}`} onClick={() => setView("catalog")}>Catálogo</button>
          <button className={`nav-tab ${view === "admin" ? "active" : ""}`} onClick={() => { setView("admin"); setAdminAuth(false); setAdminPass(""); }}>Admin</button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {view === "catalog" && (
          <div>
            {successMsg && <div className="success-banner" style={{ marginBottom: 20 }}>{successMsg}</div>}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: "#666" }}>
                <strong style={{ color: "#1a1a1a" }}>{filteredProducts.length}</strong> productos disponibles
                {selected.length > 0 && <> · <strong style={{ color: "#8B6F47" }}>{selected.length} seleccionados</strong></>}
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                {["Todos", "Bobina", "Pallet"].map(f => (
                  <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}s</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 100 }}>
              {filteredProducts.map(p => {
                const isSel = selected.includes(p.id);
                return (
                  <div key={p.id} className={`card ${isSel ? "selected" : ""}`} style={{ padding: 18, cursor: "pointer", userSelect: "none" }} onClick={() => toggleSelect(p.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span className={`badge badge-${p.formato.toLowerCase()}`}>{p.formato}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#999" }}>{p.referencia}</span>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${isSel ? "#8B6F47" : "#ddd"}`, background: isSel ? "#8B6F47" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isSel && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </div>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, lineHeight: 1.3 }}>{p.descripcion}</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {p.ancho && <div style={{ fontSize: 12, color: "#888" }}>Ancho: <strong style={{ color: "#444" }}>{p.ancho} mm</strong></div>}
                      {p.diametro && <div style={{ fontSize: 12, color: "#888" }}>Ø: <strong style={{ color: "#444" }}>{p.diametro} mm</strong></div>}
                      <div style={{ fontSize: 12, color: "#888" }}>Peso: <strong style={{ color: "#444" }}>{p.peso} kg</strong></div>
                      <div style={{ fontSize: 12, color: "#888" }}>Unidades: <strong style={{ color: "#444" }}>{p.cantidad}</strong></div>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0ede9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#8B6F47" }}>{p.precio} €</span>
                      <span style={{ fontSize: 11, color: p.cantidad <= 2 ? "#DC2626" : "#16A34A", fontWeight: 600 }}>
                        {p.cantidad <= 2 ? "⚠ Pocas unidades" : "✓ Disponible"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "#999" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                  <p>No hay stock disponible en esta categoría</p>
                </div>
              )}
            </div>
            {selected.length > 0 && (
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e8e2da", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)", zIndex: 30 }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{selected.length} producto{selected.length > 1 ? "s" : ""} seleccionado{selected.length > 1 ? "s" : ""}</p>
                  <p style={{ fontSize: 12, color: "#999" }}>Se reservarán durante 48 horas</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-outline" onClick={() => setSelected([])}>Limpiar</button>
                  <button className="btn-primary" onClick={() => setFormOpen(true)}>Reservar ahora →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === "admin" && (
          <div>
            {!adminAuth ? (
              <div style={{ maxWidth: 380, margin: "60px auto" }}>
                <div className="card" style={{ padding: 32 }}>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, marginBottom: 8 }}>Acceso Admin</h2>
                  <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Introduce la contraseña para gestionar las reservas.</p>
                  <input className="input" type="password" placeholder="Contraseña" value={adminPass}
                    onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === "Enter" && adminLogin()}
                    style={{ marginBottom: 12 }} />
                  {adminError && <p style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{adminError}</p>}
                  <button className="btn-primary" style={{ width: "100%" }} onClick={adminLogin}>Entrar</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400 }}>Gestión de Reservas</h2>
                  <p style={{ color: "#888", fontSize: 13, marginTop: 2 }}>{reservations.length} reservas · {reservations.filter(r => r.paid).length} pagadas</p>
                </div>
                {reservations.length === 0 ? (
                  <div className="card" style={{ padding: 48, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                    <p style={{ color: "#888" }}>No hay reservas todavía.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {reservations.map(res => {
                      const expired = !res.paid && isExpired(res.expiresAt);
                      const resProducts = res.items.map(getProductById).filter(Boolean);
                      return (
                        <div key={res.id} className="card" style={{ padding: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{res.nombre}</h3>
                                <span className={`badge ${res.paid ? "badge-paid" : expired ? "badge-expired" : "badge-pending"}`}>
                                  {res.paid ? "✓ Pagada" : expired ? "Expirada" : "Pendiente"}
                                </span>
                              </div>
                              <p style={{ fontSize: 13, color: "#888" }}>{res.email}</p>
                              <p style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Creada: {new Date(res.createdAt).toLocaleString("es-ES")}</p>
                              {!res.paid && !expired && <p className="timer" style={{ marginTop: 4 }}>⏱ Expira en: {timeLeft(res.expiresAt)}</p>}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {!res.paid && !expired && (
                                <button className="btn-primary" style={{ fontSize: 13, padding: "8px 16px", background: "#16A34A" }} onClick={() => markPaid(res.id)}>
                                  ✓ Marcar pagada
                                </button>
                              )}
                              <button className="btn-outline" style={{ fontSize: 13, padding: "8px 16px", color: "#DC2626", borderColor: "#DC2626" }} onClick={() => deleteReservation(res.id)}>
                                Eliminar
                              </button>
                            </div>
                          </div>
                          <div style={{ background: "#F5F2EE", borderRadius: 8, padding: 14 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Productos reservados</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {resProducts.map(p => (
                                <div key={p.id} style={{ background: "#fff", border: "1px solid #e8e2da", borderRadius: 6, padding: "6px 12px" }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{p.referencia}</span>
                                  <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>{p.descripcion}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "#8B6F47", marginLeft: 8 }}>{p.precio}€</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {formOpen && (
        <div className="overlay" onClick={() => setFormOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 400, marginBottom: 6 }}>Solicitar reserva</h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              Los productos se reservarán <strong>48 horas</strong> mientras gestionamos el pago contigo.
            </p>
            <div style={{ background: "#F5F2EE", borderRadius: 8, padding: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 8 }}>PRODUCTOS SELECCIONADOS ({selected.length})</p>
              {selected.map(id => {
                const p = products.find(x => x.id === id);
                return p ? (
                  <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "#555" }}>{p.referencia} — {p.descripcion}</span>
                    <strong style={{ color: "#8B6F47" }}>{p.precio}€</strong>
                  </div>
                ) : null;
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#555", display: "block", marginBottom: 6 }}>Nombre completo *</label>
                <input className="input" type="text" placeholder="Tu nombre" value={formData.nombre} onChange={e => setFormData(d => ({ ...d, nombre: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#555", display: "block", marginBottom: 6 }}>Email *</label>
                <input className="input" type="email" placeholder="tu@email.com" value={formData.email} onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} />
              </div>
            </div>
            {formError && <p style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{formError}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => setFormOpen(false)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={handleReserve}>Confirmar reserva →</button>
            </div>
            <p style={{ fontSize: 11, color: "#bbb", marginTop: 14, textAlign: "center" }}>
              Nos pondremos en contacto contigo para gestionar el pago.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

