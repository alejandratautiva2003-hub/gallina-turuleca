import { useState, useEffect } from "react";

const SUPABASE_URL = "https://grbvtumbeqawqyyywlpm.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZFb1kUqN9YUJYJV1Fw_Hbg_2auJAntq";

async function db(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

const PAYMENT_INFO = `💳 *Pago:* Nequi / Daviplata: 3114819989\nLlave: @LAT572`;
const CLOSING_MSG = `Gracias por su pedido 🙏 Por favor confirme el pago respondiendo este mensaje.`;
const EGG_TYPES = ["AA", "Extra", "Jumbo"];

function fmt(n) {
  return "$" + Math.round(n).toLocaleString("es-CO");
}
function formatDate(d) {
  const [, m, day] = d.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(day)} ${months[parseInt(m)-1]}`;
}
function totalDespacho(d) {
  return (d.lineas || []).reduce((s, l) => s + l.cubetas * l.salePrice, 0);
}
function costoDespacho(d) {
  return (d.lineas || []).reduce((s, l) => s + l.cubetas * l.costPrice, 0);
}
function resumenLineas(d) {
  return (d.lineas || []).map(l => `${l.tipo} x${l.cubetas}`).join(", ");
}
function getStatus(d) {
  const total = totalDespacho(d);
  if (d.paid >= total) return "pagado";
  if (d.paid > 0) return "parcial";
  return "pendiente";
}
function buildWhatsAppMsg(client, d) {
  const lineasTxt = (d.lineas || [])
    .map(l => `▸ ${l.tipo}: ${l.cubetas} cubetas x ${fmt(l.salePrice)} = *${fmt(l.cubetas * l.salePrice)}*`)
    .join("\n");
  const total = totalDespacho(d);
  return encodeURIComponent(
`🥚 *La Gallina Turuleca*
*Factura No. ${String(d.invoice_num).padStart(4,"0")}* · ${formatDate(d.date)} ${new Date().getFullYear()}

*Cliente:* ${client.name}

${lineasTxt}

*Total a pagar: ${fmt(total)}*

${PAYMENT_INFO}

${CLOSING_MSG}`
  );
}

function Badge({ status }) {
  const styles = {
    pendiente: "bg-amber-50 text-amber-800 border border-amber-200",
    parcial:   "bg-orange-50 text-orange-800 border border-orange-200",
    pagado:    "bg-green-50 text-green-800 border border-green-200",
  };
  const labels = { pendiente: "Pendiente", parcial: "Abono", pagado: "Pagado ✓" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>{labels[status]}</span>;
}

function DeleteButton({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) return (
    <div className="flex gap-1 items-center">
      <span className="text-xs text-red-500 font-medium">¿Seguro?</span>
      <button onClick={onConfirm} className="bg-red-500 text-white text-xs rounded-lg px-2 py-1 font-semibold hover:bg-red-600 active:scale-95 transition-all">Sí, borrar</button>
      <button onClick={() => setConfirming(false)} className="border border-gray-200 text-gray-500 text-xs rounded-lg px-2 py-1 hover:bg-gray-50 active:scale-95 transition-all">No</button>
    </div>
  );
  return <button onClick={() => setConfirming(true)} className="border border-red-100 text-red-400 text-xs rounded-xl py-2 px-3 hover:bg-red-50 active:scale-95 transition-all">🗑</button>;
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400";

function Spinner() {
  return <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"/></div>;
}

// ── RESUMEN ────────────────────────────────────────────────────────────────
function Resumen({ despachos, clients, prices, onDelete, loading }) {
  const totalCobrar = despachos.reduce((s,d) => s + Math.max(0, totalDespacho(d) - d.paid), 0);
  const totalProveedor = despachos.filter(d => !d.provider_paid).reduce((s,d) => s + costoDespacho(d), 0);
  const cobradoTotal = despachos.reduce((s,d) => s + d.paid, 0);
  const costoTotal = despachos.reduce((s,d) => s + costoDespacho(d), 0);
  const ganancia = cobradoTotal - costoTotal;
  const recent = [...despachos].sort((a,b) => b.id - a.id).slice(0,6);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
          <p className="text-xs text-amber-700 font-medium mb-1">Por cobrar</p>
          <p className="text-lg font-semibold text-amber-900">{fmt(totalCobrar)}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
          <p className="text-xs text-blue-700 font-medium mb-1">Al proveedor</p>
          <p className="text-lg font-semibold text-blue-900">{fmt(totalProveedor)}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-3 border border-green-100">
          <p className="text-xs text-green-700 font-medium mb-1">Ganancia</p>
          <p className="text-lg font-semibold text-green-900">{fmt(ganancia)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Precios actuales</p>
        {prices.length === 0 ? <Spinner /> : (
          <div className="space-y-2">
            {prices.map(p => (
              <div key={p.tipo} className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{p.tipo}</span>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>Cliente: <span className="font-semibold text-gray-800">{fmt(p.sale)}</span></span>
                  <span>Prov: <span className="font-semibold text-gray-800">{fmt(p.cost)}</span></span>
                  <span className="text-green-700 font-semibold">+{fmt(p.sale - p.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Despachos recientes</p>
        {loading ? <Spinner /> : recent.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm"><p className="text-3xl mb-2">📦</p><p>Aún no hay despachos</p></div>
        ) : (
          <div className="space-y-2">
            {recent.map(d => {
              const client = clients.find(c => c.id === d.client_id);
              const total = totalDespacho(d);
              return (
                <div key={d.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{client?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{resumenLineas(d)} · {formatDate(d.date)}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-semibold text-gray-800 text-sm">{fmt(total)}</p>
                    <Badge status={getStatus(d)} />
                    <DeleteButton onConfirm={() => onDelete(d.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── DESPACHAR ──────────────────────────────────────────────────────────────
function Despachar({ clients, prices, onDespacho }) {
  const [clientId, setClientId] = useState("");
  const [lineas, setLineas] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prices.length > 0) {
      const p = prices.find(x => x.tipo === "AA") || prices[0];
      setLineas([{ tipo: p.tipo, cubetas: "", salePrice: p.sale, costPrice: p.cost }]);
    }
  }, [prices]);

  useEffect(() => {
    if (clients.length > 0 && !clientId) setClientId(clients[0].id);
  }, [clients]);

  function getPrecio(tipo) {
    return prices.find(p => p.tipo === tipo) || { sale: 0, cost: 0 };
  }

  function addLinea() {
    const usados = lineas.map(l => l.tipo);
    const disponible = EGG_TYPES.find(t => !usados.includes(t));
    if (!disponible) return;
    const p = getPrecio(disponible);
    setLineas(prev => [...prev, { tipo: disponible, cubetas: "", salePrice: p.sale, costPrice: p.cost }]);
  }

  function removeLinea(i) { setLineas(prev => prev.filter((_,idx) => idx !== i)); }

  function updateLinea(i, field, value) {
    setLineas(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      if (field === "tipo") { const p = getPrecio(value); return { ...l, tipo: value, salePrice: p.sale, costPrice: p.cost }; }
      return { ...l, [field]: value };
    }));
  }

  const totalVenta = lineas.reduce((s,l) => s + (Number(l.cubetas)||0) * Number(l.salePrice), 0);
  const totalCosto = lineas.reduce((s,l) => s + (Number(l.cubetas)||0) * Number(l.costPrice), 0);
  const tiposUsados = lineas.map(l => l.tipo);

  async function handleDespachar() {
    const client = clients.find(c => c.id === Number(clientId));
    if (!client) return;
    const lineasValidas = lineas.filter(l => Number(l.cubetas) > 0);
    if (!lineasValidas.length) return;
    setSaving(true);
    try {
      const newD = await onDespacho({
        client_id: Number(clientId),
        lineas: lineasValidas.map(l => ({ tipo: l.tipo, cubetas: Number(l.cubetas), salePrice: Number(l.salePrice), costPrice: Number(l.costPrice) })),
      });
      const msg = buildWhatsAppMsg(client, newD);
      window.open(`https://wa.me/${client.phone}?text=${msg}`, "_blank");
      const p = getPrecio("AA");
      setLineas([{ tipo: "AA", cubetas: "", salePrice: p.sale, costPrice: p.cost }]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally { setSaving(false); }
  }

  if (clients.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-400">
      <p className="text-3xl mb-2">👥</p><p>Primero agrega un cliente en la pestaña Clientes</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <p className="text-sm font-semibold text-gray-700">Nuevo despacho</p>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
        <select className={inputCls} value={clientId} onChange={e => setClientId(e.target.value)}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        <p className="text-xs text-gray-500 font-medium">Tipos de huevo</p>
        {lineas.map((l,i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {EGG_TYPES.map(t => (
                  <button key={t} onClick={() => updateLinea(i,"tipo",t)} disabled={tiposUsados.includes(t) && l.tipo !== t}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${l.tipo===t ? "bg-yellow-500 text-white" : tiposUsados.includes(t) ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-white border border-gray-200 text-gray-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
              {lineas.length > 1 && <button onClick={() => removeLinea(i)} className="text-red-300 hover:text-red-500 text-lg px-1">×</button>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-gray-400 mb-1 block">Cubetas</label><input type="number" className={inputCls} placeholder="0" min={1} value={l.cubetas} onChange={e => updateLinea(i,"cubetas",e.target.value)}/></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Precio cliente</label><input type="number" className={inputCls} value={l.salePrice} onChange={e => updateLinea(i,"salePrice",e.target.value)}/></div>
              <div><label className="text-xs text-gray-400 mb-1 block">Costo prov.</label><input type="number" className={inputCls} value={l.costPrice} onChange={e => updateLinea(i,"costPrice",e.target.value)}/></div>
            </div>
            {Number(l.cubetas) > 0 && (
              <div className="flex justify-between text-xs text-gray-500 pt-1">
                <span>Subtotal: <span className="font-semibold text-gray-700">{fmt(Number(l.cubetas)*Number(l.salePrice))}</span></span>
                <span className="text-green-700">+{fmt(Number(l.cubetas)*(Number(l.salePrice)-Number(l.costPrice)))}</span>
              </div>
            )}
          </div>
        ))}
        {lineas.length < EGG_TYPES.length && (
          <button onClick={addLinea} className="w-full border-2 border-dashed border-yellow-200 text-yellow-600 rounded-xl py-2 text-xs font-medium hover:bg-yellow-50 active:scale-95 transition-all">+ Agregar otro tipo de huevo</button>
        )}
      </div>
      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between text-sm"><span className="text-gray-500">Total a cobrar</span><span className="font-semibold text-gray-800">{fmt(totalVenta)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">Costo proveedor</span><span className="text-blue-700">{fmt(totalCosto)}</span></div>
        <div className="h-px bg-gray-200"/>
        <div className="flex justify-between text-sm"><span className="text-gray-500">Tu ganancia</span><span className="font-semibold text-green-700">{fmt(totalVenta-totalCosto)}</span></div>
      </div>
      <button onClick={handleDespachar} disabled={saving} className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60">
        {saving ? "Guardando..." : <><span>📤</span> Despachar y enviar por WhatsApp</>}
      </button>
      {showSuccess && <div className="text-center text-sm text-green-700 bg-green-50 rounded-xl py-2 border border-green-100">✓ Despacho registrado y WhatsApp abierto</div>}
    </div>
  );
}

// ── COBROS ─────────────────────────────────────────────────────────────────
function Cobros({ despachos, clients, onPago, onDelete, loading }) {
  const [selectedId, setSelectedId] = useState(null);
  const [abonoVal, setAbonoVal] = useState("");
  const [saving, setSaving] = useState(false);

  const pendientes = despachos.filter(d => getStatus(d) !== "pagado").sort((a,b) => b.id-a.id);
  const pagados    = despachos.filter(d => getStatus(d) === "pagado").sort((a,b) => b.id-a.id);

  async function handleAbono(d) {
    const abono = Number(abonoVal);
    if (!abono || abono <= 0) return;
    setSaving(true);
    await onPago(d.id, d.paid + abono);
    setAbonoVal(""); setSelectedId(null); setSaving(false);
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {pendientes.length === 0 && <div className="text-center py-10 text-gray-400 text-sm"><p className="text-3xl mb-2">🎉</p><p>Todo al día, sin cobros pendientes</p></div>}
      {pendientes.map(d => {
        const client = clients.find(c => c.id === d.client_id);
        const total = totalDespacho(d);
        const pendiente = total - d.paid;
        const status = getStatus(d);
        const isOpen = selectedId === d.id;
        return (
          <div key={d.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{client?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{resumenLineas(d)} · {formatDate(d.date)} · #{String(d.invoice_num).padStart(4,"0")}</p>
                  {status==="parcial" && <p className="text-xs text-orange-600 mt-0.5">Abonó {fmt(d.paid)} · Resta {fmt(pendiente)}</p>}
                </div>
                <div className="text-right"><p className="font-bold text-gray-800 text-sm">{fmt(pendiente)}</p><div className="mt-1"><Badge status={status}/></div></div>
              </div>
            </div>
            <div className="px-4 pb-3 flex gap-2">
              <DeleteButton onConfirm={() => onDelete(d.id)} />
              <button onClick={() => setSelectedId(isOpen ? null : d.id)} className="flex-1 border border-gray-200 text-gray-600 text-xs rounded-xl py-2 font-medium hover:bg-gray-50 active:scale-95 transition-all">{isOpen ? "Cancelar" : "Registrar abono"}</button>
              <button onClick={() => onPago(d.id, total)} className="flex-1 bg-green-500 text-white text-xs rounded-xl py-2 font-semibold hover:bg-green-600 active:scale-95 transition-all">Pago completo ✓</button>
            </div>
            {isOpen && (
              <div className="px-4 pb-4 flex gap-2 border-t border-gray-50 pt-3">
                <input type="number" placeholder="Valor del abono" className={inputCls + " flex-1"} value={abonoVal} onChange={e => setAbonoVal(e.target.value)}/>
                <button onClick={() => handleAbono(d)} disabled={saving} className="bg-amber-500 text-white text-xs rounded-xl px-4 font-semibold hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-60">{saving ? "..." : "Guardar"}</button>
              </div>
            )}
          </div>
        );
      })}
      {pagados.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pt-2">Cobrado</p>
          {pagados.map(d => {
            const client = clients.find(c => c.id === d.client_id);
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex justify-between items-center opacity-70">
                <div><p className="font-medium text-gray-700 text-sm">{client?.name}</p><p className="text-xs text-gray-400">{resumenLineas(d)} · {formatDate(d.date)}</p></div>
                <div className="text-right"><p className="font-semibold text-gray-700 text-sm">{fmt(totalDespacho(d))}</p><Badge status="pagado"/></div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── PROVEEDOR ──────────────────────────────────────────────────────────────
function Proveedor({ despachos, clients, onProviderPaid, onDelete, loading }) {
  const pendientes = despachos.filter(d => !d.provider_paid).sort((a,b) => b.id-a.id);
  const pagados    = despachos.filter(d => d.provider_paid).sort((a,b) => b.id-a.id);
  const totalDebo  = pendientes.reduce((s,d) => s + costoDespacho(d), 0);
  const totalPague = pagados.reduce((s,d) => s + costoDespacho(d), 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100"><p className="text-xs text-blue-700 font-medium mb-1">Le debo</p><p className="text-xl font-bold text-blue-900">{fmt(totalDebo)}</p></div>
        <div className="bg-green-50 rounded-2xl p-3 border border-green-100"><p className="text-xs text-green-700 font-medium mb-1">Ya le pagué</p><p className="text-xl font-bold text-green-900">{fmt(totalPague)}</p></div>
      </div>
      {pendientes.length === 0 && <div className="text-center py-8 text-gray-400 text-sm"><p className="text-3xl mb-2">✅</p><p>Proveedor al día</p></div>}
      {pendientes.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Por pagar al proveedor</p>
          {pendientes.map(d => {
            const client = clients.find(c => c.id === d.client_id);
            const costo = costoDespacho(d);
            const gananciaD = totalDespacho(d) - costo;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{client?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{resumenLineas(d)} · {formatDate(d.date)}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {(d.lineas||[]).map(l => <span key={l.tipo} className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{l.tipo}: {fmt(l.cubetas*l.costPrice)}</span>)}
                      </div>
                      <p className="text-xs text-green-600 mt-1">Tu ganancia: {fmt(gananciaD)}</p>
                    </div>
                    <p className="font-bold text-blue-800 text-sm">{fmt(costo)}</p>
                  </div>
                </div>
                <div className="px-4 pb-3 flex gap-2">
                  <DeleteButton onConfirm={() => onDelete(d.id)} />
                  <button onClick={() => onProviderPaid(d.id)} className="flex-1 bg-blue-600 text-white text-xs rounded-xl py-2.5 font-semibold hover:bg-blue-700 active:scale-95 transition-all">Marcar como pagado al proveedor ✓</button>
                </div>
              </div>
            );
          })}
        </>
      )}
      {pagados.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pt-2">Ya pagados</p>
          {pagados.map(d => {
            const client = clients.find(c => c.id === d.client_id);
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex justify-between items-center opacity-60">
                <div><p className="font-medium text-gray-700 text-sm">{client?.name}</p><p className="text-xs text-gray-400">{resumenLineas(d)} · {formatDate(d.date)}</p></div>
                <div className="text-right"><p className="font-semibold text-gray-700 text-sm">{fmt(costoDespacho(d))}</p><span className="text-xs text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">Pagado ✓</span></div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── CLIENTES ───────────────────────────────────────────────────────────────
function Clientes({ clients, onAddClient, onDeleteClient, loading }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name.trim() || !phone.trim()) return;
    const clean = phone.replace(/\D/g,"");
    const intl = clean.startsWith("57") ? clean : "57" + clean;
    setSaving(true);
    await onAddClient({ name: name.trim(), phone: intl });
    setName(""); setPhone(""); setAdding(false); setSaving(false);
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setAdding(!adding)} className="w-full border-2 border-dashed border-yellow-300 text-yellow-700 rounded-2xl py-3 text-sm font-medium hover:bg-yellow-50 active:scale-95 transition-all">{adding ? "Cancelar" : "+ Agregar cliente"}</button>
      {adding && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <input placeholder="Nombre del cliente" className={inputCls} value={name} onChange={e => setName(e.target.value)}/>
          <input placeholder="Número WhatsApp (ej: 3001234567)" className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} type="tel"/>
          <button onClick={handleAdd} disabled={saving} className="w-full bg-yellow-500 text-white text-sm rounded-xl py-2.5 font-semibold hover:bg-yellow-600 active:scale-95 transition-all disabled:opacity-60">{saving ? "Guardando..." : "Guardar cliente"}</button>
        </div>
      )}
      {loading ? <Spinner /> : clients.length === 0 && !adding ? (
        <div className="text-center py-8 text-gray-400 text-sm"><p className="text-3xl mb-2">👥</p><p>Aún no hay clientes</p></div>
      ) : clients.map(c => (
        <div key={c.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center text-sm font-bold text-yellow-700">{c.name.charAt(0).toUpperCase()}</div>
            <div><p className="font-medium text-gray-800 text-sm">{c.name}</p><p className="text-xs text-gray-400">+{c.phone}</p></div>
          </div>
          <button onClick={() => onDeleteClient(c.id)} className="text-gray-300 hover:text-red-400 text-lg transition-colors px-1">×</button>
        </div>
      ))}
    </div>
  );
}

// ── PRECIOS ────────────────────────────────────────────────────────────────
function Precios({ prices, onSavePrices, loading }) {
  const [vals, setVals] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = {};
    prices.forEach(p => { map[p.tipo] = { sale: p.sale, cost: p.cost, id: p.id }; });
    setVals(map);
  }, [prices]);

  function update(tipo, field, value) {
    setVals(prev => ({ ...prev, [tipo]: { ...prev[tipo], [field]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    await onSavePrices(vals);
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || !Object.keys(vals).length) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-5">
      <p className="text-sm font-semibold text-gray-700">Actualizar precios</p>
      <p className="text-xs text-gray-400">Cuando el proveedor cambie el precio, actualízalo aquí. Los despachos anteriores no se modifican.</p>
      {EGG_TYPES.map(t => vals[t] && (
        <div key={t}>
          <p className="text-sm font-semibold text-gray-700 mb-2">{t}</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Precio al cliente</label><input type="number" className={inputCls} value={vals[t].sale} onChange={e => update(t,"sale",e.target.value)}/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Costo proveedor</label><input type="number" className={inputCls} value={vals[t].cost} onChange={e => update(t,"cost",e.target.value)}/></div>
          </div>
          <p className="text-xs text-green-700 mt-1.5">Margen: {fmt(Number(vals[t].sale) - Number(vals[t].cost))} por cubeta</p>
        </div>
      ))}
      <button onClick={handleSave} disabled={saving} className="w-full bg-gray-800 text-white text-sm rounded-xl py-3 font-semibold hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-60">{saving ? "Guardando..." : "Guardar precios"}</button>
      {saved && <div className="text-center text-sm text-green-700 bg-green-50 rounded-xl py-2 border border-green-100">✓ Precios actualizados</div>}
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("resumen");
  const [despachos, setDespachos] = useState([]);
  const [clients, setClients] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [c, p, d] = await Promise.all([
        db("clientes?order=name"),
        db("precios?order=tipo"),
        db("despachos?order=id.desc"),
      ]);
      setClients(c);
      setPrices(p);
      setDespachos(d);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function addDespacho(data) {
    const maxInvoice = despachos.length > 0 ? Math.max(...despachos.map(d => d.invoice_num)) : 0;
    const newD = {
      client_id: data.client_id,
      invoice_num: maxInvoice + 1,
      date: new Date().toISOString().split("T")[0],
      paid: 0,
      provider_paid: false,
      lineas: data.lineas,
    };
    const [saved] = await db("despachos", { method: "POST", body: JSON.stringify(newD) });
    setDespachos(prev => [saved, ...prev]);
    return saved;
  }

  async function deleteDespacho(id) {
    await db(`despachos?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
    setDespachos(prev => prev.filter(d => d.id !== id));
  }

  async function updatePago(id, newPaid) {
    await db(`despachos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ paid: newPaid }) });
    setDespachos(prev => prev.map(d => d.id === id ? { ...d, paid: newPaid } : d));
  }

  async function updateProviderPaid(id) {
    await db(`despachos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ provider_paid: true }) });
    setDespachos(prev => prev.map(d => d.id === id ? { ...d, provider_paid: true } : d));
  }

  async function addClient(data) {
    const [saved] = await db("clientes", { method: "POST", body: JSON.stringify(data) });
    setClients(prev => [...prev, saved].sort((a,b) => a.name.localeCompare(b.name)));
  }

  async function deleteClient(id) {
    await db(`clientes?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
    setClients(prev => prev.filter(c => c.id !== id));
  }

  async function savePrices(vals) {
    await Promise.all(
      Object.entries(vals).map(([tipo, v]) =>
        db(`precios?tipo=eq.${tipo}`, { method: "PATCH", body: JSON.stringify({ sale: Number(v.sale), cost: Number(v.cost) }) })
      )
    );
    setPrices(prev => prev.map(p => vals[p.tipo] ? { ...p, sale: Number(vals[p.tipo].sale), cost: Number(vals[p.tipo].cost) } : p));
  }

  const pendingCount  = despachos.filter(d => getStatus(d) !== "pagado").length;
  const providerCount = despachos.filter(d => !d.provider_paid).length;

  const tabs = [
    { id: "resumen",   icon: "🏠", label: "Inicio" },
    { id: "despachar", icon: "📦", label: "Despachar" },
    { id: "cobros",    icon: "💰", label: "Cobros",    badge: pendingCount },
    { id: "proveedor", icon: "🚚", label: "Proveedor", badge: providerCount },
    { id: "clientes",  icon: "👥", label: "Clientes" },
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif", maxWidth: 430, margin: "0 auto" }}>
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥚</span>
          <div><h1 className="text-base font-bold text-gray-900 leading-tight">La Gallina Turuleca</h1><p className="text-xs text-gray-400">Control de ventas</p></div>
          <button className="ml-auto text-xs text-gray-400 underline" onClick={() => setTab("precios")}>Cambiar precios</button>
        </div>
      </div>
      <div className="px-4 py-4 pb-28">
        {tab === "resumen"   && <Resumen   despachos={despachos} clients={clients} prices={prices} onDelete={deleteDespacho} loading={loading}/>}
        {tab === "despachar" && <Despachar clients={clients} prices={prices} onDespacho={addDespacho}/>}
        {tab === "cobros"    && <Cobros    despachos={despachos} clients={clients} onPago={updatePago} onDelete={deleteDespacho} loading={loading}/>}
        {tab === "proveedor" && <Proveedor despachos={despachos} clients={clients} onProviderPaid={updateProviderPaid} onDelete={deleteDespacho} loading={loading}/>}
        {tab === "clientes"  && <Clientes  clients={clients} onAddClient={addClient} onDeleteClient={deleteClient} loading={loading}/>}
        {tab === "precios"   && <Precios   prices={prices} onSavePrices={savePrices} loading={loading}/>}
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-2 py-2 z-20">
        <div className="flex justify-around">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl relative transition-all ${tab===t.id ? "text-yellow-600" : "text-gray-400"}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-xs font-medium">{t.label}</span>
              {t.badge > 0 && <span className="absolute -top-0.5 right-0 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">{t.badge}</span>}
              {tab===t.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-yellow-500 rounded-full"/>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
