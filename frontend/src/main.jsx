import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
const Neo4jVista = React.lazy(() => import("./Neo4jVista"));
const fmt = (n) =>
  new Intl.NumberFormat("es-GT", { maximumFractionDigits: 2 }).format(n ?? 0);
const labels = {
  carrera_objetivo: "Carrera",
  materia: "Materia",
  tipo_institucion_educativa: "Tipo de institucion",
  departamento_institucion_educativa: "Departamento",
  municipio_institucion_educativa: "Municipio",
  anio_de_ingreso: "Anio de ingreso",
  edad_aproximada: "Edad aproximada",
  numero_de_fecha_de_evaluacion: "Oportunidad",
  correlativo_aspirante: "Correlativo",
  porcentaje_aprobacion: "Aprobacion (%)",
  porcentaje_no_aprobacion: "No aprobacion (%)",
  aspirantes_anio_con_edad: "Aspirantes por anio con edad",
  edad_promedio: "Edad promedio",
  promedio_intentos: "Promedio de oportunidades",
  no_aprobadas: "No aprobadas",
  aspirantes_aprobados: "Aspirantes con aprobacion",
  aspirantes_con_aprobacion: "Aspirantes con alguna aprobacion",
  fecha_asignacion: "Fecha de asignacion",
  fecha_generacion: "Generado",
  evaluacion_id: "ID evaluacion",
  sincronizacion_neo4j: "Estado Neo4j",
  fecha_carga: "Fecha de carga",
  carga_id: "ID carga",
};
const label = (k) =>
  labels[k] || k.charAt(0).toUpperCase() + k.slice(1).replaceAll("_", " ");
