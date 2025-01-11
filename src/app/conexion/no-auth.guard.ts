import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../auth/data-access/auth.service';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const session = await this.authService.getSession();

    // Si el usuario SÍ está logueado, redirige a panel_principal
    if (session?.user) {
      this.router.navigate(['/panel_principal']);
      return false;
    }

    // Si NO está logueado, puede acceder a la ruta (inicio, log-in, sign-up, etc.)
    return true;
  }
}