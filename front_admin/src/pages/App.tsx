import { useState, useEffect, useRef } from "react"
import Login from "./Login"

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

interface Admin {
  email: string
  nombre: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://bjn3x9fv10.execute-api.us-east-1.amazonaws.com/dev"

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "wss://9uubdx8ktg.execute-api.us-east-1.amazonaws.com/dev"

function App() {
  const TENANT_ID = "utec"

  const [admin, setAdmin] = useState<Admin | null>(null)
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [filterType, setFilterType] = useState<string>("tipo")

  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<any>(null)

  // Verificar si hay sesión activa
  useEffect(() => {
    const adminGuardado = localStorage.getItem("admin")
    console.log("🔍 Verificando localStorage:", adminGuardado)
    if (adminGuardado) {
      const parsedAdmin = JSON.parse(adminGuardado)
      console.log("✅ Admin encontrado:", parsedAdmin)
      setAdmin(parsedAdmin)
    }
  }, [])

  // ========================================================
  // 🔵 WebSocket con reconexión + getIncidents
  // ========================================================
  useEffect(() => {
    // Solo conectar si hay admin
    if (!admin) return

    const connectWS = () => {
      console.log("Conectando WebSocket ADMIN...")

      ws.current = new WebSocket(WS_URL)

      ws.current.onopen = () => {
        console.log("WS Conectado ✔️")

        // 👉 Pedir lista completa de incidentes
        ws.current?.send(JSON.stringify({ action: "getIncidents" }))

        // 👉 Registrar admin
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

    connectWS()

    return () => {
      clearTimeout(reconnectTimeout.current)
      ws.current?.close()
    }
  }, [admin]) // Dependencia: admin

  // ========================================================
  // 🔵 REST: cargar incidentes una sola vez
  // ========================================================
  useEffect(() => {
    // Solo cargar si hay admin
    if (!admin) return

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

    fetchReportes()
  }, [admin]) // Dependencia: admin

  const handleLoginSuccess = (adminData: Admin) => {
    console.log("🎯 handleLoginSuccess llamado con:", adminData)
    setAdmin(adminData)
  }

  const handleLogout = () => {
    localStorage.removeItem("admin")
    localStorage.removeItem("token")
    setAdmin(null)
  }

  console.log("🔍 Estado actual de admin:", admin)

  // Si no hay admin, mostrar login
  if (!admin) {
    console.log("❌ No hay admin, mostrando Login")
    return <Login onLoginSuccess={handleLoginSuccess} apiUrl={API_BASE_URL} />
  }

  console.log("✅ Admin existe, mostrando dashboard")

  // ========================================================
  // 🔵 Filtro local
  // ========================================================
  const reportesFiltrados = reportes.filter((r) => {
    if (!searchTerm.trim()) return true
    const s = searchTerm.toLowerCase()

    return filterType === "tipo"
      ? r.tipo_incidente.toLowerCase().includes(s)
      : r.ubicacion.toLowerCase().includes(s)
  })

  // ========================================================
  // 🔵 Eliminar
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
        <div className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-black text-black mb-3">
              Panel de Administración — UTEC
            </h1>
            <p className="text-gray-600 text-lg">
              Hola, <b>{admin?.nombre}</b> • Administración de reportes del tenant{" "}
              <span className="font-semibold">utec</span> en tiempo real
            </p>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 font-semibold px-4 py-2 whitespace-nowrap"
          >
            Cerrar Sesión
          </button>
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
