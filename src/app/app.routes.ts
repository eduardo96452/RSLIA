import { Routes } from '@angular/router';
import { AuthLogInComponent } from './auth/auth-log-in/auth-log-in.component';
import { AuthSignUpComponent } from './auth/auth-sign-up/auth-sign-up.component';
import { InicioComponent } from './principal/inicio/inicio.component';
import { HomeRevisionComponent } from './seccion-principal/home-revision/home-revision.component';
import { PerfilComponent } from './seccion-principal/perfil/perfil.component';
import { DetalleRevisionComponent } from './seccion-principal/detalle-revision/detalle-revision.component';
import { PlanificacionComponent } from './seccion-principal/planificacion/planificacion.component';
import { DashboardComponent } from './seccion-principal/dashboard/dashboard.component';


export const routes: Routes = [
    { path: 'log-in', component: AuthLogInComponent },
    { path: 'sign-up', component: AuthSignUpComponent },
    { path: 'inicio', component: InicioComponent },
    { path: 'Descripción_General', component: HomeRevisionComponent },
    { path: 'detalle_revision', component: DetalleRevisionComponent },
    { path: 'planificacion', component: PlanificacionComponent },
    { path: 'panel_principal', component: DashboardComponent },
    { path: 'Perfil', component: PerfilComponent },
    { path: '', redirectTo: '/inicio', pathMatch: 'full' }, // Ruta por defecto (opcional)
    { path: '**', redirectTo: '/inicio' } // Ruta para páginas no encontradas (opcional)
  ];