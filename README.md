# UniBudget

Aplicación web móvil para registrar ingresos y gastos universitarios, fijar presupuestos mensuales y estimar cuánto se puede gastar por día hasta el próximo ingreso. Los importes se expresan en soles peruanos.

## Requisitos

- Node.js 20.19 o superior
- npm
- Navegador moderno con IndexedDB

## Ejecución

```bash
cd LAB03/proyecto
npm install
npm run dev
```

Abrir la dirección local que muestra Vite (normalmente `http://localhost:5173`). Para crear y revisar una versión de producción:

```bash
npm run build
npm run preview
```

## Pruebas y capturas

Con la aplicación de desarrollo en `http://127.0.0.1:5173`:

```bash
npx playwright install chromium
npm test
```

La prueba genera las capturas en `../evidencias/capturas/`, un CSV descargado y el registro de resultados en `../evidencias/pruebas/`. Usa contextos de navegador independientes para móvil (390 × 844) y escritorio (1440 × 900).

## Datos de demostración

Al pie de la aplicación, seleccionar **Cargar datos de demostración**. Se insertan dos ingresos (S/ 850 y S/ 320), cinco gastos (S/ 68, 36, 45, 29 y 42), un presupuesto mensual de S/ 650, límites por categoría y una fecha de ingreso a 14 días. El balance acumulado del ejemplo es S/ 950 y el gasto mensual es S/ 220. Esta acción **reemplaza** los datos actuales tras confirmación. Los datos no se cargan automáticamente.

## Cálculos y datos

- Saldo acumulado: suma de ingresos menos suma de gastos de todos los registros.
- Ingresos y gastos del mes: movimientos cuya fecha pertenece al mes actual.
- Presupuesto mensual restante: presupuesto definido menos gastos del mes.
- Estimación diaria: `max(0, min(saldo acumulado, presupuesto restante) / días hasta el próximo ingreso)`. El conteo de días incluye hoy. Si no hay fecha configurada, el panel pide configurarla.
- Límite de categoría: se compara con el total de gastos de esa categoría en el mes actual. Un límite igual a cero desactiva la alerta.
- El historial puede filtrarse por tipo, categoría y fechas inclusivas. El CSV exporta los movimientos visibles tras aplicar filtros.

IndexedDB guarda movimientos y configuración en la base `unibudget-db` mediante Dexie. Los registros permanecen al recargar en el mismo origen y perfil del navegador. Borrar los datos del sitio elimina esta información local. La PWA incluye manifiesto e instalación compatible; el service worker se genera en la compilación de producción.

## Estructura

```text
src/App.tsx       vistas, navegación, formularios, cálculos y gráficos
src/data.ts       modelo, IndexedDB, datos de ejemplo y CSV
src/App.css       diseño responsive
tests/            flujo funcional y generación de capturas
vite.config.ts    React, Tailwind y PWA
public/icon.svg y public/icon-*.png   iconos PWA
```

## Tecnologías

React + TypeScript, Vite, Tailwind CSS, Dexie, Recharts, Lucide React, Playwright y vite-plugin-pwa. La interfaz usa clases CSS propias para controlar la composición responsive y Tailwind queda disponible mediante su integración con Vite.
