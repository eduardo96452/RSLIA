import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../auth/data-access/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const session = await this.authService.getSession();

    // Si el usuario NO está logueado, redirige a inicio
    if (!session?.user) {
      this.router.navigate(['/inicio']);
      return false;
    }

    // Si está logueado, puede acceder
    return true;
  }
}
