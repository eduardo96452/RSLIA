import { Routes } from '@angular/router';
import { AuthLogInComponent } from './auth/auth-log-in/auth-log-in.component';
import { AuthSignUpComponent } from './auth/auth-sign-up/auth-sign-up.component';
import { InicioComponent } from './principal/inicio/inicio.component';
import { HomeRevisionComponent } from './seccion-principal/home-revision/home-revision.component';
import { PerfilComponent } from './seccion-principal/perfil/perfil.component';
import { DetalleRevisionComponent } from './seccion-principal/detalle-revision/detalle-revision.component';
import { PlanificacionComponent } from './seccion-principal/planificacion/planificacion.component';
import { DashboardComponent } from './seccion-principal/dashboard/dashboard.component';
import { AcercadeComponent } from './principal/acercade/acercade.component';
import { ContactoComponent } from './principal/contacto/contacto.component';
import { NoAuthGuard } from './conexion/no-auth.guard';
import { AuthGuard } from './conexion/auth.guard';
import { CambiarpasswordComponent } from './seccion-principal/cambiarpassword/cambiarpassword.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { EstudiosComponent } from './seccion-segunda/estudios/estudios.component';
import { ExtraccionDatosComponent } from './seccion-tercera/extraccion-datos/extraccion-datos.component';
import { InformesComponent } from './seccion-cuarta/informes/informes.component';
import { PrismaComponent } from './seccion-quinta/prisma/prisma.component';


export const routes: Routes = [
  {
    path: 'log-in', component: AuthLogInComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'sign-up', component: AuthSignUpComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'forgot-password', component: ForgotPasswordComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'inicio', component: InicioComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'acerca-de', component: AcercadeComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'contacto', component: ContactoComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'Descripción_General', component: HomeRevisionComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'detalle_revision', component: DetalleRevisionComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'planificacion', component: PlanificacionComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'panel_principal', component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'Perfil', component: PerfilComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'estudios', component: EstudiosComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'extraccion_datos', component: ExtraccionDatosComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'informes', component: InformesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'prisma', component: PrismaComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'cambiarcontrasena', component: CambiarpasswordComponent,
    canActivate: [AuthGuard]
  },

  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'inicio',
    pathMatch: 'full'
  }
];