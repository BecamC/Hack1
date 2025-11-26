import { useState } from "react"

interface LoginProps {
  onLoginSuccess: (admin: { email: string; nombre: string }) => void
  apiUrl: string
}

export default function Login({ onLoginSuccess, apiUrl }: LoginProps) {
  const [mode, setMode] = useState<"login" | "registro">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError("")
    setLoading(true)

    try {
      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      const resp = await fetch(`${apiUrl}/auth/login/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      let data = await resp.json()
      console.log("🔍 Respuesta original:", data)

      // Si el body viene como string, parsearlo
      if (typeof data.body === "string") {
        data = JSON.parse(data.body)
        console.log("🔍 Después de parsear body:", data)
      }

      if (!resp.ok) {
        throw new Error(data.error || "Error al iniciar sesión")
      }

      console.log("✅ Data final:", data)
      console.log("✅ Admin:", data.admin)
      console.log("✅ Token:", data.token)

      // Guardar en localStorage
      localStorage.setItem("admin", JSON.stringify(data.admin))
      localStorage.setItem("token", data.token)

      // Actualizar estado inmediatamente - esto debería disparar el re-render
      onLoginSuccess(data.admin)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const handleRegistro = async () => {
    setError("")
    setLoading(true)

    try {
      if (!email.endsWith("@utec.edu.pe")) {
        throw new Error("Solo se aceptan emails @utec.edu.pe")
      }

      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      const resp = await fetch(`${apiUrl}/auth/registro/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nombre })
      })

      let data = await resp.json()

      // Si el body viene como string, parsearlo
      if (typeof data.body === "string") {
        data = JSON.parse(data.body)
      }

      if (!resp.ok) {
        throw new Error(data.error || "Error al registrarse")
      }

      // Auto-login después de registro
      setEmail("")
      setPassword("")
      setNombre("")
      setMode("login")
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-lg p-8">
        <h1 className="text-3xl font-black text-black mb-2 text-center">
          Panel Admin UTEC
        </h1>
        <p className="text-gray-600 text-center mb-8">
          {mode === "login" ? "Inicia sesión como administrador" : "Regístrate como administrador"}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {mode === "registro" && (
            <input
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <input
            type="email"
            placeholder="Correo (@utec.edu.pe)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1 ml-1">Mínimo 6 caracteres</p>
          </div>

          <button
            onClick={mode === "login" ? handleLogin : handleRegistro}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Cargando..." : mode === "login" ? "Iniciar Sesión" : "Registrarse"}
          </button>
        </div>

        <p className="text-center text-gray-600 mt-6">
          {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "registro" : "login")
              setError("")
            }}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            {mode === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  )
}
