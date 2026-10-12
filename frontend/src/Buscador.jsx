import React, { useEffect, useState } from "react";
export default function Buscador({ api, Tabla, abrirGrafo, revision }) {
  const [opciones, setOpciones] = useState({}),
    [filtros, setFiltros] = useState({}),
    [aplicados, setAplicados] = useState({}),
    [resultado, setResultado] = useState(null),
    [ocupado, setOcupado] = useState(false),
    [mensaje, setMensaje] = useState(""),
    [detalle, setDetalle] = useState(null),
    [historial, setHistorial] = useState(null),
    [aspirante, setAspirante] = useState("");
  useEffect(() => {
    let activo = true;
    Promise.all([api("/consultas/opciones"), api("/busqueda/opciones")])
      .then(([a, b]) => {
        if (activo) setOpciones({ ...a, ...b });
      })
      .catch((e) => {
        if (activo) setMensaje(e.message);
      });
    return () => {
      activo = false;
    };
  }, [revision]);
  const campos = [
    ["anio", "Año de ingreso", "anios"],
    ["carrera", "Carrera", "carreras"],
    ["materia", "Materia", "materias"],
    ["tipo", "Tipo de institucion", "tipos"],
    ["departamento", "Departamento", "departamentos"],
    ["municipio", "Municipio de la institucion", "municipios"],
  ];
  async function buscar(pagina = 0, f = filtros) {
    setOcupado(true);
    setMensaje("");
    setDetalle(null);
    setHistorial(null);
    try {
      const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
      q.set("pagina", pagina);
      q.set("tamano", 25);
      const r = await api("/busqueda?" + q);
      setResultado(r);
      setAplicados(f);
    } catch (e) {
      setMensaje(e.message);
      setResultado(null);
    } finally {
      setOcupado(false);
    }
  }
  async function verDetalle(id) {
    setOcupado(true);
    setMensaje("");
    try {
      setDetalle(await api("/busqueda/evaluaciones/" + id));
    } catch (e) {
      setMensaje(e.message);
    } finally {
      setOcupado(false);
    }
  }
  async function verHistorial(id, pagina = 0) {
    setOcupado(true);
    setMensaje("");
    try {
      const r = await api(
        "/consultas/15?" +
          new URLSearchParams({ aspirante: id, pagina, tamano: 25 }),
      );
      setHistorial(r);
      setAspirante(id);
      setDetalle(null);
    } catch (e) {
      setMensaje(e.message);
    } finally {
      setOcupado(false);
    }
  }
  const tabla = (rows) => (
    <div className="table-wrap">
      <table className="search-results-table">
        <thead>
          <tr>
            {[
              "Aspirante",
              "Año",
              "Materia",
              "Oportunidad",
              "Resultado",
              "Carrera",
              "Procedencia institucional",
              "Acciones",
            ].map((k) => (
              <th key={k}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.evaluacion_id}>
              <td>
                <code>{r.correlativo_aspirante}</code>
              </td>
              <td>{r.anio_de_ingreso}</td>
              <td>{r.materia}</td>
              <td>{r.numero_de_fecha_de_evaluacion}</td>
              <td>
                <span
                  className={`badge ${r.aprobacion === "APROBADO" ? "good" : "warn"}`}
                >
                  {r.aprobacion}
                </span>
              </td>
              <td>{r.carrera_objetivo}</td>
              <td>
                {r.municipio_institucion_educativa}
                <small>
                  {r.departamento_institucion_educativa} ·{" "}
                  {r.tipo_institucion_educativa}
                </small>
              </td>
              <td>
                <div className="search-actions">
                  <button
                    className="secondary small"
                    disabled={ocupado}
                    onClick={() => verDetalle(r.evaluacion_id)}
                  >
                    Detalle
                  </button>
                  <button
                    className="secondary small"
                    disabled={ocupado}
                    onClick={() => verHistorial(r.correlativo_aspirante)}
                  >
                    Historial
                  </button>
                  <button
                    className="secondary small"
                    disabled={ocupado}
                    onClick={() => abrirGrafo(r.correlativo_aspirante)}
                  >
                    Grafo
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">EXPLORAR REGISTROS</span>
          <h2>Buscador de evaluaciones</h2>
          <p>
            Encuentra registros y consulta el historial o las relaciones del
            aspirante.
          </p>
        </div>
        <span className="pill">MongoDB</span>
      </div>
      <section className="panel">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            buscar();
          }}
        >
          <label className="search-text">
            Buscar por texto
            <input
              placeholder="Correlativo, carrera, materia, municipio, departamento o tipo"
              value={filtros.texto || ""}
              disabled={ocupado}
              onChange={(e) =>
                setFiltros({ ...filtros, texto: e.target.value })
              }
            />
          </label>
          <div className="filters">
            {campos.map(([k, n, o]) => (
              <label key={k}>
                {n}
                <select
                  value={filtros[k] || ""}
                  disabled={ocupado}
                  onChange={(e) =>
                    setFiltros({ ...filtros, [k]: e.target.value })
                  }
                >
                  <option value="">Todos</option>
                  {(opciones[o] || []).map((v) => (
                    <option value={v} key={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
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
              Correlativo exacto
              <input
                value={filtros.aspirante || ""}
                disabled={ocupado}
                placeholder="Opcional: ID anonimo completo"
                onChange={(e) =>
                  setFiltros({ ...filtros, aspirante: e.target.value })
                }
              />
            </label>
          </div>
          <div className="actions">
            <button type="submit" disabled={ocupado}>
              Buscar evaluaciones
            </button>
            <button
              type="button"
              className="secondary"
              disabled={ocupado}
              onClick={() => {
                setFiltros({});
                setResultado(null);
                setHistorial(null);
                setDetalle(null);
                setMensaje("");
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </form>
        <p className="footnote">
          Cada resultado es una evaluacion; un aspirante puede aparecer varias
          veces. El texto busca coincidencias parciales sin distinguir
          mayusculas. Los selectores aplican valores exactos. La institucion
          disponible es su tipo y ubicacion; la fuente no contiene nombres de
          colegios.
        </p>
        {ocupado && (
          <p role="status" className="notice">
            Consultando registros...
          </p>
        )}
        {mensaje && (
          <p role="alert" className="notice error">
            {mensaje}
          </p>
        )}
      </section>
      {resultado && (
        <section className="panel">
          <div className="panel-heading">
            <h3>Evaluaciones encontradas</h3>
            <span className="tag">
              {resultado.total.toLocaleString("es-GT")} registros
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
          {resultado.filas.length ? (
            tabla(resultado.filas)
          ) : (
            <p className="empty">
              No se encontraron evaluaciones con estos criterios.
            </p>
          )}
          <div className="pagination">
            <button
              className="secondary"
              disabled={ocupado || resultado.pagina === 0}
              onClick={() => buscar(resultado.pagina - 1, aplicados)}
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
              onClick={() => buscar(resultado.pagina + 1, aplicados)}
            >
              Siguiente
            </button>
          </div>
        </section>
      )}
      {historial && (
        <section className="panel">
          <div className="panel-heading">
            <h3>Historial completo del aspirante</h3>
            <button
              className="secondary small"
              onClick={() => setHistorial(null)}
            >
              Cerrar historial
            </button>
          </div>
          <p className="footnote">
            {aspirante} · {historial.total} evaluaciones. Este historial incluye
            todos los años y materias del ID, sin los filtros del buscador.
          </p>
          {tabla(historial.filas)}
          <div className="pagination">
            <button
              className="secondary"
              disabled={ocupado || historial.pagina === 0}
              onClick={() => verHistorial(aspirante, historial.pagina - 1)}
            >
              Anterior
            </button>
            <span>Pagina {historial.pagina + 1}</span>
            <button
              className="secondary"
              disabled={
                ocupado || (historial.pagina + 1) * 25 >= historial.total
              }
              onClick={() => verHistorial(aspirante, historial.pagina + 1)}
            >
              Siguiente
            </button>
          </div>
        </section>
      )}
      {detalle && (
        <section
          className="panel"
          role="region"
          aria-label="Detalle de evaluacion"
        >
          <div className="panel-heading">
            <h3>Detalle de evaluacion</h3>
            <button
              className="secondary small"
              onClick={() => setDetalle(null)}
            >
              Cerrar detalle
            </button>
          </div>
          <Tabla
            rows={[
              Object.fromEntries(
                Object.entries(detalle).filter(
                  ([k]) => !["originales", "advertencias"].includes(k),
                ),
              ),
            ]}
          />
          <h3 className="detail-title">Advertencias del registro</h3>
          {detalle.advertencias?.length ? (
            <ul>
              {detalle.advertencias.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p>Sin advertencias.</p>
          )}
          <details>
            <summary>Ver valores originales del CSV</summary>
            <pre>{JSON.stringify(detalle.originales, null, 2)}</pre>
          </details>
        </section>
      )}
    </>
  );
}
