import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ScreenPermission {
  screenCode: string;
  moduleName: string;
  routeUrl: string;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  person: {
    personId: number;
    employeeCode: string;
    fullName: string;
    email: string;
    primaryPosition: string;
    primaryLocation: string;
    locationId: number;
  };
  screenPermissions: ScreenPermission[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<LoginResponse['person'] | null>(null);
  private _perms = signal<ScreenPermission[]>([]);

  readonly user = this._user.asReadonly();
  readonly permissions = this._perms.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    // Restore session from localStorage
    const stored = localStorage.getItem('efrm_auth');
    if (stored) {
      try {
        const parsed: LoginResponse = JSON.parse(stored);
        if (new Date(parsed.expiresAt) > new Date()) {
          this._user.set(parsed.person);
          this._perms.set(parsed.screenPermissions);
        } else {
          localStorage.removeItem('efrm_auth');
        }
      } catch { localStorage.removeItem('efrm_auth'); }
    }
  }

  login(username: string, password: string, mfaCode?: string) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password, mfaCode })
      .pipe(tap(res => {
        localStorage.setItem('efrm_auth', JSON.stringify(res));
        localStorage.setItem('efrm_token', res.accessToken);
        this._user.set(res.person);
        this._perms.set(res.screenPermissions);
      }));
  }

  logout() {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe();
    localStorage.removeItem('efrm_auth');
    localStorage.removeItem('efrm_token');
    this._user.set(null);
    this._perms.set([]);
    this.router.navigate(['/login']);
  }

  get token(): string | null { return localStorage.getItem('efrm_token'); }
  get isLoggedIn(): boolean { return !!this._user(); }

  hasPermission(screenCode: string, permCode: string): boolean {
    const screen = this._perms().find(p => p.screenCode === screenCode);
    return screen?.permissions.includes(permCode) ?? false;
  }

  hasScreen(screenCode: string): boolean {
    return this._perms().some(p => p.screenCode === screenCode);
  }

  get navItems() {
    return this._perms()
      .filter((p, i, arr) => arr.findIndex(x => x.moduleName === p.moduleName) === i)
      .map(p => ({ module: p.moduleName, screenCode: p.screenCode, route: p.routeUrl }));
  }
}
