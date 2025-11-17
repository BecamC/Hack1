import { useState, useEffect, useRef } from "react"

interface Reporte {
  tenant_id: string
  uuid: string
  tipo_incidente: string
  nivel_urgencia: string
  ubicacion: string
  tipo_usuario: string
  descripcion: string
  estado?: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://bjn3x9fv10.execute-api.us-east-1.amazonaws.com/dev"

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "wss://9uubdx8ktg.execute-api.us-east-1.amazonaws.com/dev"

function App() {
  const TENANT_ID = "utec"

  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterType, setFilterType] = useState<string>("tipo")

  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<any>(null)

  // ========================================================
  // 🔵 1. WebSocket con reconexión + getIncidents
  // ========================================================
  const connectWS = () => {
    console.log("Conectando WebSocket ADMIN...")

    ws.current = new WebSocket(WS_URL)

    ws.current.onopen = () => {
      console.log("WS Conectado ✔️")

      // 👉 Pedir lista completa de incidentes
      ws.current?.send(JSON.stringify({ action: "getIncidents" }))

      // 👉 Registrar admin (lo mantengo igual que tu código)
      ws.current?.send(
        JSON.stringify({
          action: "register",
          username: "admin"
        })
      )
    }

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      console.log("📩 WS message:", msg)

      // 👉 Lista completa de incidentes
      if (msg.type === "incidentsList") {
        console.log("📋 Lista de incidentes recibida")
        setReportes(msg.incidents ?? [])
      }

      // 👉 Nuevo reporte en tiempo real
      if (msg.type === "nuevoReporte") {
        setReportes((prev) => [...prev, msg.data])
      }

      // 👉 newIncident también llega en algunos flujos
      if (msg.type === "newIncident") {
        setReportes((prev) => [...prev, msg.incident])
      }

      // 👉 Error WS
      if (msg.type === "error") {
        console.error("❌ Error WS:", msg.message)
      }
    }

    ws.current.onclose = () => {
      console.warn("❌ WS Desconectado, reconectando en 5s…")

      // Reconexión automática
      reconnectTimeout.current = setTimeout(connectWS, 5000)
    }

    ws.current.onerror = (err) => {
      console.error("WS Error:", err)
      ws.current?.close()
    }
  }

  useEffect(() => {
    connectWS()
    return () => {
      clearTimeout(reconnectTimeout.current)
      ws.current?.close()
    }
  }, [])

  // ========================================================
  // 🔵 2. REST: cargar incidentes una sola vez
  // ========================================================
  const fetchReportes = async () => {
    setLoading(true)
    setError("")

    try {
      const url = `${API_BASE_URL}/reporte/listar?tenant_id=${TENANT_ID}`
      const resp = await fetch(url)

      if (!resp.ok) {
        throw new Error(`HTTP Error ${resp.status}`)
      }

      let data = await resp.json()
      if (typeof data.body === "string") {
        data = JSON.parse(data.body)
      }

      setReportes(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reportes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportes()
  }, [])

  // ========================================================
  // 🔵 3. Filtro local
  // ========================================================
  const reportesFiltrados = reportes.filter((r) => {
    if (!searchTerm.trim()) return true
    const s = searchTerm.toLowerCase()

    return filterType === "tipo"
      ? r.tipo_incidente.toLowerCase().includes(s)
      : r.ubicacion.toLowerCase().includes(s)
  })

  // ========================================================
  // 🔵 4. Eliminar
  // ========================================================
  const handleEliminar = async (uuid: string) => {
    if (!confirm("¿Seguro de eliminar este reporte?")) return

    try {
      const url = `${API_BASE_URL}/reporte/${uuid}?tenant_id=${TENANT_ID}`
      const resp = await fetch(url, { method: "DELETE" })

      let data = await resp.json()
      if (typeof data.body === "string") {
        data = JSON.parse(data.body)
      }

      if (!resp.ok) {
        throw new Error(data.error || data.mensaje)
      }

      setReportes((prev) => prev.filter((r) => r.uuid !== uuid))
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error eliminando reporte")
    }
  }

  // ========================================================
  // UI (NO MODIFIQUÉ NADA)
  // ========================================================
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="mb-12">
          <h1 className="text-5xl font-black text-black mb-3">
            Panel de Administración — UTEC
          </h1>
          <p className="text-gray-600 text-lg">
            Administración de reportes del tenant{" "}
            <span className="font-semibold">utec</span> en tiempo real
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 px-6 py-4 rounded-lg mb-8 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* BUSCADOR */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 mb-8">
          <h3 className="text-black font-semibold mb-4">Filtrar Reportes</h3>
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 rounded-lg bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tipo">Buscar por Tipo</option>
              <option value="ubicacion">Buscar por Ubicación</option>
            </select>

            <input
              type="text"
              placeholder={
                filterType === "tipo"
                  ? "ej: Robo, Accidente..."
                  : "ej: Piso 11, Biblioteca..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white text-black placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={() => setSearchTerm("")}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Limpiar
            </button>
          </div>

          {searchTerm && (
            <p className="text-gray-600 text-sm mt-3">
              Mostrando {reportesFiltrados.length} de {reportes.length} reportes
            </p>
          )}
        </div>

        {/* LISTA */}
        <div>
          {loading && reportes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">⏳ Cargando reportes...</p>
            </div>
          ) : reportesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {searchTerm
                  ? "No hay reportes que coincidan con tu búsqueda"
                  : "No hay reportes registrados"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportesFiltrados.map((r) => (
                <div
                  key={r.uuid}
                  className="bg-white border border-gray-300 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-black mb-2">
                        {r.tipo_incidente}
                      </h3>
                      <p className="text-gray-700 mb-2">📍 {r.ubicacion}</p>
                      <p className="text-gray-600 text-sm">{r.descripcion}</p>
                    </div>

                    <span
                      className={`px-4 py-2 rounded-full font-semibold text-sm ml-4 ${
                        r.nivel_urgencia === "alta"
                          ? "bg-red-200 text-red-800"
                          : r.nivel_urgencia === "media"
                          ? "bg-yellow-200 text-yellow-800"
                          : "bg-green-200 text-green-800"
                      }`}
                    >
                      {r.nivel_urgencia?.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <span className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded-full font-mono">
                      {r.tipo_usuario}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {r.estado || "pendiente"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleEliminar(r.uuid)}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
