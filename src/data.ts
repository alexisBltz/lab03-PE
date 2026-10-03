import Dexie, { type EntityTable } from 'dexie'

export const expenseCategories = ['Alimentación', 'Movilidad', 'Materiales', 'Vivienda', 'Salud', 'Ocio', 'Otros'] as const
export const incomeCategories = ['Beca', 'Trabajo', 'Familia', 'Otros'] as const
export type MovementType = 'ingreso' | 'gasto'
export type Movement = { id?: number; type: MovementType; amount: number; category: string; date: string; description: string; createdAt: number }
export type Setting = { key: string; value: string }

class BudgetDB extends Dexie {
  movements!: EntityTable<Movement, 'id'>
  settings!: EntityTable<Setting, 'key'>
  constructor() {
    super('unibudget-db')
    this.version(1).stores({ movements: '++id, type, category, date, createdAt', settings: 'key' })
  }
}
export const db = new BudgetDB()

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return localDate(d)
}
export const money = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
export const monthKey = (date: string) => date.slice(0, 7)
export const categoryColor: Record<string, string> = {
  'Alimentación': '#f49c68', 'Movilidad': '#7797d5', 'Materiales': '#a486d3',
  'Vivienda': '#6fb6a5', 'Salud': '#e17f98', 'Ocio': '#e5bd5b', 'Otros': '#9da7b5',
}

export async function loadDemo() {
  const today = localDate()
  const firstOfMonth = today.slice(0, 7) + '-01'
  const demoDate = (days: number) => { const value = addDays(today, days); return value < firstOfMonth ? firstOfMonth : value }
  const items: Omit<Movement, 'id'>[] = [
    { type: 'ingreso', amount: 850, category: 'Familia', date: demoDate(-2), description: 'Apoyo mensual', createdAt: Date.now() - 9000 },
    { type: 'ingreso', amount: 320, category: 'Trabajo', date: demoDate(-2), description: 'Tutorías', createdAt: Date.now() - 8000 },
    { type: 'gasto', amount: 68, category: 'Alimentación', date: demoDate(-2), description: 'Almuerzos de la semana', createdAt: Date.now() - 7000 },
    { type: 'gasto', amount: 36, category: 'Movilidad', date: demoDate(-1), description: 'Pasajes al campus', createdAt: Date.now() - 6000 },
    { type: 'gasto', amount: 45, category: 'Materiales', date: demoDate(-1), description: 'Copias y cuaderno', createdAt: Date.now() - 5000 },
    { type: 'gasto', amount: 29, category: 'Alimentación', date: demoDate(0), description: 'Desayunos', createdAt: Date.now() - 4000 },
    { type: 'gasto', amount: 42, category: 'Ocio', date: demoDate(0), description: 'Salida de fin de semana', createdAt: Date.now() - 3000 },
  ]
  await db.transaction('rw', db.movements, db.settings, async () => {
    await db.movements.clear()
    await db.settings.clear()
    await db.movements.bulkAdd(items)
    await db.settings.bulkPut([
      { key: 'monthlyBudget', value: '650' },
      { key: 'nextIncomeDate', value: addDays(today, 14) },
      { key: 'limit:Alimentación', value: '120' },
      { key: 'limit:Movilidad', value: '80' },
      { key: 'limit:Materiales', value: '100' },
      { key: 'limit:Ocio', value: '35' },
    ])
  })
}

export function exportCsv(movements: Movement[]) {
  const safe = (value: string) => `"${value.replaceAll('"', '""')}"`
  const rows = [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto (PEN)'].join(',')]
  for (const m of movements) rows.push([m.date, m.type, m.category, m.description, m.amount.toFixed(2)].map(safe).join(','))
  const blob = new Blob(['\uFEFF', rows.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `unibudget-movimientos-${localDate()}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