async function api(path, options) {
  let r;
  try {
    r = await fetch("/api/v1" + path, options);
  } catch {
    throw Error(
      "No se pudo conectar con el backend. Revise que este encendido.",
    );
  }
  let d;
  try {
    d = await r.json();
  } catch {
    throw Error("La API no devolvio una respuesta valida. Revise el backend.");
  }
  if (!r.ok) throw Error(d.detail || "No se pudo completar la solicitud.");
  return d;
}
function Icon({ type = "chart" }) {
  const paths = {
    chart: "M4 20V10m7 10V4m7 16v-7M2 22h20",
    upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    book: "M12 6c-3-3-7-3-10-2v16c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2Zm0 0v16",
    arrow: "M5 12h14m-5-5 5 5-5 5",
    check: "m5 12 4 4L19 6",
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[type] || paths.chart} />
    </svg>
  );
}
function Bars({ rows, metric, title }) {
  if (!rows.length)
    return <p className="empty">No hay datos para esta visualizacion.</p>;
  const max = metric.includes("porcentaje")
    ? 100
    : Math.max(...rows.map((r) => Number(r[metric]) || 0), 1);
  return (
    <div className="bars" aria-label={title}>
      {rows.slice(0, 10).map((r, i) => {
        const keys = Object.keys(r).filter(
          (k) =>
            k !== metric && typeof r[k] === "string" && !k.includes("fecha"),
        );
        const name =
          keys.map((k) => r[k]).join(" / ") ||
          String(r.anio_de_ingreso ?? r.edad_aproximada ?? i + 1);
        return (
          <div className="bar-row" key={i}>
            <div className="bar-label" title={name}>
              {name}
              <b>
                {fmt(r[metric])}
                {metric.includes("porcentaje") ? "%" : ""}
              </b>
            </div>
            <div className="track">
              <div
                style={{
                  width: `${Math.max(0, ((Number(r[metric]) || 0) / max) * 100)}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Cell({ value, k }) {
  if (value == null) return <span className="muted">Sin registro</span>;
  if (typeof value === "object")
    return (
      <details>
        <summary>Ver detalle</summary>
        <pre>{JSON.stringify(value, null, 2)}</pre>
      </details>
    );
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (k.startsWith("fecha") && typeof value === "string")
    return value.replace("T", " ").replace(".000+00:00", " UTC");
  if (typeof value === "number") return fmt(value);
  return String(value);
}
function ResultTable({ rows }) {
  if (!rows.length)
    return <p className="empty">No hay resultados para estos filtros.</p>;
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cols.map((k) => (
              <th key={k}>{label(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.evaluacion_id || i}>
              {cols.map((k) => (
                <td key={k}>
                  <Cell value={r[k]} k={k} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Dashboard({ revision, onQueries }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setError("");
    Promise.all([
      api("/consultas/20?tamano=100"),
      api("/consultas/2?tamano=100"),
      api("/consultas/1?tamano=100"),
    ])
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [revision]);
  return (
    <>
      <section className="welcome">
        <div>
          <span className="eyebrow">DATOS PARA ENTENDER EL INGRESO</span>
          <h2>
            De los archivos
            <br />a las decisiones.
          </h2>
          <p>
            Explora resultados de las pruebas especificas y conoce las
            tendencias por materia, carrera e institucion.
          </p>
          <button onClick={onQueries}>
            Explorar consultas <Icon type="arrow" />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="hero-card">
            <Icon type="book" />
            <span>INGENIERIA</span>
            <b>
              Admisiones
              <br />
              USAC
            </b>
            <div className="mini-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </section>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {!data && !error && <p className="empty">Consultando MongoDB...</p>}
      {data && (
        <>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">TENDENCIA HISTORICA</span>
                <h3>Aprobacion por anio de ingreso</h3>
              </div>
              <span className="tag">Evaluaciones · todos los datos</span>
            </div>
            <Bars
              rows={data[0].filas}
              metric="porcentaje_aprobacion"
              title="Porcentaje de aprobacion por anio"
            />
            <p className="footnote">
              La aprobacion de una evaluacion no equivale a la admision completa
              del aspirante.
            </p>
          </div>
          <div className="two-columns">
            <div className="panel">
              <h3>Evaluaciones aprobadas por materia</h3>
              <Bars
                rows={data[1].filas}
                metric="aprobadas"
                title="Aprobados por materia"
              />
            </div>
            <div className="panel">
              <h3>Aspirantes por tipo de institucion</h3>
              <Bars
                rows={data[2].filas}
                metric="aspirantes"
                title="Aspirantes por institucion"
              />
              <p className="footnote">
                IDs distintos en cada grupo. Una persona puede aparecer en mas
                de un tipo.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
function Consultas({ revision, onRefresh }) {
  const [catalog, setCatalog] = useState([]),
    [options, setOptions] = useState({}),
    [id, setId] = useState(1),
    [filters, setFilters] = useState({}),
    [applied, setApplied] = useState({}),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [metric, setMetric] = useState("");
  useEffect(() => {
    Promise.all([api("/consultas"), api("/consultas/opciones")])
      .then(([c, o]) => {
        setCatalog(c);
        setOptions(o);
      })
      .catch((e) => setMessage(e.message));
  }, [revision]);
  const query = catalog.find((c) => c.id === id),
    history = id === 11 || id === 15;
  const fields = [
    ["anio", "Anio de ingreso", "anios"],
    ["carrera", "Carrera", "carreras"],
    ["materia", "Materia", "materias"],
    ["tipo", "Tipo de institucion", "tipos"],
    ["departamento", "Departamento", "departamentos"],
  ];
  async function execute(page = 0, f = filters) {
    setBusy(true);
    setMessage("");
    try {
      const actual = id === 6 ? { carrera: f.carrera || "" } : f;
      const params = new URLSearchParams(
        Object.entries(actual).filter(([, v]) => v),
      );
      params.set("pagina", page);
      params.set("tamano", 25);
      const r = await api(`/consultas/${id}?${params}`);
      setResult(r);
      setApplied(actual);
      const numeric = r.filas[0]
        ? Object.keys(r.filas[0]).filter(
            (k) =>
              typeof r.filas[0][k] === "number" &&
              ![
                "anio_de_ingreso",
                "edad_aproximada",
                "numero_de_fecha_de_evaluacion",
              ].includes(k),
          )
        : [];
      setMetric(
        numeric.includes("porcentaje_aprobacion")
          ? "porcentaje_aprobacion"
          : numeric[0] || "",
      );
    } catch (e) {
      setMessage(e.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setMessage("Generando resumen global...");
    try {
      const r = await api("/consultas/resumen-carrera", { method: "POST" });
      setMessage(`${r.carreras} carreras resumidas. ${r.mensaje}`);
      setResult(null);
      onRefresh();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function choose(n) {
    setId(n);
    setResult(null);
    setMessage("");
    setFilters({});
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ANALITICA DOCUMENTAL</span>
          <h2>Consultas MongoDB</h2>
          <p>
            Las 20 consultas del proyecto, con criterios y resultados
            verificables.
          </p>
        </div>
        <span className="pill">20 consultas</span>
      </div>
      <div className="query-layout">
        <aside className="query-menu">
          {catalog.map((c) => (
            <button
              key={c.id}
              disabled={busy}
              className={id === c.id ? "selected" : ""}
              onClick={() => choose(c.id)}
            >
              <span>{String(c.id).padStart(2, "0")}</span>
              {c.titulo}
            </button>
          ))}
        </aside>
        <div className="query-content">
          <section className="panel">
            <span className="eyebrow">
              CONSULTA {String(id).padStart(2, "0")}
            </span>
            <h3>{query?.titulo || "Cargando catalogo..."}</h3>
            <p>{query?.descripcion}</p>
            <div className="filters">
              {fields.map(([key, title, source]) => (
                <label key={key}>
                  {title}
                  <select
                    disabled={busy || (id === 6 && key !== "carrera")}
                    value={filters[key] || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, [key]: e.target.value })
                    }
                  >
                    <option value="">Todos</option>
                    {(options[source] || []).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {history && (
                <label className="wide">
                  Correlativo del aspirante
                  <input
                    value={filters.aspirante || ""}
                    disabled={busy}
                    placeholder="Ingrese el identificador anonimo exacto"
                    onChange={(e) =>
                      setFilters({ ...filters, aspirante: e.target.value })
                    }
                  />
                </label>
              )}
            </div>
            <div className="actions">
              <button
                disabled={
                  busy || !query || (history && !filters.aspirante?.trim())
                }
                onClick={() => execute()}
              >
                Consultar <Icon type="chart" />
              </button>
              {id === 6 && (
                <button className="gold" disabled={busy} onClick={generate}>
                  Generar resumen global
                </button>
              )}
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setFilters({});
                  setResult(null);
                }}
              >
                Limpiar filtros
              </button>
            </div>
            {id === 6 && (
              <p className="footnote">
                Genera una fotografia de todas las evaluaciones. Regenerar
                despues de nuevas cargas. No modifica evaluaciones.
              </p>
            )}
            {busy && (
              <p role="status" className="notice">
                Procesando consulta...
              </p>
            )}
            {message && (
              <p role="status" className="notice">
                {message}
              </p>
            )}
          </section>
          {result && (
            <section className="panel">
              <div className="panel-heading">
                <h3>Resultados</h3>
                <span className="tag">
                  {fmt(result.total)} filas de resultado
                </span>
              </div>
              <p className="footnote">
                Filtros aplicados:{" "}
                {Object.entries(applied)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ") || "Todos los datos cargados"}
                .
              </p>
              {metric && !history && result.filas.length > 0 && (
                <div className="chart-box">
                  <label>
                    Indicador del grafico
                    <select
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                    >
                      {Object.keys(result.filas[0])
                        .filter(
                          (k) =>
                            typeof result.filas[0][k] === "number" &&
                            ![
                              "anio_de_ingreso",
                              "edad_aproximada",
                              "numero_de_fecha_de_evaluacion",
                            ].includes(k),
                        )
                        .map((k) => (
                          <option key={k} value={k}>
                            {label(k)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Bars
                    rows={result.filas}
                    metric={metric}
                    title={label(metric)}
                  />
                  <p className="footnote">
                    Grafico: primeras 10 filas de esta pagina. Tabla: hasta 25
                    filas por pagina.
                  </p>
                </div>
              )}
              <ResultTable rows={result.filas} />
              <div className="pagination">
                <button
                  className="secondary"
                  disabled={busy || result.pagina === 0}
                  onClick={() => execute(result.pagina - 1, applied)}
                >
                  Anterior
                </button>
                <span>
                  Pagina {result.pagina + 1} de{" "}
                  {Math.max(1, Math.ceil(result.total / 25))}
                </span>
                <button
                  className="secondary"
                  disabled={busy || (result.pagina + 1) * 25 >= result.total}
                  onClick={() => execute(result.pagina + 1, applied)}
                >
                  Siguiente
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
function Cargas({ loads, summary, onRefresh }) {
  const [files, setFiles] = useState([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [errors, setErrors] = useState([]),
    [selected, setSelected] = useState(null),
    [page, setPage] = useState(0);
  async function upload() {
    setBusy(true);
    try {
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 20 * 1024 * 1024)
          throw Error("Archivo mayor a 20 MB: " + files[i].name);
        setMessage(
          `Procesando ${i + 1}/${files.length}: ${files[i].name}. Mantenga la ventana abierta.`,
        );
        const form = new FormData();
        form.append("archivo", files[i]);
        const r = await api("/cargas", { method: "POST", body: form });
        await onRefresh();
        if (r.estado === "FALLIDA") throw Error(r.mensaje);
      }
      setMessage(
        "Carga completada. Revise el historial y los pendientes de Neo4j.",
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
      onRefresh().catch(() => {});
    }
  }
  async function sync() {
    setBusy(true);
    setMessage("Sincronizando registros pendientes...");
    try {
      const r = await api("/cargas/sincronizar", { method: "POST" });
      setMessage(
        `${r.estado}: ${fmt(r.sincronizados)} sincronizados; ${fmt(r.pendientes)} pendientes. ${r.mensaje || ""}`,
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
      onRefresh().catch(() => {});
    }
  }
  async function show(id, p = 0) {
    try {
      setErrors(await api(`/cargas/${id}/errores?pagina=${p}`));
      setSelected(id);
      setPage(p);
    } catch (e) {
      setMessage(e.message);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">INGESTA Y CALIDAD DE DATOS</span>
          <h2>Carga de archivos</h2>
          <p>Importa evaluaciones y revisa cada resultado del proceso.</p>
        </div>
        <span className="pill">CSV · UTF-8</span>
      </div>
      <section className="panel upload-panel">
        <div className="upload-symbol">
          <Icon type="upload" />
        </div>
        <h3>Agrega tus archivos CSV</h3>
        <p>
          Selecciona uno o varios archivos. Se procesan uno por uno, hasta 20 MB
          por archivo.
        </p>
        <label className="file-picker">
          Seleccionar archivos
          <input
            type="file"
            accept=".csv"
            multiple
            disabled={busy}
            onChange={(e) => setFiles([...e.target.files])}
          />
        </label>
        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f, i) => (
              <li key={i}>
                {f.name}
                <span>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              </li>
            ))}
          </ul>
        )}
        <div className="actions">
          <button
            disabled={busy || summary.ocupado || !files.length}
            onClick={upload}
          >
            Cargar archivos <Icon type="upload" />
          </button>
          <button
            className="secondary"
            disabled={busy || summary.ocupado}
            onClick={sync}
          >
            Reintentar Neo4j
          </button>
        </div>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h3>Historial de cargas</h3>
          <span className="tag">Ultimas 50</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "Archivo",
                  "Estado",
                  "Leidos",
                  "Insertados",
                  "Duplicados",
                  "Rechazados",
                  "Filas con advertencias",
                  "Tiempo total",
                  "Errores",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loads.map((l) => (
                <tr key={l.carga_id}>
                  <td>
                    <b>{l.archivo}</b>
                    <small>{l.carga_id}</small>
                  </td>
                  <td>
                    <span
                      className={`badge ${l.estado === "COMPLETADA" ? "good" : "warn"}`}
                    >
                      {l.estado}
                    </span>
                    <small>
                      Intento Neo4j:{" "}
                      {l.resultado_sincronizacion?.estado || "Sin reporte"}
                    </small>
                    {l.mensaje && <small>{l.mensaje}</small>}
                    {l.contadores_confirmados === false && (
                      <small>Contadores parciales. Recargue el archivo.</small>
                    )}
                  </td>
                  {[
                    "leidos",
                    "insertados",
                    "duplicados",
                    "rechazados",
                    "con_advertencias",
                  ].map((k) => (
                    <td key={k}>{fmt(l[k])}</td>
                  ))}
                  <td>
                    {l.duracion_total_ms != null
                      ? `${(l.duracion_total_ms / 1000).toFixed(1)} s`
                      : "En curso"}
                  </td>
                  <td>
                    <button
                      className="secondary small"
                      onClick={() => show(l.carga_id)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loads.length && (
          <p className="empty">Aun no hay archivos cargados.</p>
        )}
        <p className="footnote">
          Las advertencias conservan filas validas con datos especiales. El
          intento Neo4j es historico; el contador superior muestra los
          pendientes actuales.
        </p>
      </section>
      {selected && (
        <section className="panel">
          <div className="panel-heading">
            <h3>Errores de carga</h3>
            <button
              className="secondary small"
              onClick={() => setSelected(null)}
            >
              Cerrar
            </button>
          </div>
          <p className="footnote">{selected}</p>
          {errors.length === 0 ? (
            <p className="empty">No hay errores en esta pagina.</p>
          ) : (
            errors.map((e) => (
              <article className="error-card" key={e.numero_fila}>
                <b>
                  Registro {e.numero_fila}: {e.motivo}
                </b>
                <details>
                  <summary>Ver valores originales</summary>
                  <pre>{JSON.stringify(e.valores, null, 2)}</pre>
                </details>
              </article>
            ))
          )}
          <div className="pagination">
            <button
              className="secondary"
              disabled={!page}
              onClick={() => show(selected, page - 1)}
            >
              Anterior
            </button>
            <span>Pagina {page + 1}</span>
            <button
              className="secondary"
              disabled={errors.length < 100}
              onClick={() => show(selected, page + 1)}
            >
              Siguiente
            </button>
          </div>
        </section>
      )}
    </>
  );
}
function App() {
  const [tab, setTab] = useState("inicio"),
    [summary, setSummary] = useState({}),
    [loads, setLoads] = useState([]),
    [revision, setRevision] = useState(0),
    [message, setMessage] = useState("");
  async function refresh() {
    try {
      const [s, l] = await Promise.all([
        api("/cargas/resumen"),
        api("/cargas"),
      ]);
      setSummary(s);
      setLoads(l);
      setRevision((v) => v + 1);
      setMessage("");
    } catch (e) {
      setMessage(e.message);
      throw e;
    }
  }
  useEffect(() => {
    refresh().catch(() => {});
  }, []);
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Icon type="book" />
          </div>
          <div>
            <b>Admisiones</b>
            <span>USAC · Ingenieria</span>
          </div>
        </div>
        <p className="nav-caption">EXPLORAR DATOS</p>
        <nav>
          {[
            ["inicio", "Inicio", "grid"],
            ["consultas", "Consultas MongoDB", "chart"],
            ["cargas", "Carga de archivos", "upload"],
            ["neo4j", "Explorador Neo4j", "chart"],
          ].map(([key, text, icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              <Icon type={icon} />
              {text}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="gold-dot" />
          <b>Bases de Datos 2</b>
          <p>Analisis de pruebas especificas de primer ingreso.</p>
        </div>
        <small className="sidebar-foot">
          MongoDB + Neo4j
          <br />
          Facultad de Ingenieria
        </small>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">OBSERVATORIO DE ADMISIONES</span>
            <h1>
              {tab === "inicio"
                ? "Panorama general"
                : tab === "consultas"
                  ? "Exploracion analitica"
                  : tab === "neo4j"
                    ? "Exploracion de relaciones"
                    : "Gestion de datos"}
            </h1>
          </div>
          <button
            className="secondary"
            onClick={() => refresh().catch(() => {})}
          >
            Actualizar datos
          </button>
        </header>
        <main>
          {message && (
            <p role="alert" className="notice error">
              {message}
            </p>
          )}
          <div className="stats">
            {[
              [
                "Evaluaciones almacenadas",
                summary.evaluaciones,
                "Registros distintos en MongoDB",
                "blue",
              ],
              [
                "Pendientes de Neo4j",
                summary.pendientes_neo4j,
                "Registros por sincronizar",
                "gold",
              ],
              [
                "Cargas registradas",
                summary.cargas,
                "Incluye recargas de archivos",
                "teal",
              ],
            ].map(([k, v, n, c]) => (
              <article className={`stat ${c}`} key={k}>
                <div>
                  <small>{k}</small>
                  <strong>{v == null ? "—" : fmt(v)}</strong>
                  <p>{n}</p>
                </div>
                <span className="stat-icon">
                  <Icon
                    type={
                      c === "blue" ? "book" : c === "gold" ? "chart" : "upload"
                    }
                  />
                </span>
              </article>
            ))}
          </div>
          {tab === "inicio" && (
            <Dashboard
              revision={revision}
              onQueries={() => setTab("consultas")}
            />
          )}{" "}
          {tab === "consultas" && (
            <Consultas
              revision={revision}
              onRefresh={() => refresh().catch(() => {})}
            />
          )}{" "}
          {tab === "neo4j" && (
            <React.Suspense
              fallback={<p className="empty">Cargando explorador...</p>}
            >
              <Neo4jVista
                api={api}
                Tabla={ResultTable}
                Barras={Bars}
                revision={revision}
              />
            </React.Suspense>
          )}
          {tab === "cargas" && (
            <Cargas loads={loads} summary={summary} onRefresh={refresh} />
          )}
          <footer>
            Datos Abiertos · Facultad de Ingenieria USAC{" "}
            <span>Proyecto academico de analisis NoSQL</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
