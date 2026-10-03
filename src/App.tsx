import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check, CircleAlert, Download, LayoutDashboard, Pencil, Plus, Settings2, Trash2, Wallet } from 'lucide-react'
import { categoryColor, db, expenseCategories, exportCsv, incomeCategories, loadDemo, localDate, money, monthKey, type Movement, type MovementType } from './data'
import './App.css'

type View = 'inicio' | 'movimientos' | 'presupuesto' | 'estadisticas'
const nav: { id: View; label: string; icon: typeof Wallet }[] = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard }, { id: 'movimientos', label: 'Movimientos', icon: Wallet },
  { id: 'presupuesto', label: 'Presupuesto', icon: Settings2 }, { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
]
const shortDate = (value: string) => new Date(value + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })

function MovementForm({ current, close, saved }: { current: Movement | null; close: () => void; saved: () => void }) {
  const [type, setType] = useState<MovementType>(current?.type ?? 'gasto')
  const [amount, setAmount] = useState(current?.amount.toString() ?? '')
  const [category, setCategory] = useState(current?.category ?? 'Alimentación')
  const [date, setDate] = useState(current?.date ?? localDate())
  const [description, setDescription] = useState(current?.description ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const number = Number(amount)
    if (!Number.isFinite(number) || number <= 0 || number > 1000000) return setError('Ingresa un monto entre S/ 0,01 y S/ 1 000 000.')
    if (!description.trim() || description.trim().length > 100) return setError('Escribe una descripción de 1 a 100 caracteres.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Selecciona una fecha válida.')
    setSaving(true)
    try {
      const item: Movement = { type, amount: Math.round(number * 100) / 100, category, date, description: description.trim(), createdAt: current?.createdAt ?? Date.now() }
      if (current?.id) await db.movements.update(current.id, item)
      else await db.movements.add(item)
      saved()
    } catch { setError('No se pudo guardar. Comprueba que el navegador permita IndexedDB.') }
    finally { setSaving(false) }
  }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
    <div className="modal-top"><div><p className="eyebrow">MOVIMIENTO</p><h2 id="form-title">{current ? 'Editar registro' : 'Nuevo registro'}</h2></div><button className="close" onClick={close} aria-label="Cerrar">×</button></div>
    <div className="segmented" role="group" aria-label="Tipo de movimiento"><button type="button" className={type === 'gasto' ? 'selected' : ''} onClick={() => { setType('gasto'); setCategory('Alimentación') }}>Gasto</button><button type="button" className={type === 'ingreso' ? 'selected' : ''} onClick={() => { setType('ingreso'); setCategory('Beca') }}>Ingreso</button></div>
    <form onSubmit={submit} className="form-grid">
      <label className="full">Monto (S/)<input aria-label="Monto" type="number" min="0.01" max="1000000" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required /></label>
      <label>Categoría<select aria-label="Categoría" value={category} onChange={e => setCategory(e.target.value)}>{(type === 'gasto' ? expenseCategories : incomeCategories).map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Fecha<input aria-label="Fecha" type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
      <label className="full">Descripción<input aria-label="Descripción" maxLength={100} placeholder="Ej. Almuerzo en la universidad" value={description} onChange={e => setDescription(e.target.value)} required /></label>
      {error && <p className="form-error full" role="alert">{error}</p>}
      <div className="form-actions full"><button type="button" className="btn subtle" onClick={close}>Cancelar</button><button className="btn primary" disabled={saving}>{saving ? 'Guardando…' : current ? 'Guardar cambios' : 'Agregar movimiento'}</button></div>
    </form></div></div>
}

export default function App() {
  const records = useLiveQuery(() => db.movements.orderBy('date').reverse().toArray(), [])
  const settingRows = useLiveQuery(() => db.settings.toArray(), [])
  const [view, setView] = useState<View>('inicio')
  const [editing, setEditing] = useState<Movement | 'new' | null>(null)
  const [filterType, setFilterType] = useState('todos')
  const [filterCategory, setFilterCategory] = useState('todas')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [toast, setToast] = useState('')
  const [budgetInput, setBudgetInput] = useState('')
  const [nextInput, setNextInput] = useState('')
  const [limitsInput, setLimitsInput] = useState<Record<string, string>>({})
  const [settingsError, setSettingsError] = useState('')
  const settings = Object.fromEntries((settingRows ?? []).map(s => [s.key, s.value]))
  const items = records ?? []
  const monthItems = items.filter(m => monthKey(m.date) === monthKey(localDate()))
  const income = monthItems.filter(m => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0)
  const spent = monthItems.filter(m => m.type === 'gasto').reduce((s, m) => s + m.amount, 0)
  const balance = items.reduce((s, m) => s + (m.type === 'ingreso' ? m.amount : -m.amount), 0)
  const monthlyBudget = Number(settings.monthlyBudget || 0)
  const budgetRemaining = monthlyBudget - spent
  const nextIncome = settings.nextIncomeDate ?? ''
  const daysLeft = nextIncome ? Math.max(0, Math.ceil((new Date(nextIncome + 'T12:00:00').getTime() - new Date(localDate() + 'T12:00:00').getTime()) / 86400000) + 1) : 0
  const daily = daysLeft ? Math.max(0, Math.min(balance, monthlyBudget > 0 ? budgetRemaining : balance) / daysLeft) : 0
  const byCategory = expenseCategories.map(c => ({ name: c, value: monthItems.filter(m => m.type === 'gasto' && m.category === c).reduce((s, m) => s + m.amount, 0) })).filter(x => x.value > 0)
  const alerts = expenseCategories.filter(c => Number(settings['limit:' + c] || 0) > 0 && (byCategory.find(x => x.name === c)?.value ?? 0) > Number(settings['limit:' + c]))
  const filtered = items.filter(m => (filterType === 'todos' || m.type === filterType) && (filterCategory === 'todas' || m.category === filterCategory) && (!filterFrom || m.date >= filterFrom) && (!filterTo || m.date <= filterTo))
  const chartData = Array.from({ length: 7 }, (_, i) => { const d = new Date(localDate() + 'T12:00:00'); d.setDate(d.getDate() - 6 + i); const key = localDate(d); return { date: shortDate(key), gastos: items.filter(m => m.type === 'gasto' && m.date === key).reduce((s, m) => s + m.amount, 0) } })
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3200) }
  async function remove(m: Movement) { if (!m.id || !window.confirm('¿Eliminar “' + m.description + '”?')) return; try { await db.movements.delete(m.id); notify('Movimiento eliminado') } catch { notify('No se pudo eliminar') } }
  async function saveBudget(e: React.FormEvent) {
    e.preventDefault()
    const budget = Number(budgetInput || settings.monthlyBudget || 0), date = nextInput || settings.nextIncomeDate || ''
    if (!Number.isFinite(budget) || budget < 0 || budget > 1000000) return setSettingsError('El presupuesto debe estar entre S/ 0 y S/ 1 000 000.')
    if (date && date < localDate()) return setSettingsError('El próximo ingreso debe ser hoy o una fecha futura.')
    for (const c of expenseCategories) { const n = Number(limitsInput[c] ?? settings['limit:' + c] ?? 0); if (!Number.isFinite(n) || n < 0 || n > 1000000) return setSettingsError('Revisa el límite de ' + c + '.') }
    try { await db.transaction('rw', db.settings, async () => { await db.settings.put({ key: 'monthlyBudget', value: String(budget) }); if (date) await db.settings.put({ key: 'nextIncomeDate', value: date }); for (const c of expenseCategories) await db.settings.put({ key: 'limit:' + c, value: String(Number(limitsInput[c] ?? settings['limit:' + c] ?? 0)) }) }); setSettingsError(''); notify('Presupuesto guardado') }
    catch { setSettingsError('No se pudo guardar el presupuesto.') }
  }
  const movementList = (list: Movement[]) => <div className="movement-list">{list.map(m => <div className="movement-row" key={m.id}><span className={'movement-icon ' + m.type}>{m.type === 'ingreso' ? <ArrowDownLeft size={19}/> : <ArrowUpRight size={19}/>}</span><div className="movement-detail"><strong>{m.description}</strong><small>{m.category} · {shortDate(m.date)}</small></div><strong className={'movement-amount ' + m.type}>{m.type === 'ingreso' ? '+' : '−'}{money(m.amount)}</strong><div className="row-actions"><button aria-label={'Editar ' + m.description} onClick={() => setEditing(m)}><Pencil size={16}/></button><button aria-label={'Eliminar ' + m.description} onClick={() => remove(m)}><Trash2 size={16}/></button></div></div>)}</div>
  if (!records || !settingRows) return <div className="loading">Cargando UniBudget…</div>
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">U<span>•</span></span><div><strong>UniBudget</strong><small>Finanzas universitarias</small></div></div><p className="nav-caption">MENÚ PRINCIPAL</p><nav aria-label="Navegación principal">{nav.map(n => <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => setView(n.id)}><n.icon size={19}/>{n.label}</button>)}</nav><div className="sidebar-bottom"><div className="tip"><div className="tip-icon">✦</div><strong>Tu dinero, a tu ritmo</strong><p>Un pequeño registro hoy te ayuda a decidir mejor mañana.</p></div><p className="sidebar-foot">Hecho para estudiantes · Datos en tu dispositivo</p></div></aside>
    <main className="main"><header className="topbar"><span className="topbar-label">UNIBUDGET <span>/ {nav.find(n => n.id === view)?.label.toUpperCase()}</span></span><div className="topbar-right"><span className="today"><CalendarDays size={16}/> {new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span className="avatar">AB</span></div></header>
      <div className="content"><div className="page-heading"><div><p className="eyebrow">{view === 'inicio' ? 'BIENVENIDO A UNIBUDGET' : 'ORGANIZA TUS FINANZAS'}</p><h1>{{ inicio: 'Tu dinero, con claridad', movimientos: 'Todos tus movimientos', presupuesto: 'Tu presupuesto', estadisticas: 'Así se mueve tu dinero' }[view]}</h1><p className="lead">{{ inicio: 'Controla tus gastos y aprovecha mejor cada sol.', movimientos: 'Consulta, filtra y administra cada registro.', presupuesto: 'Define tus límites y anticipa tus próximas decisiones.', estadisticas: 'Descubre en qué categorías estás gastando más.' }[view]}</p></div><button className="btn primary add-button" onClick={() => setEditing('new')}><Plus size={18}/> Nuevo movimiento</button></div>
      {view === 'inicio' && <><section className="hero"><div className="hero-content"><p className="hero-label">SALDO DISPONIBLE</p><h2>{money(balance)}</h2><p>Balance acumulado de tus ingresos y gastos</p><button onClick={() => setEditing('new')}>Registrar un movimiento <ArrowRight size={16}/></button></div><div className="hero-art" aria-hidden="true"><span className="art-circle one"/><span className="art-circle two"/><span className="art-card"><span>UNIBUDGET</span><strong>U</strong><small>Gasta con intención.</small></span></div></section>
        {items.length === 0 ? <div className="empty"><div className="empty-icon"><Wallet size={26}/></div><h3>Empieza a organizar tu dinero</h3><p>Registra tu primer ingreso o gasto para ver cómo cambia tu presupuesto.</p><button className="btn primary" onClick={() => setEditing('new')}><Plus size={17}/> Agregar movimiento</button></div> : <><div className="metrics"><div className="metric-card"><span className="metric-icon mint"><ArrowDownLeft size={21}/></span><p>Ingresos del mes</p><strong>{money(income)}</strong><small>Dinero recibido</small></div><div className="metric-card"><span className="metric-icon peach"><ArrowUpRight size={21}/></span><p>Gastos del mes</p><strong>{money(spent)}</strong><small>Dinero utilizado</small></div><div className="metric-card accent"><span className="metric-icon gold"><Wallet size={21}/></span><p>Disponible por día</p><strong>{nextIncome ? money(daily) : 'Configurar fecha'}</strong><small>{nextIncome ? daysLeft + ' días hasta el próximo ingreso' : 'Define tu próximo ingreso'}</small></div></div>
          {(alerts.length > 0 || (monthlyBudget > 0 && spent > monthlyBudget)) && <div className="alert" role="status"><CircleAlert size={19}/><span>{monthlyBudget > 0 && spent > monthlyBudget ? 'Superaste tu presupuesto mensual. ' : ''}{alerts.length ? 'Límite excedido: ' + alerts.join(', ') + '.' : ''}</span></div>}
          <div className="dashboard-grid"><section className="card chart-card"><div className="card-heading"><div><p className="eyebrow">ESTE MES</p><h2>¿En qué gastaste?</h2></div><button className="text-link" onClick={() => setView('estadisticas')}>Ver detalle <ArrowRight size={15}/></button></div>{byCategory.length ? <div className="donut-wrap"><ResponsiveContainer width="100%" height={235}><PieChart><Pie isAnimationActive={false} data={byCategory} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3}>{byCategory.map(x => <Cell key={x.name} fill={categoryColor[x.name]}/>)}</Pie><Tooltip formatter={value => money(Number(value))}/></PieChart></ResponsiveContainer><div className="legend">{byCategory.map(x => <div key={x.name}><i style={{background:categoryColor[x.name]}}/>{x.name}<strong>{money(x.value)}</strong></div>)}</div></div> : <p className="muted">Aún no hay gastos este mes.</p>}</section><section className="card recent-card"><div className="card-heading"><div><p className="eyebrow">ACTIVIDAD</p><h2>Movimientos recientes</h2></div><button className="text-link" onClick={() => setView('movimientos')}>Ver todos <ArrowRight size={15}/></button></div>{movementList(items.slice(0, 4))}</section></div></>}</>}
      {view === 'movimientos' && <section className="card"><div className="card-heading"><div><p className="eyebrow">HISTORIAL</p><h2>{filtered.length} movimientos</h2></div><button className="btn outline" onClick={() => exportCsv(filtered)} disabled={!filtered.length}><Download size={16}/> Exportar CSV</button></div><div className="filters"><label>Tipo<select aria-label="Filtrar por tipo" value={filterType} onChange={e => setFilterType(e.target.value)}><option value="todos">Todos</option><option value="ingreso">Ingresos</option><option value="gasto">Gastos</option></select></label><label>Categoría<select aria-label="Filtrar por categoría" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="todas">Todas</option>{[...new Set([...expenseCategories, ...incomeCategories])].map(c => <option key={c}>{c}</option>)}</select></label><label>Desde<input aria-label="Filtrar desde" type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}/></label><label>Hasta<input aria-label="Filtrar hasta" type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}/></label></div>{filtered.length ? movementList(filtered) : <div className="no-results"><Wallet size={26}/><strong>No hay movimientos para mostrar</strong><p>Prueba otros filtros o agrega un registro.</p></div>}</section>}
      {view === 'presupuesto' && <div className="budget-layout"><section className="card"><div className="card-heading"><div><p className="eyebrow">PLANIFICACIÓN</p><h2>Configura tus límites</h2></div></div><form onSubmit={saveBudget} className="budget-form"><div className="form-grid"><label>Presupuesto mensual (S/)<input aria-label="Presupuesto mensual" type="number" min="0" max="1000000" step="0.01" placeholder="Ej. 650" value={budgetInput || settings.monthlyBudget || ''} onChange={e => setBudgetInput(e.target.value)}/></label><label>Próximo ingreso<input aria-label="Próximo ingreso" type="date" min={localDate()} value={nextInput || settings.nextIncomeDate || ''} onChange={e => setNextInput(e.target.value)}/></label></div><h3>Límites por categoría</h3><p className="helper">Un límite en 0 no genera alertas.</p><div className="limit-fields">{expenseCategories.map(c => <label key={c}><span><i style={{background:categoryColor[c]}}/>{c}</span><div><span>S/</span><input aria-label={'Límite ' + c} type="number" min="0" max="1000000" step="0.01" value={limitsInput[c] ?? settings['limit:' + c] ?? ''} onChange={e => setLimitsInput({ ...limitsInput, [c]: e.target.value })}/></div></label>)}</div>{settingsError && <p role="alert" className="form-error">{settingsError}</p>}<button className="btn primary" type="submit"><Check size={17}/> Guardar presupuesto</button></form></section><section className="card progress-card"><div className="card-heading"><div><p className="eyebrow">CONSUMO DEL MES</p><h2>Así vas con tu plan</h2></div></div><div className="budget-summary"><span>Gastado</span><strong>{money(spent)}</strong><span>de {monthlyBudget ? money(monthlyBudget) : 'presupuesto sin definir'}</span><div className="progress"><i style={{width: monthlyBudget ? Math.min(100, spent / monthlyBudget * 100) + '%' : '0%'}}/></div><small>{monthlyBudget ? Math.round(spent / monthlyBudget * 100) + '% usado · ' + money(budgetRemaining) + ' restante' : 'Define un presupuesto para ver el progreso'}</small></div><h3>Por categoría</h3>{expenseCategories.map(c => { const used = byCategory.find(x => x.name === c)?.value ?? 0, limit = Number(settings['limit:' + c] || 0); return <div className="category-progress" key={c}><div><span>{c}</span><strong className={limit && used > limit ? 'danger' : ''}>{money(used)} {limit ? '/ ' + money(limit) : ''}</strong></div><div className="progress"><i style={{width: limit ? Math.min(100, used / limit * 100) + '%' : '0%', background: limit && used > limit ? '#d9635e' : categoryColor[c]}}/></div>{limit > 0 && used > limit && <small className="danger">Límite superado</small>}</div>})}</section></div>}
      {view === 'estadisticas' && <><div className="metrics"><div className="metric-card"><span className="metric-icon mint"><ArrowDownLeft size={21}/></span><p>Ingresos del mes</p><strong>{money(income)}</strong></div><div className="metric-card"><span className="metric-icon peach"><ArrowUpRight size={21}/></span><p>Gastos del mes</p><strong>{money(spent)}</strong></div><div className="metric-card"><span className="metric-icon gold"><Wallet size={21}/></span><p>Balance acumulado</p><strong>{money(balance)}</strong></div></div><div className="stats-grid"><section className="card"><div className="card-heading"><div><p className="eyebrow">ÚLTIMOS 7 DÍAS</p><h2>Evolución de gastos</h2></div></div><div className="area-chart"><ResponsiveContainer width="100%" height={260}><AreaChart data={chartData}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6ab79f" stopOpacity={0.38}/><stop offset="100%" stopColor="#6ab79f" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8eeeb"/><XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickLine={false} axisLine={false} fontSize={11}/><Tooltip formatter={value => money(Number(value))}/><Area isAnimationActive={false} dataKey="gastos" type="monotone" stroke="#298468" strokeWidth={3} fill="url(#area)"/></AreaChart></ResponsiveContainer></div></section><section className="card"><div className="card-heading"><div><p className="eyebrow">POR CATEGORÍA</p><h2>Distribución mensual</h2></div></div>{byCategory.length ? <><div className="small-donut"><ResponsiveContainer width="100%" height={210}><PieChart><Pie isAnimationActive={false} data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>{byCategory.map(x => <Cell key={x.name} fill={categoryColor[x.name]}/>)}</Pie><Tooltip formatter={value => money(Number(value))}/></PieChart></ResponsiveContainer></div><div className="legend">{byCategory.map(x => <div key={x.name}><i style={{background:categoryColor[x.name]}}/>{x.name}<strong>{Math.round(x.value / spent * 100)}%</strong></div>)}</div></> : <p className="muted">Registra gastos para ver esta gráfica.</p>}</section></div></>}
      <div className="demo-strip"><span>¿Quieres explorar con datos de ejemplo?</span><button onClick={async () => { if (items.length && !window.confirm('Los datos de ejemplo reemplazarán todos los registros actuales. ¿Continuar?')) return; try { await loadDemo(); setView('inicio'); notify('Datos de ejemplo cargados') } catch { notify('No se pudieron cargar los datos') } }}>Cargar datos de demostración</button></div>
      </div></main>
    <nav className="mobile-nav" aria-label="Navegación móvil">{nav.map(n => <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => setView(n.id)}><n.icon size={20}/><span>{n.label}</span></button>)}</nav>
    {editing && <MovementForm current={editing === 'new' ? null : editing} close={() => setEditing(null)} saved={() => { setEditing(null); notify('Movimiento guardado') }}/>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

