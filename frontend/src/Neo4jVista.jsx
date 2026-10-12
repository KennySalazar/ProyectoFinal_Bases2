import { textoVisible } from "./texto";
import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
const colores = {
  Aspirante: "#2971b8",
  Evaluacion: "#dfaa38",
  Materia: "#389d8d",
  Carrera: "#8366b4",
  TipoInstitucion: "#dc7d54",
  Municipio: "#489db5",
  Departamento: "#647b92",
};
function Red({ datos }) {
  const contenedor = useRef(null),
    red = useRef(null);
  const [seleccion, setSeleccion] = useState(null);
  useEffect(() => {
    setSeleccion(null);
    const elementos = [
      ...datos.nodos.map((n) => ({
        data: {
          ...n,
          label:
            n.nombre.length > 30 ? n.nombre.slice(0, 27) + "..." : n.nombre,
          color: colores[n.tipo],
        },
      })),
      ...datos.relaciones.map((r) => ({
        data: { ...r, source: r.origen, target: r.destino, label: r.tipo },
      })),
    ];
    const cy = cytoscape({
      container: contenedor.current,
      elements: elementos,
      minZoom: 0.15,
      maxZoom: 3,
      wheelSensitivity: 0.2,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            label: "data(label)",
            "font-size": 10,
            "text-wrap": "wrap",
            "text-max-width": 110,
            "text-valign": "bottom",
            "text-margin-y": 7,
            color: "#29435e",
            width: 32,
            height: 32,
            "border-width": 2,
            "border-color": "white",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.4,
            "line-color": "#b6c9db",
            "target-arrow-color": "#8ea9bf",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 7,
            color: "#5e7890",
            "text-background-color": "#f7fafd",
            "text-background-opacity": 0.9,
            "text-background-padding": 2,
          },
        },
        {
          selector: ":selected",
          style: {
            "border-width": 4,
            "border-color": "#17395b",
            "line-color": "#245b92",
            "target-arrow-color": "#245b92",
          },
        },
      ],
      layout: {
        name: "breadthfirst",
        directed: true,
        roots: '[tipo = "Aspirante"]',
        spacingFactor: 1.5,
        avoidOverlap: true,
        animate: false,
        padding: 45,
      },
    });
    red.current = cy;
    cy.on("tap", "node,edge", (e) => setSeleccion(e.target.data()));
    const resize = new ResizeObserver(() => {
      cy.resize();
    });
    resize.observe(contenedor.current);
    return () => {
      resize.disconnect();
      cy.destroy();
      red.current = null;
    };
  }, [datos]);
  return (
    <>
      <div className="actions graph-tools">
        <button
          className="secondary small"
          onClick={() => red.current?.fit(undefined, 35)}
        >
          Ajustar vista
        </button>
        <button
          className="secondary small"
          onClick={() =>
            red.current?.zoom(Math.min(3, red.current.zoom() * 1.25))
          }
        >
          Acercar
        </button>
        <button
          className="secondary small"
          onClick={() =>
            red.current?.zoom(Math.max(0.15, red.current.zoom() / 1.25))
          }
        >
          Alejar
        </button>
        <button
          className="secondary small"
          onClick={() =>
            red.current
              ?.layout({
                name: "breadthfirst",
                directed: true,
                padding: 40,
                spacingFactor: 1.6,
                animate: false,
              })
              .run()
          }
        >
          Ordenar por niveles
        </button>
      </div>
      <div
        ref={contenedor}
        className="graph-canvas"
        aria-label="Grafo de relaciones de admisiones"
      />
      <div className="graph-legend">
        {Object.entries(colores).map(([k, v]) => (
          <span key={k}>
            <i style={{ background: v }} />
            {k}
          </span>
        ))}
      </div>
      {seleccion ? (
        <section className="node-detail">
          <h3>
            {seleccion.tipo}: {seleccion.nombre || "Relacion"}
          </h3>
          <pre>
            {JSON.stringify(
              seleccion.propiedades || {
                origen: seleccion.origen,
                destino: seleccion.destino,
                tipo: seleccion.tipo,
              },
              null,
              2,
            )}
          </pre>
        </section>
      ) : (
        <p className="footnote">
          Selecciona un nodo para ver sus propiedades completas. Arrastra los
          nodos y usa la rueda para acercar o alejar.
        </p>
      )}
      <details>
        <summary>Ver nodos y relaciones como datos</summary>
        <pre>{JSON.stringify(datos, null, 2)}</pre>
      </details>
    </>
  );
}
export default function Neo4jVista({
  api,
  Tabla,
  Barras,
  revision,
  aspiranteInicial = "",
}) {
  const [modo, setModo] = useState("grafo"),
    [catalogo, setCatalogo] = useState([]),
    [opciones, setOpciones] = useState({}),
    [totales, setTotales] = useState({}),
    [id, setId] = useState(1),
    [filtros, setFiltros] = useState(
      aspiranteInicial ? { aspirante: aspiranteInicial } : {},
    ),
    [aplicados, setAplicados] = useState({}),
    [limite, setLimite] = useState(10),
    [datos, setDatos] = useState(null),
    [resultado, setResultado] = useState(null),
    [ocupado, setOcupado] = useState(false),
    [mensaje, setMensaje] = useState("");
  useEffect(() => {
    let activo = true;
    Promise.all([
      api("/neo4j/consultas"),
      api("/neo4j/opciones"),
      api("/neo4j/resumen"),
    ])
      .then(([c, o, t]) => {
        if (activo) {
          setCatalogo(c);
          setOpciones(o);
          setTotales(t);
        }
      })
      .catch((e) => {
        if (activo) setMensaje(e.message);
      });
    return () => {
      activo = false;
    };
  }, [revision]);
  const consulta = catalogo.find((c) => c.id === id);
  const campos = [
    ["anio", "Año de ingreso", "anios"],
    ["carrera", "Carrera", "carreras"],
    ["materia", "Materia", "materias"],
    ["tipo", "Tipo de institucion", "tipos"],
    ["departamento", "Departamento", "departamentos"],
  ];
  async function ejecutar(pagina = 0, f = filtros) {
    setOcupado(true);
    setMensaje("");
    try {
      const params = new URLSearchParams(
        Object.entries(f).filter(([, v]) => v),
      );
      if (modo === "grafo") {
        params.set("limite", limite);
        const d = await api("/neo4j/grafo?" + params);
        setDatos(d);
        setAplicados(f);
      } else {
        params.set("pagina", pagina);
        params.set("tamano", 25);
        const d = await api(`/neo4j/consultas/${id}?${params}`);
        setResultado(d);
        setAplicados(f);
      }
    } catch (e) {
      setMensaje(e.message);
      if (modo === "grafo") setDatos(null);
      else setResultado(null);
    } finally {
      setOcupado(false);
    }
  }
  function cambiarModo(m) {
    setModo(m);
    setFiltros({});
    setAplicados({});
    setMensaje("");
    setResultado(null);
    setDatos(null);
  }
  const metric = resultado?.filas?.[0]
    ? Object.keys(resultado.filas[0]).find((k) => k.includes("porcentaje")) ||
      Object.keys(resultado.filas[0]).find(
        (k) =>
          typeof resultado.filas[0][k] === "number" &&
          !["anio_de_ingreso", "oportunidad"].includes(k),
      )
    : null;
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">RELACIONES Y RECORRIDOS</span>
          <h2>Explorador Neo4j</h2>
          <p>
            Conoce las conexiones entre aspirantes, evaluaciones y procedencia.
          </p>
        </div>
        <span className="pill">Base de grafos</span>
      </div>
      <div className="neo-summary">
        {[
          ["Evaluaciones", totales.evaluaciones],
          ["Aspirantes", totales.aspirantes],
          ["Relaciones", totales.relaciones],
        ].map(([k, v]) => (
          <span key={k}>
            {k}: <b>{v == null ? "—" : v.toLocaleString("es-GT")}</b>
          </span>
        ))}
      </div>
      <div className="actions neo-tabs">
        <button
          disabled={ocupado}
          className={modo === "grafo" ? "" : "secondary"}
          onClick={() => cambiarModo("grafo")}
        >
          Explorar grafo
        </button>
        <button
          disabled={ocupado}
          className={modo === "consultas" ? "" : "secondary"}
          onClick={() => cambiarModo("consultas")}
        >
          Cinco consultas Cypher
        </button>
      </div>
      <section className="panel">
        {modo === "consultas" && (
          <>
            <label className="neo-selector">
              Consulta
              <select
                disabled={ocupado}
                value={id}
                onChange={(e) => {
                  setId(Number(e.target.value));
                  setFiltros({});
                  setResultado(null);
                  setMensaje("");
                }}
              >
                {catalogo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}. {textoVisible(c.titulo)}
                  </option>
                ))}
              </select>
            </label>
            <p>{textoVisible(consulta?.descripcion)}</p>
            <details>
              <summary>Ver consulta Cypher</summary>
              <pre>{consulta?.cypher}</pre>
            </details>
          </>
        )}
        <div className="filters">
          {campos.map(([k, n, o]) => (
            <label key={k}>
              {n}
              <select
                disabled={
                  ocupado ||
                  (modo === "consultas" && id === 4 && k === "materia")
                }
                value={filtros[k] || ""}
                onChange={(e) =>
                  setFiltros({ ...filtros, [k]: e.target.value })
                }
              >
                <option value="">Todos</option>
                {(opciones[o] || []).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            Correlativo del aspirante
            <input
              placeholder="Identificador anonimo exacto"
              disabled={ocupado}
              value={filtros.aspirante || ""}
              onChange={(e) =>
                setFiltros({ ...filtros, aspirante: e.target.value })
              }
            />
          </label>
          {modo === "grafo" && (
            <>
              <label>
                Resultado
                <select
                  disabled={ocupado}
                  value={filtros.aprobacion || ""}
                  onChange={(e) =>
                    setFiltros({ ...filtros, aprobacion: e.target.value })
                  }
                >
                  <option value="">Todos</option>
                  <option>APROBADO</option>
                  <option>NO APROBADO</option>
                </select>
              </label>
              <label>
                Maximo de evaluaciones
                <select
                  disabled={ocupado}
                  value={limite}
                  onChange={(e) => setLimite(Number(e.target.value))}
                >
                  {[5, 10, 20, 30].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <div className="actions">
          <button
            disabled={
              ocupado ||
              (modo === "consultas" && id === 1 && !filtros.aspirante?.trim())
            }
            onClick={() => ejecutar()}
          >
            {modo === "grafo" ? "Visualizar grafo" : "Ejecutar consulta"}
          </button>
          <button
            className="secondary"
            disabled={ocupado}
            onClick={() => {
              setFiltros({});
              setDatos(null);
              setResultado(null);
              setAplicados({});
            }}
          >
            Limpiar filtros
          </button>
        </div>
        {ocupado && (
          <p className="notice" role="status">
            Consultando Neo4j...
          </p>
        )}
        {mensaje && (
          <p className="notice error" role="alert">
            {mensaje}
          </p>
        )}
        <p className="footnote">
          El grafo es una muestra de evaluaciones, no una estadistica global.
          Las consultas utilizan todos los registros que cumplen sus filtros.
          MongoDB y Neo4j pueden diferir si existen cargas pendientes de
          sincronizar.
        </p>
      </section>
      {modo === "grafo" && datos && (
        <section className="panel">
          <div className="panel-heading">
            <h3>Relaciones de admisiones</h3>
            <span className="tag">
              {datos.evaluaciones_mostradas} evaluaciones · {datos.nodos.length}{" "}
              nodos · {datos.relaciones.length} relaciones
            </span>
          </div>
          <p className="footnote">
            Filtros aplicados:{" "}
            {Object.entries(aplicados)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ") || "Todos los datos"}
            .
          </p>
          {datos.hay_mas && (
            <p className="notice">
              Hay mas evaluaciones que coinciden. Agrega filtros o cambia el
              limite para explorar otra muestra.
            </p>
          )}
          {datos.nodos.length ? (
            <Red datos={datos} />
          ) : (
            <p className="empty">
              No hay evaluaciones que coincidan con estos filtros.
            </p>
          )}
        </section>
      )}
      {modo === "consultas" && resultado && (
        <section className="panel">
          <div className="panel-heading">
            <h3>Resultados de Neo4j</h3>
            <span className="tag">{resultado.total} filas</span>
          </div>
          <p className="footnote">
            Filtros aplicados:{" "}
            {Object.entries(aplicados)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ") || "Todos los datos"}
            .
          </p>
          {id !== 1 && metric && (
            <>
              <Barras rows={resultado.filas} metric={metric} title={metric} />
              <p className="footnote">
                Grafico de las primeras 10 filas de la pagina actual.
              </p>
            </>
          )}
          <Tabla rows={resultado.filas} />
          <div className="pagination">
            <button
              className="secondary"
              disabled={ocupado || resultado.pagina === 0}
              onClick={() => ejecutar(resultado.pagina - 1, aplicados)}
            >
              Anterior
            </button>
            <span>
              Pagina {resultado.pagina + 1} de{" "}
              {Math.max(1, Math.ceil(resultado.total / 25))}
            </span>
            <button
              className="secondary"
              disabled={
                ocupado || (resultado.pagina + 1) * 25 >= resultado.total
              }
              onClick={() => ejecutar(resultado.pagina + 1, aplicados)}
            >
              Siguiente
            </button>
          </div>
        </section>
      )}
    </>
  );
}
