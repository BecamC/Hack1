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
  "https://4iyael92qd.execute-api.us-east-1.amazonaws.com/dev"

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "wss://nr6709dv4c.execute-api.us-east-1.amazonaws.com/dev"

function App() {
  const TENANT_ID = "utec"

  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null)
  const [showDetails, setShowDetails] = useState<boolean>(false)

  const ws = useRef<WebSocket | null>(null)

  // ========================================================
  // 🔵 1. WebSocket Tiempo Real
  // ========================================================
  useEffect(() => {
    console.log("Conectando WebSocket ADMIN...")

    ws.current = new WebSocket(WS_URL)

    ws.current.onopen = () => {
      console.log("WS Conectado")

      // Registrar admin
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

      // ======================
      // INCIDENTES INICIALES
      // ======================
      if (msg.type === "incidentsList") {
        setReportes(msg.incidents)
      }

      // ======================
      // NUEVO INCIDENTE
      // ======================
      if (msg.type === "newIncident") {
        setReportes((prev) => [...prev, msg.incident])

        // Si estás viendo detalles del mismo, actualiza
        if (selectedReporte?.uuid === msg.incident.uuid) {
          setSelectedReporte(msg.incident)
        }
      }

      // ======================
      // INCIDENTE ACTUALIZADO
      // ======================
      if (msg.type === "updateIncident") {
        setReportes((prev) =>
          prev.map((r) => (r.uuid === msg.incident.uuid ? msg.incident : r))
        )

        if (selectedReporte?.uuid === msg.incident.uuid) {
          setSelectedReporte(msg.incident)
        }
      }
    }

    ws.current.onclose = () => {
      console.warn("❌ WS Desconectado, intentando reconectar...")
    }

    return () => ws.current?.close()
  }, [selectedReporte])

  // ========================================================
  // 🔵 2. Listar reportes por REST (solo una vez)
  // ========================================================
  const fetchReportes = async () => {
    setLoading(true)
    setError("")

    try {
      const resp = await fetch(
        `${API_BASE_URL}/reporte/listar?tenant_id=${TENANT_ID}`
      )

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || data.mensaje)

      setReportes(data.items || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar reportes"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportes()
  }, [])

  // ========================================================
  // 🔵 3. Obtener detalles
  // ========================================================
  const fetchReporteDetalle = async (uuid: string) => {
    setLoading(true)
    setError("")

    try {
      const resp = await fetch(
        `${API_BASE_URL}/reporte/${uuid}?tenant_id=${TENANT_ID}`
      )
      const data = await resp.json()

      if (!resp.ok) throw new Error(data.error || data.mensaje)

      setSelectedReporte(data.item)
      setShowDetails(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el reporte"
      )
    } finally {
      setLoading(false)
    }
  }

  // ========================================================
  // 🔵 4. Eliminar reporte (REST)
  // ========================================================
  const handleEliminar = async (uuid: string) => {
    if (!confirm("¿Seguro de eliminar este reporte?")) return

    try {
      const resp = await fetch(
        `${API_BASE_URL}/reporte/${uuid}?tenant_id=${TENANT_ID}`,
        { method: "DELETE" }
      )

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || data.mensaje)

      // Eliminación local
      setReportes((prev) => prev.filter((r) => r.uuid !== uuid))

      if (selectedReporte?.uuid === uuid) {
        setSelectedReporte(null)
        setShowDetails(false)
      }
    } catch (err) {
      setError("Error eliminando reporte")
    }
  }

  // ========================================================
  // ESTILO URGENCIA
  // ========================================================
  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia?.toLowerCase()) {
      case "alta":
        return "text-red-700 bg-red-100"
      case "media":
        return "text-yellow-700 bg-yellow-100"
      case "baja":
        return "text-green-700 bg-green-100"
      default:
        return "text-gray-700 bg-gray-100"
    }
  }

  // ========================================================
  // UI
  // ========================================================
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-black mb-2">
          Panel de Administración — UTEC
        </h1>
        <p className="text-gray-600">
          Administración de reportes del tenant <b>utec</b> en tiempo real.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="max-w-4xl mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* DETALLES */}
      {showDetails && selectedReporte && (
        <div className="max-w-4xl mx-auto mb-8 p-6 bg-gray-50 border rounded-lg">
          <h2 className="text-lg font-semibold text-black mb-4">
            Detalles del Reporte
          </h2>

          <p><b>UUID:</b> {selectedReporte.uuid}</p>
          <p><b>Tipo:</b> {selectedReporte.tipo_incidente}</p>
          <p><b>Urgencia:</b> {selectedReporte.nivel_urgencia}</p>
          <p><b>Ubicación:</b> {selectedReporte.ubicacion}</p>
          <p><b>Usuario:</b> {selectedReporte.tipo_usuario}</p>
          <p><b>Descripción:</b> {selectedReporte.descripcion}</p>
          <p><b>Estado:</b> {selectedReporte.estado || "pendiente"}</p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleEliminar(selectedReporte.uuid)}
              className="bg-red-600 text-white px-6 py-2 rounded-lg"
            >
              Eliminar
            </button>

            <button
              onClick={() => {
                setSelectedReporte(null)
                setShowDetails(false)
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      <div className="max-w-4xl mx-auto">
        {loading && reportes.length === 0 ? (
          <p className="text-gray-500 text-lg text-center">Cargando…</p>
        ) : reportes.length === 0 ? (
          <p className="text-gray-500 text-lg text-center">No hay reportes</p>
        ) : (
          <div className="space-y-4">
            {reportes.map((r) => (
              <div
                key={r.uuid}
                className="bg-white border p-4 rounded-lg hover:shadow-md"
              >
                <h3 className="font-bold text-lg">{r.tipo_incidente}</h3>
                <p>📍 {r.ubicacion}</p>
                <p className="mt-1">{r.descripcion}</p>

                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${getUrgenciaColor(
                    r.nivel_urgencia
                  )}`}
                >
                  {r.nivel_urgencia}
                </span>

                <p className="mt-1 text-blue-700 text-sm">
                  Estado: {r.estado || "pendiente"}
                </p>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => fetchReporteDetalle(r.uuid)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Ver Detalles
                  </button>

                  <button
                    onClick={() => handleEliminar(r.uuid)}
                    className="text-red-600 font-semibold text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
