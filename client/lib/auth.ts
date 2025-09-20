// Servicio de autenticación para el cliente
// Maneja registro, login, logout y gestión de tokens JWT

interface LoginCredentials { email: string; password: string; }
interface RegisterData { name: string; email: string; password: string; role?: 'admin' | 'user'; }
interface User { id: number; nombre?: string; name?: string; email: string; rol?: string; role?: string; createdAt?: string; }
interface AuthResponse { success: boolean; message: string; user?: User; token?: string; }

// Ajuste: asegurar puerto 4000 por defecto (coincide con backend)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class AuthService {
  private token: string | null = null;

  constructor() {
    // Recuperar token del localStorage al inicializar
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined' && (window as any).process?.versions?.electron ? { 'X-Client': 'electron' } : {}),
        },
        credentials: 'include', // Para incluir cookies de refresh token
        body: JSON.stringify({ nombre: userData.name, email: userData.email, password: userData.password, rol: userData.role }),
      });

      const raw = await response.json();
      const token = raw.token || raw.accessToken || raw.data?.accessToken;
      const user = raw.user || raw.data?.user;
      const rtoken = raw.refreshToken || raw.data?.refreshToken;

      if (raw.success && token) {
        this.setToken(token);
        if (user) this.setUser(user);
        if (rtoken) this.setRefreshToken(rtoken);
      }

      return { success: !!raw.success, message: raw.message || (raw.success ? 'Registro exitoso' : 'Error en registro'), user, token };
    } catch {
      return { success: false, message: 'Error de conexión al servidor' };
    }
  }

  /**
   * Iniciar sesión
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined' && (window as any).process?.versions?.electron ? { 'X-Client': 'electron' } : {}),
        },
        credentials: 'include', // Para incluir cookies de refresh token
        body: JSON.stringify(credentials),
      });

      const raw = await response.json();
      const token = raw.token || raw.accessToken || raw.data?.accessToken; // backend usa data.accessToken
      const user = raw.user || raw.data?.user;
      const rtoken = raw.refreshToken || raw.data?.refreshToken;

      if (raw.success && token) {
        this.setToken(token);
        if (user) this.setUser(user);
        if (rtoken) this.setRefreshToken(rtoken);
      }

      return { success: !!raw.success, message: raw.message || (raw.success ? 'Login exitoso' : 'Credenciales inválidas'), user, token };
    } catch {
      return { success: false, message: 'Error de conexión al servidor' };
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        credentials: 'include',
      });
    } catch { } finally {
      this.clearAuth();
    }
  }

  /**
   * Refrescar token usando refresh token
   */
  async refreshToken(): Promise<boolean> {
    try {
      // Si estamos en Electron o el navegador no guarda cookies, mandar el refresh token por header
      const rtoken = this.getRefreshToken();
      const isElectron = typeof window !== 'undefined' && (window as any).process?.versions?.electron;
      const headers: Record<string,string> = {};
      if (rtoken) {
        headers['Authorization'] = `Bearer ${rtoken}`;
      }
      if (isElectron) {
        headers['X-Client'] = 'electron';
      }
      const r = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      const raw = await r.json();
      const token = raw.token || raw.accessToken || raw.data?.accessToken;

      if (raw.success && token) {
        this.setToken(token);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.token && !this.isTokenExpired();
  }

  /**
   * Obtener datos del usuario actual
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
  }

  /**
   * Obtener token actual
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Verificar si el token ha expirado
   */
  private isTokenExpired(): boolean {
    if (!this.token) return true;

    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Si el token expira en menos de 5 minutos, considerarlo expirado
      return payload.exp < (currentTime + 300);
    } catch {
      return true;
    }
  }

  /**
   * Guardar token en localStorage y memoria
   */
  private setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') localStorage.setItem('authToken', token);
  }

  /**
   * Guardar datos del usuario
   */
  private setUser(user: User): void {
    if (typeof window !== 'undefined') localStorage.setItem('currentUser', JSON.stringify(user));
  }

  /**
   * Limpiar datos de autenticación
   */
  private clearAuth(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('refreshToken');
    }
  }

  /** Persistencia de refresh token para clientes sin cookies */
  private setRefreshToken(token: string) {
    if (typeof window !== 'undefined') localStorage.setItem('refreshToken', token);
  }
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  /**
   * Realizar petición autenticada a la API
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let token = this.getToken();
    // Intentar refrescar si no hay token o está por expirar
    if (!token || this.isTokenExpired()) {
      const refreshed = await this.refreshToken();
      token = this.getToken();
      if (!refreshed || !token) {
        // Si no se puede refrescar, limpiar y redirigir a login
        this.clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('No hay token de autenticación');
      }
    }

    const isElectron = typeof window !== 'undefined' && (window as any).process?.versions?.electron;
    const headers: Record<string,string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(isElectron ? { 'X-Client': 'electron' } : {}),
      ...(options.headers as any),
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Si el token ha expirado, intentar refrescarlo
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      
      if (refreshed) {
        // Reintentar la petición con el nuevo token
        const newHeaders = {
          ...headers,
          'Authorization': `Bearer ${this.getToken()}`,
        };
        
        return fetch(`${API_BASE_URL}${url}`, {
          ...options,
          headers: newHeaders,
          credentials: 'include',
        });
      } else {
        // Si no se puede refrescar, redirigir al login
        this.clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Sesión expirada');
      }
    }

    return response;
  }
}

// Instancia singleton del servicio de autenticación
export const authService = new AuthService();

// Tipos exportados para uso en componentes
export type { LoginCredentials, RegisterData, User, AuthResponse };
